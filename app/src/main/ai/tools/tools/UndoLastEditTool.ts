import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import type { PresentationService } from '../../../presentation/service';
import type { ToolServices } from '../AITool';
import { BaseTool } from '../BaseTool';

export class UndoLastEditTool extends BaseTool {
    name = 'undoLastEdit';

    description =
        "Undo your most recent edit to the presentation from THIS turn, reverting it to how it was before that edit. Use this to correct a change you just made. You can call it repeatedly to step further back, but only within the current turn — it cannot undo the user's own earlier changes. Use redoLastEdit to reapply.";

    inputSchema = z.object({});

    protected async executeImpl(
        _params: Record<string, any>,
        _presentationService: PresentationService,
        services?: ToolServices,
    ): Promise<AIToolResult> {
        const history = services?.agentHistory;
        if (!history) {
            return {
                success: false,
                error: 'Undo is unavailable in this context.',
            };
        }
        if (!history.undo()) {
            return {
                success: false,
                error: 'Nothing to undo — already at the start of this turn (your edits before this turn cannot be undone here).',
            };
        }
        return {
            success: true,
            data: {
                message: 'Reverted your last edit.',
                canUndo: history.canUndo(),
                canRedo: history.canRedo(),
            },
        };
    }
}
