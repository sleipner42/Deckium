import { PresentationService } from '../../presentation/service';
import { AITool } from './AITool';
import { ToolFactory } from './ToolFactory';

export class AIToolsService {
    private tools: AITool[];

    constructor() {
        this.tools = ToolFactory.getBuiltInTools();
    }

    getTools(): AITool[] {
        return this.tools;
    }

    async executeToolCalls(
        toolCalls: Array<{ toolName: string; params: Record<string, any> }>,
        presentationService: PresentationService,
    ): Promise<
        Array<{ toolName: string; result: any; editedSlidesIds: string[] }>
    > {
        const results = [];

        for (const call of toolCalls) {
            const tool = this.tools.find((t) => t.name === call.toolName);

            if (!tool) {
                results.push({
                    toolName: call.toolName,
                    result: {
                        success: false,
                        error: `Tool ${call.toolName} not found`,
                    },
                    editedSlidesIds: [],
                });
                continue;
            }

            try {
                const result = await tool.execute(
                    call.params,
                    presentationService,
                );
                results.push({
                    toolName: tool.name,
                    result,
                    editedSlidesIds: result.editedSlidesIds || [],
                });
            } catch (error) {
                results.push({
                    toolName: tool.name,
                    result: {
                        success: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    },
                    editedSlidesIds: [],
                });
            }
        }

        return results;
    }

    formatToolResults(
        results: Array<{ toolName: string; result: any }>,
    ): string | { type: string; text?: string; image_url?: { url: string } }[] {
        const hasScreenshot = results.some(
            ({ result }) => result.success && result.screenshot,
        );

        if (hasScreenshot) {
            const contentArray: {
                type: string;
                text?: string;
                image_url?: { url: string };
            }[] = [];

            const textContent = results
                .map(({ toolName, result }) =>
                    result.success
                        ? `${toolName}: Success - ${JSON.stringify(result.data)}`
                        : `${toolName}: Failed - ${result.error}`,
                )
                .join('\n');

            contentArray.push({ type: 'text', text: textContent });

            for (const { result } of results) {
                if (result.success && result.screenshot) {
                    contentArray.push({
                        type: 'image_url',
                        image_url: { url: result.screenshot },
                    });
                }
            }

            return contentArray;
        }

        return results
            .map(({ toolName, result }) =>
                result.success
                    ? `${toolName}: Success - ${JSON.stringify(result.data)}`
                    : `${toolName}: Failed - ${result.error}`,
            )
            .join('\n');
    }
}
