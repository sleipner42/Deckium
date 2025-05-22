import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class AlignToSlideTool extends BaseTool {
  name = 'alignToSlide';

  description = 'Align elements to the slide boundaries (center of slide, slide edges, etc.)';

  requiredParams = {
    slideId: 'The ID of the slide containing the elements',
    elementIds: 'Comma-separated list of element IDs to align to slide',
    alignType: 'Type of alignment: "center", "center-horizontal", "center-vertical", "top", "bottom", "left", "right"',
    margin: 'Optional margin from slide edges in pixels (defaults to 0)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const { slideId, elementIds, alignType, margin = 0 } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    if (!elementIds) {
      return {
        success: false,
        error: 'elementIds is required',
      };
    }

    if (!alignType) {
      return {
        success: false,
        error: 'alignType is required',
      };
    }

    const validAlignTypes = [
      'center',
      'center-horizontal', 
      'center-vertical',
      'top',
      'bottom',
      'left', 
      'right'
    ];

    if (!validAlignTypes.includes(alignType)) {
      return {
        success: false,
        error: `alignType must be one of: ${validAlignTypes.join(', ')}`,
      };
    }

    // Parse element IDs
    const elementIdList = elementIds
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);

    if (elementIdList.length === 0) {
      return {
        success: false,
        error: 'At least one element is required',
      };
    }

    // Find the slide
    const currentPresentation = presentationService.getPresentation();
    const slide = currentPresentation.slides.find((s) => s.id === slideId);

    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }

    // Find all elements to align
    const elementsToAlign = slide.elements.filter((element) =>
      elementIdList.includes(element.id),
    );

    if (elementsToAlign.length !== elementIdList.length) {
      const missingIds = elementIdList.filter(
        (id: string) => !slide.elements.some((el) => el.id === id),
      );
      return {
        success: false,
        error: `Some elements were not found: ${missingIds.join(', ')}`,
      };
    }

    const slideWidth = 1280;
    const slideHeight = 720;
    const marginValue = Number(margin);
    const updates: Array<{ id: string; updates: any }> = [];

    // Calculate alignment based on slide dimensions
    elementsToAlign.forEach((element) => {
      let newX = element.position.x;
      let newY = element.position.y;

      switch (alignType) {
        case 'center':
          newX = (slideWidth - element.size.width) / 2;
          newY = (slideHeight - element.size.height) / 2;
          break;
        case 'center-horizontal':
          newX = (slideWidth - element.size.width) / 2;
          break;
        case 'center-vertical':
          newY = (slideHeight - element.size.height) / 2;
          break;
        case 'top':
          newY = marginValue;
          break;
        case 'bottom':
          newY = slideHeight - element.size.height - marginValue;
          break;
        case 'left':
          newX = marginValue;
          break;
        case 'right':
          newX = slideWidth - element.size.width - marginValue;
          break;
      }

      // Only add update if position actually changes
      if (newX !== element.position.x || newY !== element.position.y) {
        updates.push({
          id: element.id,
          updates: {
            position: { x: newX, y: newY },
          },
        });
      }
    });

    if (updates.length === 0) {
      return {
        success: true,
        data: {
          message: 'Elements are already aligned to slide as requested',
        },
      };
    }

    // Apply all updates
    for (const update of updates) {
      presentationService.updateElement(update.id, update.updates);
    }

    return {
      success: true,
      data: {
        message: `Successfully aligned ${updates.length} elements to slide using "${alignType}" alignment`,
        updates,
      },
    };
  }
}