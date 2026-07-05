/**
 * @jest-environment node
 */
import type { Presentation } from '../../common/domain/entities/types';
import { AgentHistory } from './agent-history';
import { RedoLastEditTool } from './tools/tools/RedoLastEditTool';
import { UndoLastEditTool } from './tools/tools/UndoLastEditTool';

// Distinct object identities stand in for successive presentation states —
// AgentHistory captures by reference identity (immer gives a new object per
// edit, the same object for a no-op).
const state = (label: string) => ({ id: label }) as unknown as Presentation;

describe('AgentHistory', () => {
    it('records new states but ignores no-op captures (same identity)', () => {
        const restore = jest.fn();
        const h = new AgentHistory(restore);
        const p0 = state('p0');
        const p1 = state('p1');

        h.record(p0);
        h.record(p0); // no change — ignored
        h.record(p1);

        expect(h.canUndo()).toBe(true);
        expect(h.canRedo()).toBe(false);
    });

    it('cannot undo past the seeded floor (turn start)', () => {
        const restore = jest.fn();
        const h = new AgentHistory(restore);
        h.record(state('p0')); // floor only

        expect(h.canUndo()).toBe(false);
        expect(h.undo()).toBe(false);
        expect(restore).not.toHaveBeenCalled();
    });

    it('steps back and forward through edits, restoring each state', () => {
        const restore = jest.fn();
        const h = new AgentHistory(restore);
        const p0 = state('p0');
        const p1 = state('p1');
        const p2 = state('p2');
        h.record(p0);
        h.record(p1);
        h.record(p2);

        expect(h.undo()).toBe(true);
        expect(restore).toHaveBeenLastCalledWith(p1);
        expect(h.undo()).toBe(true);
        expect(restore).toHaveBeenLastCalledWith(p0);
        expect(h.undo()).toBe(false); // at floor

        expect(h.redo()).toBe(true);
        expect(restore).toHaveBeenLastCalledWith(p1);
        expect(h.redo()).toBe(true);
        expect(restore).toHaveBeenLastCalledWith(p2);
        expect(h.redo()).toBe(false); // at tip
    });

    it('discards the redo tail when a new edit follows an undo', () => {
        const restore = jest.fn();
        const h = new AgentHistory(restore);
        const p0 = state('p0');
        const p1 = state('p1');
        const p2 = state('p2');
        const p3 = state('p3');
        h.record(p0);
        h.record(p1);
        h.record(p2);

        h.undo(); // back to p1
        h.record(p3); // new branch — p2 is now unreachable

        expect(h.canRedo()).toBe(false);
        expect(h.undo()).toBe(true);
        expect(restore).toHaveBeenLastCalledWith(p1);
    });
});

describe('UndoLastEditTool / RedoLastEditTool', () => {
    const svc = {} as never;

    it('undo reverts within the turn and reports capabilities', async () => {
        const h = new AgentHistory(jest.fn());
        h.record(state('p0'));
        h.record(state('p1'));

        const result = await new UndoLastEditTool().execute({}, svc, {
            agentHistory: h,
        });
        expect(result.success).toBe(true);
        expect(result.data?.canRedo).toBe(true);
    });

    it('undo at the floor fails with a clear message', async () => {
        const h = new AgentHistory(jest.fn());
        h.record(state('p0'));

        const result = await new UndoLastEditTool().execute({}, svc, {
            agentHistory: h,
        });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/nothing to undo/i);
    });

    it('redo reapplies a previously undone edit', async () => {
        const h = new AgentHistory(jest.fn());
        h.record(state('p0'));
        h.record(state('p1'));
        h.undo();

        const result = await new RedoLastEditTool().execute({}, svc, {
            agentHistory: h,
        });
        expect(result.success).toBe(true);
    });

    it('fails cleanly when no history is wired in', async () => {
        const undo = await new UndoLastEditTool().execute({}, svc, {});
        expect(undo.success).toBe(false);
        expect(undo.error).toMatch(/unavailable/i);
    });
});
