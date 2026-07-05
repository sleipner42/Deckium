import { freeze, produce } from 'immer';
import {
    ContentElement,
    Presentation,
    Slide,
} from '../../common/domain/entities/types';

export class PresentationState {
    // Always frozen (immer autofreeze); never stored in either stack.
    private presentation: Presentation;
    // Past states, oldest first. The current state lives in neither stack.
    private undoStack: Presentation[] = [];
    private redoStack: Presentation[] = [];
    private maxHistorySize: number = 150;
    // Open transactions by owner (e.g. 'main', 'webcontents:<id>'), each with
    // its own nesting depth. While ANY transaction is open, only the first
    // mutation checkpoints, so concurrent gestures coalesce into one undo
    // step — accepted tradeoff over per-owner undo granularity. Ownership
    // exists so one actor's unbalanced or orphaned begin/end (crashed
    // renderer, HTML5 drag swallowing mouseup) can be reset without
    // corrupting another actor's open transaction.
    private openTransactions: Map<string, number> = new Map();
    private txCheckpointed: boolean = false;
    private readonly onHistoryChange?: () => void;

    constructor(onHistoryChange?: () => void) {
        this.onHistoryChange = onHistoryChange;
        // No resetHistory here: stacks are already empty, and the callback
        // must not fire while the owning service is still constructing.
        this.presentation = this.createEmptyPresentation(
            'Untitled Presentation',
        );
    }

    private createEmptyPresentation(title: string): Presentation {
        return freeze(
            {
                id: 'singleton',
                title,
                slides: [this.createSlide()],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            true,
        );
    }

    private createSlide(): Slide {
        return {
            id: crypto.randomUUID(),
            elements: [],
            background: '#FFFFFF',
            transition: 'none',
        };
    }

    getPresentation(): Presentation {
        return this.presentation;
    }

    beginTransaction(owner = 'main'): void {
        this.openTransactions.set(
            owner,
            (this.openTransactions.get(owner) ?? 0) + 1,
        );
    }

    endTransaction(owner = 'main'): void {
        const depth = this.openTransactions.get(owner);
        if (depth === undefined) {
            // Stale end: this owner's transactions were already invalidated
            // (history reset, teardown cleanup) — must not touch other owners.
            return;
        }
        if (depth <= 1) {
            this.openTransactions.delete(owner);
        } else {
            this.openTransactions.set(owner, depth - 1);
        }
        if (this.openTransactions.size === 0) {
            this.txCheckpointed = false;
        }
    }

    /**
     * Force-close every transaction held by an owner, regardless of depth.
     * Used when the owner can no longer send a matching end (renderer
     * destroyed or navigated away, gesture swallowed by native drag).
     */
    endAllTransactionsFor(owner: string): void {
        if (!this.openTransactions.delete(owner)) return;
        if (this.openTransactions.size === 0) {
            this.txCheckpointed = false;
        }
    }

    /**
     * Push the current (pre-mutation) state onto the undo stack. Mutation
     * methods call this after validation, immediately before producing the
     * next state. Inside a transaction only the first mutation checkpoints.
     */
    private checkpoint(): void {
        if (this.openTransactions.size > 0) {
            if (this.txCheckpointed) return;
            this.txCheckpointed = true;
        }

        this.undoStack.push(this.presentation);
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        // Remove any forward history when making new changes
        this.redoStack = [];
        this.onHistoryChange?.();
    }

    private resetHistory(): void {
        this.undoStack = [];
        this.redoStack = [];
        // Invalidate all open transactions: their owners' later end calls
        // become no-ops instead of closing someone else's fresh transaction.
        this.openTransactions.clear();
        this.txCheckpointed = false;
        this.onHistoryChange?.();
    }

    initializePresentation(title = 'Untitled Presentation'): Presentation {
        this.presentation = this.createEmptyPresentation(title);
        this.resetHistory();
        return this.presentation;
    }

    /**
     * Load an existing presentation into the state
     * @param presentation The presentation to load
     * @returns The loaded presentation
     */
    loadPresentation(presentation: Presentation): Presentation {
        this.presentation = produce(presentation, (draft) => {
            draft.updatedAt = new Date(); // Update the timestamp when loading
            for (const slide of draft.slides) {
                slide.transition = slide.transition || 'none';
            }
        });

        // Reset history when loading a new presentation
        this.resetHistory();
        return this.presentation;
    }

    updatePresentationMeta(title: string): Presentation {
        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            draft.title = title;
            draft.updatedAt = new Date();
        });

