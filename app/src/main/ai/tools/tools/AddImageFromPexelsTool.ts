import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';
import AuthService from '../../../auth/service';
import { ElementValidator } from '../../../presentation/element-validator';
import { PresentationService } from '../../../presentation/service';
import {
  PexelsBackendService,
  PexelsSearchRequest,
} from '../../external/pexels-backend-service';
import { BaseTool } from '../BaseTool';

export class AddImageFromPexelsTool extends BaseTool {
  name = 'searchAndAddImage';

  description =
    'Search for high-quality stock images using Pexels API and add the best matching image directly to a presentation slide. This tool handles the entire process from search to placement, automatically positioning the image and providing detailed feedback about placement and potential overlaps.';

  requiredParams = {
    slideId:
      'The unique identifier of the slide where the image should be added',
    query:
      'The search terms to find relevant images (e.g., "sunset beach", "business meeting", "mountain landscape")',
    x: 'The horizontal position (in pixels) where the image should be placed on the slide',
    y: 'The vertical position (in pixels) where the image should be placed on the slide',
    width: 'The desired width of the image in pixels',
    height: 'The desired height of the image in pixels',
    zIndex:
      'The stacking order of the image relative to other elements (higher numbers appear on top)',
  };

  optionalParams = {
    orientation:
      'Filter images by aspect ratio - "landscape" for wide images, "portrait" for tall images, "square" for equal dimensions. Leave empty to allow any orientation.',
    size: 'The resolution quality from Pexels API. Options: "small" (130px), "medium" (350px), "large" (940px), "original" (full resolution). Defaults to "large" for good quality without excessive file size.',
  };

  private pexelsService: PexelsBackendService;

  constructor(authService?: AuthService) {
    super();
    const auth = authService || new AuthService();
    this.pexelsService = new PexelsBackendService(auth);
  }

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

      const validSizes = ['small', 'medium', 'large', 'original'];
      if (!validSizes.includes(size)) {
        return {
          success: false,
          error: `Invalid size parameter. Must be one of: ${validSizes.join(', ')}`,
        };
      }

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

      const searchRequest: PexelsSearchRequest = {
        query,
        per_page: 1,
        page: 1,
        ...(orientation && { orientation }),
      };

      const data = await this.pexelsService.searchImages(searchRequest);

      if (!data.urls) {
        return {
          success: true,
          data: {
            message:
              'No images found for the given query. Try a different query.',
          },
        };
      }

      const sizeMap: Record<string, string> = {
        small: 'small',
        medium: 'medium',
        large: 'large',
        original: 'original',
      };
      const imageUrl = data.urls[sizeMap[size] as keyof typeof data.urls];

      const presentation = presentationService.getPresentation();
      const slide = presentation.slides.find((s) => s.id === slideId);

      if (!slide) {
        return {
          success: false,
          error: `Slide with ID ${slideId} not found`,
        };
      }

      const width = Number(providedWidth) || 400;
      const height = Number(providedHeight) || 300;

      const xPos = x !== undefined ? Number(x) : 1280 / 2 - width / 2;
      const yPos = y !== undefined ? Number(y) : 720 / 2 - height / 2;

      const elementPosition = { x: xPos, y: yPos };
      const elementSize = { width, height };
      const isOutsideSlide =
        xPos < 0 || yPos < 0 || xPos + width > 1280 || yPos + height > 720;

      const element = ElementFactory.createImage({
        content: imageUrl,
        position: elementPosition,
        size: elementSize,
        zIndex: zIndex !== undefined ? Number(zIndex) : 1,
      });

      const updatedSlide = presentationService.addElement(slideId, element);

      if (!updatedSlide) {
        return {
          success: false,
          error: `Failed to add image to slide with ID ${slideId}`,
        };
      }

      let overlapCheck = null;
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        overlapCheck = await ElementValidator.checkElementOverlap(
          element.id,
          0,
        );
      } catch (error) {
        console.warn('Post-creation overlap detection failed:', error);
        overlapCheck = {
          hasOverlap: false,
          overlappingElements: [],
          isOutsideSlide: false,
        };
      }

      let message = `Image added successfully from Pexels.\n
Image details:
- Title: ${data.description || query}
- Photographer: ${data.photographer}
- Source URL: ${data.source_url}
- Position: (${xPos}, ${yPos})
- Size: ${width} x ${height}`;

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
          imageUrl,
          photographer: data.photographer,
          photographerUrl: data.photographer_url,
          sourceUrl: data.source_url,
          message,
        },
        editedSlidesIds: [updatedSlide.id],
      };
    } catch (error) {
      console.error('Error adding image from backend:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? `Error adding image from backend: ${error.message}`
            : 'Unknown error occurred while adding image from backend',
      };
    }
  }
}
