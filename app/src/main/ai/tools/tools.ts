import { AITool } from './AITool';
import { ToolFactory } from './ToolFactory';
import {
  AIToolCall,
  AIToolResult,
} from '../../../common/domain/entities/ai-types';
import { PresentationService } from '../../presentation/service';
import AuthService from '../../auth/service';

export class AIToolsService {
  private tools: AITool[];

  constructor(authService?: AuthService) {
    this.tools = ToolFactory.getBuiltInTools(authService);
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

  extractToolCall(response: string): AIToolCall | null {
    const actionMatch = response.match(
      /\{\s*"tool":\s*"[^"]+",\s*"params":\s*\{[^}]*\}\s*\}/i,
    );

    if (!actionMatch) {
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
      return null;
    }
  }

  async executeToolCalls(
    toolCalls: AIToolCall[],
    presentationService: PresentationService,
  ): Promise<Array<{ toolName: string; result: any, editedSlidesIds: string[] }>> {
    const results = [];

    for (const call of toolCalls) {
      const tool = this.tools.find((t) => t.name === call.toolName);

      if (tool) {
        try {
          const result = await tool.execute(call.params, presentationService);
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
              error: error instanceof Error ? error.message : 'Unknown error',
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

      results.forEach(({ toolName, result }) => {
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
