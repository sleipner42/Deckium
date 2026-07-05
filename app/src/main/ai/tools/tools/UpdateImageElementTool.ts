import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { Image } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    elementNotFoundInPresentation,
    wrongElementType,
} from '../utils/errors';
import { findElement } from '../utils/find-element';
import { borderRadiusSchema, shadowSchema } from '../utils/schemas';

export class UpdateImageElementTool extends BaseTool {
    name = 'updateImageElement';

    description =
        'Update an existing raster image element position, size, or z-index on a slide. When updating size, specify either width OR height and the other dimension will be calculated to maintain the current aspect ratio. To change the markup of an SVG image, use updateSVGImage instead.';

    inputSchema = z.object({
        elementId: z.string().describe('The ID of the image element to update'),
        x: z.number().describe('New X position in pixels').optional(),
        y: z.number().describe('New Y position in pixels').optional(),
        width: z
            .number()
            .describe(
                'New width in pixels. If specified, height will be calculated automatically to maintain current aspect ratio. If neither width nor height is specified, dimensions remain unchanged. Do not specify both width and height.',
            )
            .optional(),
        height: z
            .number()
            .describe(
                'New height in pixels. If specified, width will be calculated automatically to maintain current aspect ratio. If neither width nor height is specified, dimensions remain unchanged. Do not specify both width and height.',
            )
            .optional(),
        zIndex: z
            .number()
            .describe(
                'The new z-index value - controls stacking order with higher values appearing on top',
            )
            .optional(),
        imageUrl: z
            .string()
            .describe('Direct URL to replace the current image')
            .optional(),
        borderRadius: borderRadiusSchema.optional(),
        shadow: shadowSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        try {
            const {
                elementId,
                imageUrl,
                x,
                y,
                width: providedWidth,
                height: providedHeight,
                borderRadius,
                shadow,
                zIndex,
            } = params;

            // Validate dimension parameters
            const hasWidth =
                providedWidth !== undefined &&
                !Number.isNaN(Number(providedWidth));
            const hasHeight =
                providedHeight !== undefined &&
                !Number.isNaN(Number(providedHeight));

            let dimensionWarning = '';
            if (hasWidth && hasHeight) {
                dimensionWarning =
                    'Warning: Both width and height were specified. Using width and calculating height based on current aspect ratio.';
            }

            if (!elementId) {
                return {
                    success: false,
                    error: 'elementId is required',
                };
            }

            // Ensure at least one property is provided to update
            if (
                !imageUrl &&
                x === undefined &&
                y === undefined &&
                !hasWidth &&
                !hasHeight &&
                borderRadius === undefined &&
                shadow === undefined &&
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

            const found = findElement(currentPresentation, elementId);
            if (found && found.element.type === 'image') {
                targetElement = found.element as Image;
                slideId = found.slideId;
            }

            if (!targetElement || !slideId) {
                return {
                    success: false,
                    error: found
                        ? wrongElementType(found.element, 'image')
                        : elementNotFoundInPresentation(
                              elementId,
                              currentPresentation,
                          ),
                };
            }

            // Prepare updates
            const updates: Partial<Image> = {};

            // Update content (image URL) if imageUrl is provided
            if (imageUrl) {
                updates.content = imageUrl;
            }

            // Update position if provided
            if (x !== undefined || y !== undefined) {
                updates.position = {
                    x: x !== undefined ? Number(x) : targetElement.position.x,
                    y: y !== undefined ? Number(y) : targetElement.position.y,
                };
            }

            // Update size if width or height is provided, maintaining aspect ratio
            if (hasWidth || hasHeight) {
                const currentAspectRatio =
                    targetElement.size.width / targetElement.size.height;

                let newWidth: number;
                let newHeight: number;

                if (hasWidth) {
                    // Use provided width, calculate height from current aspect ratio
                    newWidth = Number(providedWidth);
                    newHeight = Math.round(newWidth / currentAspectRatio);
                } else {
                    // Use provided height, calculate width from current aspect ratio
                    newHeight = Number(providedHeight);
                    newWidth = Math.round(newHeight * currentAspectRatio);
                }

                updates.size = {
                    width: newWidth,
                    height: newHeight,
                };
            }
            // If neither width nor height is provided, dimensions remain unchanged

            if (borderRadius !== undefined) {
                updates.borderRadius = Number(borderRadius);
            }

            if (shadow !== undefined) {
                updates.shadow = shadow;
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

            const message = `Image element updated successfully.${dimensionWarning ? ` ${dimensionWarning}` : ''}`;

            let updateDetails = '\nUpdated properties:';
            if (updates.position) {
                updateDetails += `\n- Position: (${updates.position.x}, ${updates.position.y})`;
            }
            if (updates.size) {
                updateDetails += `\n- Size: ${updates.size.width} x ${updates.size.height} (aspect ratio: ${(updates.size.width / updates.size.height).toFixed(2)})`;
            }
            if (updates.zIndex !== undefined) {
                updateDetails += `\n- Z-index: ${updates.zIndex}`;
            }
            if (updates.content) {
                updateDetails += `\n- Image URL updated`;
            }

            return {
                success: true,
                data: {
                    elementId,
                    slideId: updatedSlide.id,
                    message: message + updateDetails,
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
