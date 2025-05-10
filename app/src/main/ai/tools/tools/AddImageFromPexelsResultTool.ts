import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';
import { ElementValidator } from '../../../presentation/element-validator';

export class AddImageFromPexelsResultTool extends BaseTool {
  name = 'addImageFromPexelsResult';

  description = 'Add an image from Pexels search results to a slide';

  requiredParams = {
    slideId: 'The ID of the slide to add the image to',
    imageId: 'The Pexels image ID from search results',
    imageUrl: 'The URL of the image to add (from urls property in search results)',
  };

  optionalParams = {
    x: 'X position of the image (optional, defaults to center)',
    y: 'Y position of the image (optional, defaults to center)',
    width: 'The width of the image (optional, defaults to 400)',
    height: 'The height of the image (optional, defaults to 300)',
    zIndex: 'The z-index of the image (optional, defaults to 1)',
    photographer: 'The photographer name (for attribution)',
    photographerUrl: 'The photographer URL (for attribution)',
    description: 'Description or alt text for the image',
    sourceUrl: 'The original Pexels source URL',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    try {
      const {
        slideId,
        imageId,
        imageUrl,
        x,
        y,
        width: providedWidth,
        height: providedHeight,
        zIndex,
        photographer,
        photographerUrl,
        description,
        sourceUrl,
      } = params;

      // Validate required parameters
      if (!slideId) {
        return {
          success: false,
          error: 'slideId is required',
        };
      }

      if (!imageId) {
        return {
          success: false,
          error: 'imageId is required',
        };
      }

      if (!imageUrl) {
        return {
          success: false,
          error: 'imageUrl is required',
        };
      }

      // Get the slide to add the image to
      const presentation = presentationService.getPresentation();
      const slide = presentation.slides.find((s) => s.id === slideId);

      if (!slide) {
        return {
          success: false,
          error: `Slide with ID ${slideId} not found`,
        };
      }

      // Set default width and height
      const width = Number(providedWidth) || 400;
      const height = Number(providedHeight) || 300;

      // Default to center of slide if no position provided
      const xPos = x !== undefined ? Number(x) : 1280 / 2 - width / 2;
      const yPos = y !== undefined ? Number(y) : 720 / 2 - height / 2;

      // Check for potential overlaps
      const elementPosition = { x: xPos, y: yPos };
      const elementSize = { width, height };
      const overlapCheck = ElementValidator.checkOverlap(
        slide,
        elementPosition,
        elementSize,
      );

      // Create the image element
      const element = ElementFactory.createImage({
        content: imageUrl,
        position: elementPosition,
        size: elementSize,
        zIndex: zIndex !== undefined ? Number(zIndex) : 1,
      });

      // Add the element to the slide
      const updatedSlide = presentationService.addElement(slideId, element);

      if (!updatedSlide) {
        return {
          success: false,
          error: `Failed to add image to slide with ID ${slideId}`,
        };
      }

      // Create response message with attribution
      let message = `Image added successfully to slide.

Image details:
- ID: ${imageId}
- Position: (${xPos}, ${yPos})
- Size: ${width} x ${height}`;

      // Add attribution if provided
      if (photographer) {
        message += `\n- Photographer: ${photographer}`;
        if (photographerUrl) {
          message += ` (${photographerUrl})`;
        }
      }

      if (description) {
        message += `\n- Description: ${description}`;
      }

      if (sourceUrl) {
        message += `\n- Source URL: ${sourceUrl}`;
      }

      // Add warnings about positioning if needed
      if (overlapCheck.isOutsideSlide) {
        message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). `;

        if (overlapCheck.suggestedPosition) {
          message += `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to ensure visibility.`;
        }
      }

      if (overlapCheck.hasOverlap) {
        message += `\n\nWARNING: OVERLAP DETECTED. This image overlaps with other elements: ${overlapCheck.overlappingElements.join(
          ', ',
        )}. `;

        if (overlapCheck.suggestedPosition) {
          message += `To avoid overlap, consider using position (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) or increase the z-index of this element to make it appear on top.`;
        } else {
          message += `Please check the image placement to ensure all elements are visible. You can also use the changeElementZIndex tool to adjust which elements appear on top of others.`;
        }
      }

      return {
        success: true,
        data: {
          elementId: element.id,
          slideId: updatedSlide.id,
          imageId,
          imageUrl,
          position: elementPosition,
          size: elementSize,
          message,
        },
      };
    } catch (error) {
      console.error('Error adding image from Pexels results:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? `Error adding image: ${error.message}`
            : 'Unknown error occurred while adding image',
      };
    }
  }
}