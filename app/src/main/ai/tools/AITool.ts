import { v4 as uuidv4 } from 'uuid';
import { AIToolResult } from '../../../common/domain/entities/ai-types';
import { UUID } from '../../../common/domain/entities/types';
import { PresentationService } from '../../presentation/service';

export abstract class AITool {
  id: UUID;

  abstract name: string;

  abstract description: string;

  requiredParams: Record<string, string> = {};

  constructor() {
    this.id = uuidv4();
  }

  abstract execute(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult>;

  protected logToolExecution(
    params: Record<string, any>,
    result: AIToolResult,
  ): void {
    console.log(`Tool execution: ${this.name}`);
    console.log('Params:', JSON.stringify(params, null, 2));
    console.log('Result:', JSON.stringify(result, null, 2));
  }
}
