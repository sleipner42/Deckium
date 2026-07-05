import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import type { PresentationService } from '../../../presentation/service';
import type { ToolServices } from '../AITool';
import { BaseTool } from '../BaseTool';

export class RedoLastEditTool extends BaseTool {
    name = 'redoLastEdit';

    description =
        'Reapply the most recent edit you undid with undoLastEdit (within this turn). No effect if there is nothing to redo, or if you made a new edit after undoing (which discards the redo history).';

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
                error: 'Redo is unavailable in this context.',
            };
        }
        if (!history.redo()) {
            return {
                success: false,
                error: 'Nothing to redo.',
            };
        }
        return {
            success: true,
            data: {
                message: 'Reapplied the edit.',
                canUndo: history.canUndo(),
                canRedo: history.canRedo(),
            },
        };
    }
}
