import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class CreateSlideTool extends BaseTool {
  name = 'createSlide';
  description = 'Create a new slide in the current presentation';
  requiredParams = {
    title: 'The title for the new slide (optional)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const title = params.title || 'New Slide';
    const newSlide = presentationService.addSlide(title);

    return {
      success: true,
      data: {
        slideId: newSlide.id,
        message: `New slide "${title}" created successfully`,
      },
    };
  }
} 