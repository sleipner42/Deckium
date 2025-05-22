import { v4 as uuidv4 } from 'uuid';
import {
  AIToolResult,
  AIToolCall,
} from '../../../common/domain/entities/ai-types';
import {
  TextBox,
  Shape,
  Image,
  Plot,
  BarChart,
} from '../../../common/domain/entities/types';
import { ElementFactory } from '../../../common/domain/entities/element-factory';
import { PresentationService } from '../../presentation/service';
import { getScreenshotFromSecondaryWindow } from '../../main';
import { AITool } from './AITool';
import { ToolFactory } from './ToolFactory';

export class ToolsService {
  static logToolExecution(
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

  static getBuiltInTools(): AITool[] {
    return ToolFactory.getBuiltInTools();
  }

  static async executeToolCalls(
    toolCalls: AIToolCall[],
    availableTools: AITool[],
    presentationService: PresentationService,
  ): Promise<Array<{ toolName: string; result: any }>> {
    const results = [];

    for (const call of toolCalls) {
      const tool = availableTools.find((t) => t.name === call.toolName);

      if (tool) {
        try {
          const result = await tool.execute(call.params, presentationService);
          results.push({
            toolName: tool.name,
            result,
          });
        } catch (error) {
          console.error(`Error executing tool ${tool.name}:`, error);
          results.push({
            toolName: tool.name,
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      } else {
        results.push({
          toolName: 'unknown',
          result: {
            success: false,
            error: `Tool with ID ${call.toolId} not found`,
          },
        });
      }
    }

    return results;
  }
}
