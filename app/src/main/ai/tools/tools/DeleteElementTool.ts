import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class DeleteElementTool extends BaseTool {
  name = 'deleteElement';

  description = 'Delete an element from a slide';

  requiredParams = {
    elementId: 'The ID of the element to delete',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const { elementId } = params;

    if (!elementId) {
      return {
        success: false,
        error: 'elementId is required',
      };
    }

    // Find the element first to check if it exists and get its details
    let targetElement = null;
    let slideId = null;
    const currentPresentation = presentationService.getPresentation();

    for (const slide of currentPresentation.slides) {
      const element = slide.elements.find((e) => e.id === elementId);
      if (element) {
        targetElement = element;
        slideId = slide.id;
        break;
      }
    }

    if (!targetElement || !slideId) {
      return {
        success: false,
        error: `Element with ID ${elementId} not found`,
      };
    }

    // Delete the element
    const updatedSlide = presentationService.deleteElement(elementId);

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to delete element with ID ${elementId}`,
      };
    }

    return {
      success: true,
      data: {
        elementId,
        slideId: updatedSlide.id,
        elementType: targetElement.type,
        message: `${targetElement.type} element deleted successfully`,
      },
      editedSlidesIds: [slideId],
    };
  }
}
