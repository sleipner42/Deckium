import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class AddImageFromUrlTool extends BaseTool {
    name = 'addImageFromUrl';

    description =
        'Add an image from a URL to a presentation slide. Use this after finding suitable image URLs from the searchPexelsImages tool or any other source.';

    requiredParams = {
        slideId:
            'The unique identifier of the slide where the image should be added',
        imageUrl: 'The URL of the image to add to the slide',
        x: 'The horizontal position (in pixels) where the image should be placed on the slide',
        y: 'The vertical position (in pixels) where the image should be placed on the slide',
    };

    optionalParams = {
        width: 'The desired width of the image in pixels. If specified, height will be calculated automatically based on the image aspect ratio. Do not specify both width and height. Defaults to 400 if neither is specified.',
        height: 'The desired height of the image in pixels. If specified, width will be calculated automatically based on the image aspect ratio. Do not specify both width and height.',
        zIndex: 'The stacking order of the image relative to other elements (higher numbers appear on top). Defaults to 1.',
        title: 'Optional title/description for the image element',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        try {
            const {
                slideId,
                imageUrl,
                x,
                y,
                width: providedWidth,
                height: providedHeight,
                zIndex = 1,
                title,
            } = params;

            // Validate required parameters
            if (!slideId) {
                return {
                    success: false,
                    error: 'slideId is required',
                };
            }

            if (!imageUrl) {
                return {
                    success: false,
                    error: 'imageUrl is required',
                };
            }

            if (x === undefined || y === undefined) {
                return {
                    success: false,
                    error: 'Both x and y position coordinates are required',
                };
            }

            // Validate URL format
            try {
                new URL(imageUrl);
            } catch {
                return {
                    success: false,
                    error: 'Invalid image URL format',
                };
            }

            // Validate position parameters
            const xPos = Number(x);
            const yPos = Number(y);

            if (isNaN(xPos) || isNaN(yPos)) {
                return {
                    success: false,
                    error: 'Position coordinates must be valid numbers',
                };
            }

            // Validate dimension parameters
            const hasWidth =
                providedWidth !== undefined && !isNaN(Number(providedWidth));
            const hasHeight =
                providedHeight !== undefined && !isNaN(Number(providedHeight));

            let dimensionWarning = '';
            if (hasWidth && hasHeight) {
                dimensionWarning =
                    'Warning: Both width and height were specified. Using width and calculating height based on image aspect ratio.';
            }

            // Check if slide exists
            const presentation = presentationService.getPresentation();
            const slide = presentation.slides.find((s) => s.id === slideId);

            if (!slide) {
                return {
                    success: false,
                    error: `Slide with ID ${slideId} not found`,
                };
            }

            // Try to get image dimensions to calculate aspect ratio
            let width: number;
            let height: number;
            let aspectRatio = 1; // Default to square if we can't determine

            try {
                // Try to load the image to get its natural dimensions
                const imageInfo = await this.getImageInfo(imageUrl);
                aspectRatio = imageInfo.width / imageInfo.height;
            } catch (error) {
                console.warn(
                    'Could not load image to determine dimensions, using default aspect ratio:',
                    error,
                );
            }

            // Calculate dimensions
            if (hasWidth) {
                width = Number(providedWidth);
                height = Math.round(width / aspectRatio);
            } else if (hasHeight) {
                height = Number(providedHeight);
                width = Math.round(height * aspectRatio);
            } else {
                // No dimensions provided, use default size maintaining aspect ratio
                const defaultWidth = 400;
                width = defaultWidth;
                height = Math.round(defaultWidth / aspectRatio);
            }

            const elementPosition = { x: xPos, y: yPos };
            const elementSize = { width, height };

            const element = createImage({
                content: imageUrl,
                position: elementPosition,
                size: elementSize,
                zIndex: Number(zIndex),
                ...(title && { title }),
            });

            const updatedSlide = presentationService.addElement(
                slideId,
                element,
            );

            if (!updatedSlide) {
                return {
                    success: false,
                    error: `Failed to add image to slide with ID ${slideId}`,
                };
            }

            const message = `Image added successfully to slide.${dimensionWarning ? `\n${dimensionWarning}` : ''}\n
Image details:
- URL: ${imageUrl}
- Position: (${xPos}, ${yPos})
- Size: ${width} x ${height} (aspect ratio: ${aspectRatio.toFixed(2)})
- Z-index: ${zIndex}${title ? `\n- Title: ${title}` : ''}`;

            return {
                success: true,
                data: {
                    elementId: element.id,
                    slideId: updatedSlide.id,
                    imageUrl,
                    position: elementPosition,
                    size: elementSize,
                    aspectRatio,
                    message,
                },
                editedSlidesIds: [updatedSlide.id],
            };
        } catch (error) {
            console.error('Error adding image from URL:', error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? `Error adding image: ${error.message}`
                        : 'Unknown error occurred while adding image',
            };
        }
    }

    private async getImageInfo(
        url: string,
    ): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }
}
