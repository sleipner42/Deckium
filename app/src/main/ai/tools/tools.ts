import {
    AIToolCall,
    AIToolResult,
} from '../../../common/domain/entities/ai-types';
import AuthService from '../../auth/service';
import { PresentationService } from '../../presentation/service';
import { AITool } from './AITool';
import { ToolFactory } from './ToolFactory';

export class AIToolsService {
    private tools: AITool[];
    private lastParsingError: {
        error: string;
        rawMatch: string;
        fullResponse: string;
    } | null = null;

    constructor(authService?: AuthService) {
        this.tools = ToolFactory.getBuiltInTools(authService);
    }

    getLastParsingError(): {
        error: string;
        rawMatch: string;
        fullResponse: string;
    } | null {
        const error = this.lastParsingError;
        this.lastParsingError = null; // Clear after retrieving
        return error;
    }

    getTools(): AITool[] {
        return this.tools;
    }

    logToolExecution(
        toolName: string,
        params: Record<string, any>,
        result: AIToolResult,
    ): void {
        console.log(`Tool execution: ${toolName}`);
        console.log('Params:', JSON.stringify(params, null, 2));
        const log_res = JSON.stringify(result, null, 2);
        console.log(
            'Result:',
            log_res.length > 1000 ? `${log_res.slice(0, 1000)}...` : log_res,
        );
    }

    /**
     * Counts how many tool call patterns exist in the response
     */
    countToolCalls(response: string): number {
        // Use the most robust pattern to find all tool calls
        const pattern =
            /\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"params"\s*:\s*\{(?:[^{}]|{[^}]*})*\}\s*\}/gi;
        const matches = response.match(pattern);
        return matches ? matches.length : 0;
    }

    extractToolCall(response: string): AIToolCall | null {
        // Try multiple regex patterns to handle different JSON formatting styles
        const patterns = [
            // Standard format: {"tool": "name", "params": {...}}
            /\{\s*"tool":\s*"[^"]+",\s*"params":\s*\{[^}]*\}\s*\}/i,
            // Handle nested braces in params (more robust)
            /\{\s*"tool":\s*"[^"]+",\s*"params":\s*\{(?:[^{}]|{[^}]*})*\}\s*\}/i,
            // Handle potential whitespace variations
            /\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"params"\s*:\s*\{(?:[^{}]|{[^}]*})*\}\s*\}/i,
        ];

        let actionMatch: RegExpMatchArray | null = null;

        for (const pattern of patterns) {
            actionMatch = response.match(pattern);
            if (actionMatch) {
                break;
            }
        }

        if (!actionMatch) {
            // Check if there's a partial match that we can help diagnose
            const partialPatterns = [
                /\{\s*"tool":\s*"[^"]+"/i, // Has tool but incomplete
                /\{\s*"tool":\s*"[^"]+",\s*"params":/i, // Has tool and params start
                /\{\s*"tool"[^}]*\}/i, // Has tool field in braces
            ];

            for (const pattern of partialPatterns) {
                const partialMatch = response.match(pattern);
                if (partialMatch) {
                    console.log(
                        'Partial tool call pattern found:',
                        partialMatch[0],
                    );
                    (this as any).lastParsingError = {
                        error: 'Incomplete tool call format detected',
                        rawMatch: partialMatch[0],
                        fullResponse: response,
                    };
                    return null;
                }
            }

            console.log('No action match found');
            return null;
        }

        try {
            const toolCallData = JSON.parse(actionMatch[0]);

            if (!toolCallData.tool || !toolCallData.params) {
                console.warn(
                    'Extracted tool call data is missing required fields',
                    toolCallData,
                );
                return null;
            }

            const tool = this.tools.find((t) => t.name === toolCallData.tool);

            if (!tool) {
                console.warn(`Tool with name ${toolCallData.tool} not found`);
                return null;
            }

            return {
                toolId: tool.id,
                toolName: tool.name,
                params: toolCallData.params,
            };
        } catch (error) {
            console.error('Error parsing tool call data:', error);
            console.error('Raw matched text:', actionMatch[0]);
            console.error('Full response context:', response);
            // Store the parsing error for the AI loop to handle
            (this as any).lastParsingError = {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown parsing error',
                rawMatch: actionMatch[0],
                fullResponse: response,
            };
            return null;
        }
    }

    getLastParsingError(): {
        error: string;
        rawMatch: string;
        fullResponse: string;
    } | null {
        const error = (this as any).lastParsingError || null;
        // Clear the error after retrieving it
        (this as any).lastParsingError = null;
        return error;
    }

    async executeToolCalls(
        toolCalls: AIToolCall[],
        presentationService: PresentationService,
    ): Promise<
        Array<{ toolName: string; result: any; editedSlidesIds: string[] }>
    > {
        const results = [];

        for (const call of toolCalls) {
            const tool = this.tools.find((t) => t.name === call.toolName);

            if (tool) {
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
                    console.error(`Error executing tool ${tool.name}:`, error);
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
            } else {
                results.push({
                    toolName: 'unknown',
                    result: {
                        success: false,
                        error: `Tool with ID ${call.toolId} not found`,
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
                .map(({ toolName, result }) => {
                    if (result.success) {
                        return `${toolName}: Success - ${JSON.stringify(result.data)}`;
                    }
                    return `${toolName}: Failed - ${result.error}`;
                })
                .join('\n');

            contentArray.push({
                type: 'text',
                text: textContent,
            });

            results.forEach(({ result }) => {
                if (result.success && result.screenshot) {
                    contentArray.push({
                        type: 'image_url',
                        image_url: {
                            url: result.screenshot,
                        },
                    });
                }
            });

            return contentArray;
        }

        return results
            .map(({ toolName, result }) => {
                if (result.success) {
                    return `${toolName}: Success - ${JSON.stringify(result.data)}`;
                }
                return `${toolName}: Failed - ${result.error}`;
            })
            .join('\n');
    }
}
