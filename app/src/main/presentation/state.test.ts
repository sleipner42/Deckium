/**
 * @jest-environment node
 */
import {
    ContentElement,
    Presentation,
    TextBox,
} from '../../common/domain/entities/types';
import { PresentationState } from './state';

function makeTextBox(id = crypto.randomUUID()): TextBox {
    return {
        id,
        type: 'textbox',
        position: { x: 10, y: 10 },
        size: { width: 100, height: 50 },
        content: 'hello',
    };
}

function makePresentation(): Presentation {
    return {
        id: 'singleton',
        title: 'Loaded Presentation',
        slides: [
            {
                id: crypto.randomUUID(),
                elements: [makeTextBox()],
                background: '#FFFFFF',
            },
        ],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
    };
}

describe('PresentationState history', () => {
    let state: PresentationState;

    beforeEach(() => {
        state = new PresentationState();
    });

    it('starts with no undo or redo available', () => {
        expect(state.canUndo()).toBe(false);
        expect(state.canRedo()).toBe(false);
        expect(state.undo()).toBeNull();
        expect(state.redo()).toBeNull();
    });

    it('records one undo step per standalone mutation', () => {
        const before = state.getPresentation();
        state.addSlide();
        state.addSlide();

        expect(state.getPresentation().slides).toHaveLength(3);
        expect(state.canUndo()).toBe(true);

        expect(state.undo()?.slides).toHaveLength(2);
        expect(state.undo()).toBe(before);
        expect(state.canUndo()).toBe(false);
    });

    it('batches all mutations in a transaction into one undo step', () => {
        const slideId = state.getPresentation().slides[0].id;
        const before = state.getPresentation();

        state.beginTransaction();
        state.addElement(slideId, makeTextBox());
        state.addElement(slideId, makeTextBox());
        state.addSlide();
        state.endTransaction();

        expect(state.undo()).toBe(before);
        expect(state.canUndo()).toBe(false);
    });

    it('treats nested transactions as a single undo step', () => {
        const slideId = state.getPresentation().slides[0].id;
        const before = state.getPresentation();

        state.beginTransaction();
        state.addElement(slideId, makeTextBox());
        state.beginTransaction();
        state.addSlide();
        state.endTransaction();
        state.addSlide();
        state.endTransaction();

        expect(state.undo()).toBe(before);
        expect(state.canUndo()).toBe(false);
    });

    it('records nothing for an empty transaction', () => {
        state.beginTransaction();
        state.endTransaction();

        expect(state.canUndo()).toBe(false);
    });

    it('records nothing when a mutation fails validation', () => {
        expect(state.updateElement('missing', { content: 'x' })).toBeNull();
        expect(state.deleteElement('missing')).toBeNull();
        expect(state.updateSlide('missing', {})).toBeNull();
        expect(state.addElement('missing', makeTextBox())).toBeNull();
        expect(state.reorderSlides(0, 5)).toBe(state.getPresentation());

        expect(state.canUndo()).toBe(false);

        state.beginTransaction();
        expect(state.updateElement('missing', { content: 'x' })).toBeNull();
        state.endTransaction();

        expect(state.canUndo()).toBe(false);
    });

    it('round-trips through undo and redo', () => {
        const element = makeTextBox();
        const slideId = state.getPresentation().slides[0].id;
        state.addElement(slideId, element);
        state.updateElement(element.id, { content: 'updated' });
        const after = state.getPresentation();

        state.undo();
        state.undo();
        expect(state.getPresentation().slides[0].elements).toHaveLength(0);
        expect(state.canRedo()).toBe(true);

        state.redo();
        state.redo();
        expect(state.getPresentation()).toBe(after);
        expect(state.canRedo()).toBe(false);
    });

    it('clears redo history when a new mutation follows an undo', () => {
        state.addSlide();
        state.addSlide();
        state.undo();
        expect(state.canRedo()).toBe(true);

        state.addSlide();
        expect(state.canRedo()).toBe(false);
    });

    it('caps the undo stack and evicts the oldest entries', () => {
        for (let i = 0; i < 160; i++) {
            state.updatePresentationMeta(`title ${i}`);
        }

        let undoCount = 0;
        while (state.undo()) undoCount++;

        expect(undoCount).toBe(150);
        // The oldest reachable state is not the original one — it was evicted.
        expect(state.getPresentation().title).toBe('title 9');
    });

    it('resets history and force-closes open transactions on load', () => {
        state.addSlide();
        state.beginTransaction();
        state.addSlide();

        state.loadPresentation(makePresentation());
        expect(state.canUndo()).toBe(false);
        expect(state.canRedo()).toBe(false);

        // The transaction opened before the load must not leak into new work:
        // these two mutations are separate undo steps again.
        state.addSlide();
        state.addSlide();
        state.undo();
        state.undo();
        expect(state.getPresentation().title).toBe('Loaded Presentation');
        expect(state.canUndo()).toBe(false);
    });

    it('defaults missing slide transitions on load', () => {
        const loaded = state.loadPresentation(makePresentation());
        expect(loaded.slides[0].transition).toBe('none');
    });

    it('resets history on initializePresentation', () => {
        state.addSlide();
        state.initializePresentation('Fresh');

        expect(state.canUndo()).toBe(false);
        expect(state.getPresentation().title).toBe('Fresh');
        expect(state.getPresentation().slides).toHaveLength(1);
    });

    it('keeps history intact when state objects are mutated in place', () => {
        const slideId = state.getPresentation().slides[0].id;
        const element = makeTextBox();
        state.addElement(slideId, element);

        const exposed = state.getPresentation();
        expect(() => {
            (exposed.slides[0].elements[0] as TextBox).content = 'hacked';
        }).toThrow(TypeError);

        state.undo();
        state.redo();
        const restored = state.getPresentation().slides[0]
            .elements[0] as TextBox;
        expect(restored.content).toBe('hello');
    });

    it('shares unchanged slides between history entries', () => {
        state.addSlide();
        const untouchedSlide = state.getPresentation().slides[0];
        state.addSlide();

        state.undo();
        expect(state.getPresentation().slides[0]).toBe(untouchedSlide);
    });

    it('yields one step even if an element is deleted mid-transaction', () => {
        const slideId = state.getPresentation().slides[0].id;
        const element = makeTextBox();
        state.addElement(slideId, element);
        const before = state.getPresentation();

        state.beginTransaction();
        state.updateElement(element.id, { position: { x: 50, y: 50 } });
        state.deleteElement(element.id);
        // The old skipHistory gesture logic lost the whole step here.
        expect(state.updateElement(element.id, { content: 'x' })).toBeNull();
        state.endTransaction();

        expect(state.undo()).toBe(before);
        // Exactly one step remains: the addElement before the transaction.
        state.undo();
        expect(state.getPresentation().slides[0].elements).toHaveLength(0);
        expect(state.canUndo()).toBe(false);
    });

    it('ignores an unbalanced end without touching other owners', () => {
        state.beginTransaction('gesture');
        state.endTransaction('never-began');
        state.addSlide();
        state.addSlide();
        state.endTransaction('gesture');

        // Both mutations happened inside 'gesture': exactly one step.
        state.undo();
        expect(state.getPresentation().slides).toHaveLength(1);
        expect(state.canUndo()).toBe(false);
    });

    it('force-closes all of an owner’s nested transactions', () => {
        state.beginTransaction('wc:1');
        state.beginTransaction('wc:1');
        state.addSlide();
        state.endAllTransactionsFor('wc:1');

        // Owner fully closed: the next mutation is its own step again.
        state.addSlide();
        state.undo();
        expect(state.getPresentation().slides).toHaveLength(2);
    });

    it('invalidates open owners on load so their stale end is a no-op', () => {
        state.beginTransaction('ai-turn');
        state.loadPresentation(makePresentation());

        // A new gesture starts after the load...
        state.beginTransaction('wc:1');
        state.addSlide();
        // ...and the AI turn's late end must not close it.
        state.endTransaction('ai-turn');
        state.addSlide();
        state.endTransaction('wc:1');

        // Both slides were added inside the still-open 'wc:1' transaction.
        state.undo();
        expect(state.getPresentation().slides).toHaveLength(1);
        expect(state.canUndo()).toBe(false);
    });

    it('coalesces overlapping transactions from different owners into one step', () => {
        const before = state.getPresentation();
        state.beginTransaction('ai-turn');
        state.addSlide();
        state.beginTransaction('wc:1');
        state.addSlide();
        state.endTransaction('wc:1');
        state.endTransaction('ai-turn');

        expect(state.undo()).toBe(before);
        expect(state.canUndo()).toBe(false);
    });

    it('starts a fresh step for edits made after an undo inside an open transaction', () => {
        state.beginTransaction();
        state.addSlide();
        state.undo();
        state.addSlide();
        state.endTransaction();

        expect(state.canUndo()).toBe(true);
        state.undo();
        expect(state.getPresentation().slides).toHaveLength(1);
    });

    it('notifies onHistoryChange on checkpoints, undo, redo, and resets', () => {
        const onHistoryChange = jest.fn();
        const observed = new PresentationState(onHistoryChange);

        observed.addSlide();
        expect(onHistoryChange).toHaveBeenCalledTimes(1);

        observed.undo();
        observed.redo();
        expect(onHistoryChange).toHaveBeenCalledTimes(3);

        observed.loadPresentation(makePresentation());
        expect(onHistoryChange).toHaveBeenCalledTimes(4);
    });

    it('deleteSlide keeps at least one slide and stays undoable', () => {
        const onlySlideId = state.getPresentation().slides[0].id;
        state.deleteSlide(onlySlideId);

        const slides = state.getPresentation().slides;
        expect(slides).toHaveLength(1);
        expect(slides[0].id).not.toBe(onlySlideId);

        state.undo();
        expect(state.getPresentation().slides[0].id).toBe(onlySlideId);
    });

    it('updateElement applies partial updates without touching siblings', () => {
        const slideId = state.getPresentation().slides[0].id;
        const a = makeTextBox();
        const b = makeTextBox();
        state.addElement(slideId, a);
        state.addElement(slideId, b);

        const untouched = state.getPresentation().slides[0]
            .elements[1] as ContentElement;
        state.updateElement(a.id, { position: { x: 99, y: 1 } });

        const slide = state.getPresentation().slides[0];
        expect(slide.elements[0].position).toEqual({ x: 99, y: 1 });
        expect((slide.elements[0] as TextBox).content).toBe('hello');
        expect(slide.elements[1]).toBe(untouched);
    });
});
