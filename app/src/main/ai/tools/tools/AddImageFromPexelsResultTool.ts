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
    imageUrl:
      'The URL of the image to add (from urls property in search results)',
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

      // Check if element is outside slide boundaries
      const elementPosition = { x: xPos, y: yPos };
      const elementSize = { width, height };
      const isOutsideSlide =
        xPos < 0 || yPos < 0 || xPos + width > 1280 || yPos + height > 720;

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

      // Run DOM-based overlap detection after element creation for accuracy
      let overlapCheck = null;
      try {
        // Small delay to ensure DOM updates
        await new Promise((resolve) => setTimeout(resolve, 100));
        overlapCheck = await ElementValidator.checkElementOverlap(
          element.id,
          0,
        );
      } catch (error) {
        console.warn('Post-creation overlap detection failed:', error);
        // Create a fallback empty result
        overlapCheck = {
          hasOverlap: false,
          overlappingElements: [],
          isOutsideSlide: false,
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

      // Add DOM-based overlap and boundary feedback
      if (overlapCheck.isOutsideSlide) {
        message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). Consider adjusting the position to ensure visibility.`;
      }

      if (overlapCheck.hasOverlap) {
        message += `\n\nWARNING: OVERLAP DETECTED. This image visually overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;

        if (overlapCheck.suggestedPosition) {
          message += `Closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}).`;
        } else {
          message += `Please check the image placement to avoid visual conflicts.`;
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
