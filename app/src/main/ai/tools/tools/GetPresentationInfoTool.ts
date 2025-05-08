import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class GetPresentationInfoTool extends BaseTool {
  name = 'getPresentationInfo';

  description = 'Get information about the current presentation';

  requiredParams = {};

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const currentPresentation = presentationService.getPresentation();

    return {
      success: true,
      data: {
        presentation: {
          slideCount: currentPresentation.slides.length,
          slideIds: currentPresentation.slides.map((slide) => slide.id),
        },
      },
    };
  }
}
