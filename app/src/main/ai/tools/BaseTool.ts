import { AIToolResult } from '../../../common/domain/entities/ai-types';
import { PresentationService } from '../../presentation/service';
import { AITool, type ToolServices } from './AITool';

export abstract class BaseTool extends AITool {
    async execute(
        params: Record<string, any>,
        presentationService: PresentationService,
        services?: ToolServices,
    ): Promise<AIToolResult> {
        try {
            const result = await this.executeImpl(
                params,
                presentationService,
                services,
            );
            this.logToolExecution(params, result);
            return result;
        } catch (error) {
            const errorResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            console.error(`Error executing ${this.name} tool:`, error);
            this.logToolExecution(params, errorResult);
            return errorResult;
        }
    }

    protected abstract executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
        services?: ToolServices,
    ): Promise<AIToolResult>;
}
