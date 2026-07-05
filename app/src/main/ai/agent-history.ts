import type { Presentation } from '../../common/domain/entities/types';

/**
 * A single AI turn's fine-grained snapshot history, isolated from the user's
 * undo/redo stacks.
 *
 * The whole turn is wrapped in one presentation transaction, so it collapses to
 * a single user-facing undo step regardless of how many edits it made. Within
 * the turn, though, this lets the agent step back and forth through its OWN
 * edits (for self-correction) via the undoLastEdit / redoLastEdit tools.
 *
 * States are captured by reference identity: the presentation state uses immer
 * (a mutation yields a new frozen object, a no-op keeps the same reference), so
 * `record` after every tool result is free for non-editing tools and only grows
 * the history when an edit actually happened.
 *
 * `states[0]` is the pre-turn state — the floor the agent cannot undo past, so
 * it can never revert into the user's prior history.
 */
export class AgentHistory {
    private states: Presentation[] = [];
    private pointer = -1;

    constructor(
        private readonly restore: (presentation: Presentation) => void,
    ) {}

    /** Record the current state as a new history entry if it changed. */
    record(presentation: Presentation): void {
        if (this.pointer >= 0 && this.states[this.pointer] === presentation) {
            return;
        }
        // A new edit after undo(s) discards the now-orphaned redo tail.
        this.states.splice(this.pointer + 1);
        this.states.push(presentation);
        this.pointer = this.states.length - 1;
    }

    canUndo(): boolean {
        return this.pointer > 0;
    }

    canRedo(): boolean {
        return this.pointer < this.states.length - 1;
    }

    /** Step back one edit within the turn. Returns false at the turn's start. */
    undo(): boolean {
        if (!this.canUndo()) return false;
        this.pointer -= 1;
        this.restore(this.states[this.pointer]);
        return true;
    }

    /** Step forward one previously-undone edit. */
    redo(): boolean {
        if (!this.canRedo()) return false;
        this.pointer += 1;
        this.restore(this.states[this.pointer]);
        return true;
    }
}
