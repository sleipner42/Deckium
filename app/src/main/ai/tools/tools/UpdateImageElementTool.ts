import axios from 'axios';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { Image } from '../../../../common/domain/entities/types';
import { ElementValidator } from '../../../presentation/element-validator';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class UpdateImageElementTool extends BaseTool {
  name = 'updateImageElement';

  description = 'Update an existing image element on a slide';

  requiredParams = {
    elementId: 'The ID of the image element to update',
    query: 'The new search query for a Pexels image (optional)',
    x: 'New X position (optional)',
    y: 'New Y position (optional)',
    width: 'New width (optional)',
    height: 'New height (optional)',
    zIndex:
      'The new z-index value (optional) - controls stacking order with higher values appearing on top',
  };

  optionalParams = {
    orientation: 'The orientation of the image (landscape, portrait, square)',
    size: 'The size of the image from Pexels (small, medium, large, original, defaults to large)',
    imageUrl: 'Direct URL to an image (alternative to query)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    try {
      const {
        elementId,
        query,
        imageUrl,
        orientation,
        size = 'large',
        x,
        y,
        width,
        height,
        zIndex,
      } = params;

      if (!elementId) {
        return {
          success: false,
          error: 'elementId is required',
        };
      }

      // Ensure at least one property is provided to update
      if (
        !query &&
        !imageUrl &&
        x === undefined &&
        y === undefined &&
        width === undefined &&
        height === undefined &&
        zIndex === undefined
      ) {
        return {
          success: false,
          error: 'At least one property to update must be provided',
        };
      }

      // Find the image element to update
      let targetElement: Image | null = null;
      let slideId: string | null = null;

      const currentPresentation = presentationService.getPresentation();

      for (const slide of currentPresentation.slides) {
        const element = slide.elements.find((e) => e.id === elementId) as Image;
        if (element && element.type === 'image') {
          targetElement = element;
          slideId = slide.id;
          break;
        }
      }

      if (!targetElement || !slideId) {
        return {
          success: false,
          error: `Image element with ID ${elementId} not found, or element is not an image`,
        };
      }

      // Prepare updates
      const updates: Partial<Image> = {};

      // Update content (image URL) if query or imageUrl is provided
      if (query) {
        // Validate size parameter if we're using Pexels
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
                'No images found for the given query. The image was not updated.',
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
        updates.content = photo.src[sizeMap[size]];
      } else if (imageUrl) {
        // Use the provided URL directly
        updates.content = imageUrl;
      }

      // Update position if provided
      if (x !== undefined || y !== undefined) {
        updates.position = {
          x: x !== undefined ? Number(x) : targetElement.position.x,
          y: y !== undefined ? Number(y) : targetElement.position.y,
        };
      }

      // Update size if provided
      if (width !== undefined || height !== undefined) {
        updates.size = {
          width: width !== undefined ? Number(width) : targetElement.size.width,
          height:
            height !== undefined ? Number(height) : targetElement.size.height,
        };
      }

      // Update z-index if provided
      if (zIndex !== undefined) {
        updates.zIndex = Number(zIndex);
      }

      // Update the element first
      const updatedSlide = presentationService.updateElement(
        elementId,
        updates,
      );

      if (!updatedSlide) {
        return {
          success: false,
          error: `Failed to update image element with ID ${elementId}`,
        };
      }

      // Run post-update overlap detection on the actual rendered element
      let overlapCheck = null;
      try {
        // Allow time for DOM to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        overlapCheck = await ElementValidator.checkElementOverlap(elementId, 0);
      } catch (error) {
        console.warn('Could not perform overlap detection:', error);
      }

      // Create response message
      let message = 'Image element updated successfully';
      let photoCredit = '';

      // Add photo credit information if we retrieved a new image
      if (query && updates.content) {
        const response = await axios.get('https://api.pexels.com/v1/search', {
          headers: {
            Authorization: process.env.PEXELS_API_KEY as string,
          },
          params: {
            query,
            orientation,
            per_page: 1,
          },
        });

        if (response.data?.photos?.length > 0) {
          const photo = response.data.photos[0];
          photoCredit = `\nImage details:\n- Title: ${photo.alt || query}\n- Photographer: ${photo.photographer}\n- Source URL: ${photo.url}`;
        }
      }

      // Add warnings about overlap or outside slide
      if (overlapCheck) {
        if (overlapCheck.isOutsideSlide) {
          message += `\n\nWARNING: This image is now positioned outside the slide boundaries (1280x720). `;

          if (overlapCheck.suggestedPosition) {
            message += `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to ensure visibility.`;
          }
        }

        if (overlapCheck.hasOverlap) {
          message += `\n\nWARNING: OVERLAP DETECTED. This image now overlaps with other elements: ${overlapCheck.overlappingElements.join(
            ', ',
          )}. `;

          if (overlapCheck.suggestedPosition) {
            message += `The closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}). Alternatively, you can increase the z-index of this element using the changeElementZIndex tool to make it appear on top.`;
          } else {
            message += `Please check the image placement. You can also use the changeElementZIndex tool to adjust which elements appear on top of others.`;
          }
        }
      }

      return {
        success: true,
        data: {
          elementId,
          slideId: updatedSlide.id,
          message: message + photoCredit,
          updates: Object.keys(updates),
        },
        editedSlidesIds: [slideId],
      };
    } catch (error) {
      console.error('Error updating image element:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? `Error updating image: ${error.message}`
            : 'Unknown error occurred while updating image',
      };
    }
  }
}
