import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { AIToolResult } from '../../../common/domain/entities/ai-types';
import { UUID } from '../../../common/domain/entities/types';
import type { PDFExportService } from '../../pdf-export/service';
import { PresentationService } from '../../presentation/service';
import type { LLMSettingsService } from '../../settings/llm-settings-service';
import { logger } from '../../utils/logger';
import type { AgentHistory } from '../agent-history';

// Extra main-process services a tool may need beyond the presentation.
// Optional so tools (and their tests) that only need the presentation keep
// their two-argument call shape.
export interface ToolServices {
    settings?: LLMSettingsService;
    pdfExport?: PDFExportService;
    // Per-turn snapshot history backing undoLastEdit / redoLastEdit.
    agentHistory?: AgentHistory;
}

export abstract class AITool {
    id: UUID;

    abstract name: string;

    abstract description: string;

    inputSchema: z.ZodType = z.object({});

    constructor() {
        this.id = uuidv4();
    }

    abstract execute(
        params: Record<string, any>,
        presentationService: PresentationService,
        services?: ToolServices,
    ): Promise<AIToolResult>;

    protected logToolExecution(
        params: Record<string, any>,
        result: AIToolResult,
    ): void {
        // Use the new logging system
        logger.logToolExecution(this.name, params, result);

        // Keep console logging for backwards compatibility (can be disabled via LOG_TO_CONSOLE=false)
        console.log(`Tool execution: ${this.name}`);
        console.log('Params:', JSON.stringify(params, null, 2));
        const log_res = JSON.stringify(result, null, 2);
        console.log(
            'Result:',
            log_res.length > 1000 ? `${log_res.slice(0, 1000)}...` : log_res,
        );
        console.log('\n');
    }
}
