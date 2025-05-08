import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class CreateSlideTool extends BaseTool {
  name = 'createSlide';

  description = 'Create a new slide in the current presentation';

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const newSlide = presentationService.addSlide();

    return {
      success: true,
      data: {
        slideId: newSlide.id,
        message: `New slide created successfully`,
      },
    };
  }
}