        return this.presentation;
    }

    addSlide(): Slide {
        const newSlide = this.createSlide();

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            draft.slides.push(newSlide);
            draft.updatedAt = new Date();
        });

        return this.presentation.slides[this.presentation.slides.length - 1];
    }

    duplicateSlide(slideId: string): Slide | null {
        const slideIndex = this.findSlideIndex(slideId);
        if (slideIndex === -1) return null;

        const originalSlide = this.presentation.slides[slideIndex];

        // Create a new slide with new ID and duplicate all elements with new IDs
        const duplicatedSlide: Slide = {
            id: crypto.randomUUID(),
            background: originalSlide.background,
            transition: originalSlide.transition,
            elements: originalSlide.elements.map((element) => ({
                ...element,
                id: crypto.randomUUID(), // Generate new ID for each element
            })),
        };

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            // Insert the duplicated slide right after the original
            draft.slides.splice(slideIndex + 1, 0, duplicatedSlide);
            draft.updatedAt = new Date();
        });

        return this.presentation.slides[slideIndex + 1];
    }

    updateSlide(slideId: string, updates: Partial<Slide>): Slide | null {
        const slideIndex = this.findSlideIndex(slideId);
        if (slideIndex === -1) return null;

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            Object.assign(draft.slides[slideIndex], updates);
            draft.updatedAt = new Date();
        });

        return this.presentation.slides[slideIndex];
    }

    deleteSlide(slideId: string): string | null {
        const slideIndex = this.findSlideIndex(slideId);
        if (slideIndex === -1) return null;

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            draft.slides.splice(slideIndex, 1);
            if (draft.slides.length === 0) {
                draft.slides.push(this.createSlide());
            }
            draft.updatedAt = new Date();
        });

        return slideId;
    }

    reorderSlides(fromIndex: number, toIndex: number): Presentation {
        if (
            fromIndex < 0 ||
            fromIndex >= this.presentation.slides.length ||
            toIndex < 0 ||
            toIndex >= this.presentation.slides.length ||
            fromIndex === toIndex
        ) {
            return this.presentation;
        }

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            const [movedSlide] = draft.slides.splice(fromIndex, 1);
            draft.slides.splice(toIndex, 0, movedSlide);
            draft.updatedAt = new Date();
        });

        return this.presentation;
    }

    addElement(slideId: string, element: ContentElement): Slide | null {
        const slideIndex = this.findSlideIndex(slideId);
        if (slideIndex === -1) {
            return null;
        }

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            draft.slides[slideIndex].elements.push(element);
            draft.updatedAt = new Date();
        });

        return this.presentation.slides[slideIndex];
    }

    updateElement(
        elementId: string,
        updates: Partial<ContentElement>,
    ): Slide | null {
        const location = this.findElementLocation(elementId);
        if (!location) return null;

        const { slideIndex, elementIndex } = location;

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            const element = draft.slides[slideIndex].elements[elementIndex];
            Object.assign(element, updates);
            draft.updatedAt = new Date();
        });

        return this.presentation.slides[slideIndex];
    }

    deleteElement(elementId: string): Slide | null {
        const location = this.findElementLocation(elementId);
        if (!location) return null;

        const { slideIndex, elementIndex } = location;

        this.checkpoint();
        this.presentation = produce(this.presentation, (draft) => {
            draft.slides[slideIndex].elements.splice(elementIndex, 1);
            draft.updatedAt = new Date();
        });

        return this.presentation.slides[slideIndex];
    }

    private findSlideIndex(slideId: string): number {
        return this.presentation.slides.findIndex(
            (slide) => slide.id === slideId,
        );
    }

    private findElementLocation(
        elementId: string,
    ): { slideIndex: number; elementIndex: number } | null {
        for (let i = 0; i < this.presentation.slides.length; i++) {
            const elementIndex = this.presentation.slides[i].elements.findIndex(
                (e) => e.id === elementId,
            );
            if (elementIndex !== -1) {
                return { slideIndex: i, elementIndex };
            }
        }
        return null;
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    public undo(): Presentation | null {
        if (!this.canUndo()) return null;

        // Anything still pending in an open transaction becomes a new step.
        this.txCheckpointed = false;
        this.redoStack.push(this.presentation);
        this.presentation = this.undoStack.pop() as Presentation;
        this.onHistoryChange?.();

        return this.presentation;
    }

    public redo(): Presentation | null {
        if (!this.canRedo()) return null;

        this.txCheckpointed = false;
        this.undoStack.push(this.presentation);
        this.presentation = this.redoStack.pop() as Presentation;
        this.onHistoryChange?.();

        return this.presentation;
    }

    /**
     * Replace the current state without touching the undo/redo stacks or the
     * open-transaction bookkeeping. Used to move within a single AI turn's own
     * fine-grained snapshot history (see AgentHistory): the turn stays one user
     * undo step, but the agent can step back and forth through its own edits.
     * The snapshot must be a state this instance produced (already frozen).
     */
    public restoreState(presentation: Presentation): Presentation {
        this.presentation = freeze(presentation, true);
        return this.presentation;
    }
}
