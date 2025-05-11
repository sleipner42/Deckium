import axios from 'axios';
import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';
import { ElementValidator } from '../../../presentation/element-validator';

export class AddImageFromPexelsTool extends BaseTool {
  name = 'addImageFromPexels';

  description = 'Search for an image on Pexels and add it directly to a slide';

  requiredParams = {
    slideId: 'The ID of the slide to add the image to',
    query: 'The search query for the image',
    x: 'X position of the image (optional, defaults to center)',
    y: 'Y position of the image (optional, defaults to center)',
    width: 'The width of the image (optional, defaults to 400)',
    height: 'The height of the image (optional, defaults to 300)',
    zIndex: 'The z-index of the image (optional, defaults to 1)',
  };

  optionalParams = {
    orientation: 'The orientation of the image (landscape, portrait, square)',
    size: 'The size of the image from Pexels (small, medium, large, original, defaults to large)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    try {
      const {
        slideId,
        query,
        orientation,
        size = 'large',
        x,
        y,
        width: providedWidth,
        height: providedHeight,
        zIndex,
      } = params;

      // Validate required parameters
      if (!slideId) {
        return {
          success: false,
          error: 'slideId is required',
        };
      }

      if (!query) {
        return {
          success: false,
          error: 'Image search query is required',
        };
      }

      // Validate size parameter
      const validSizes = ['small', 'medium', 'large', 'original'];
      if (!validSizes.includes(size)) {
        return {
          success: false,
          error: `Invalid size parameter. Must be one of: ${validSizes.join(', ')}`,
        };
      }

      // Validate orientation if provided
      if (orientation) {
        const validOrientations = ['landscape', 'portrait', 'square'];
        if (!validOrientations.includes(orientation)) {
          return {
            success: false,
            error: `Invalid orientation parameter. Must be one of: ${validOrientations.join(
              ', ',
            )}`,
          };
        }
      }

      // Get the API key from environment variables
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: 'Pexels API key not found in environment variables',
        };
      }

      // Make the API request to Pexels
      const response = await axios.get('https://api.pexels.com/v1/search', {
        headers: {
          Authorization: apiKey,
        },
        params: {
          query,
          orientation,
          per_page: 1, // We only need one image
          page: 1,
        },
      });

      // Check if we got any results
      if (
        !response.data ||
        !response.data.photos ||
        !response.data.photos.length
      ) {
        return {
          success: true,
          data: {
            message:
              'No images found for the given query. Try a different query.',
          },
        };
      }

      // Get the first photo from the results
      const photo = response.data.photos[0];
      const sizeMap: Record<string, string> = {
        small: 'small',
        medium: 'medium',
        large: 'large',
        original: 'original',
      };
      const imageUrl = photo.src[sizeMap[size]];

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

      // Create response message
      let message = `Image added successfully from Pexels.\n
Image details:
- Title: ${photo.alt || query}
- Photographer: ${photo.photographer}
- Source URL: ${photo.url}
- Position: (${xPos}, ${yPos})
- Size: ${width} x ${height}`;

      if (overlapCheck.isOutsideSlide) {
        message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). `;

        if (overlapCheck.suggestedPosition) {
          message += `Closes non overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}).`;
        }
      }

      if (overlapCheck.hasOverlap) {
        message += `\n\nWARNING: OVERLAP DETECTED. This image overlaps with other elements: ${overlapCheck.overlappingElements.join(
          ', ',
        )}. `;

        if (overlapCheck.suggestedPosition) {
          message += `Please check the image placement to ensure all elements are visible. The closes non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}). You can also decrease the z-index of this element to put it underneath of elements, but it is usually not a good idea to have text over images.`;
        } else {
          message += `Please check the image placement to ensure all elements are visible. You can also use the changeElementZIndex tool to adjust which elements appear on top of others.`;
        }
      }

      return {
        success: true,
        data: {
          elementId: element.id,
          slideId: updatedSlide.id,
          imageUrl,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          sourceUrl: photo.url,
          message,
        },
      };
    } catch (error) {
      console.error('Error adding image from Pexels:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? `Error adding image from Pexels: ${error.message}`
            : 'Unknown error occurred while adding image from Pexels',
      };
    }
  }
}
