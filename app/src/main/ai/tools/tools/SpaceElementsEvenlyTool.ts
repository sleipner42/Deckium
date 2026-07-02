import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementsNotFound, slideNotFound } from '../utils/errors';

export class SpaceElementsEvenlyTool extends BaseTool {
    name = 'spaceElementsEvenly';

    description =
        'Space multiple elements evenly on a slide with equal gaps between them';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide containing the elements'),
        elementIds: z
            .array(z.string())
            .min(3)
            .describe('Array of element IDs to space evenly (at least 3)'),
        direction: z
            .enum(['horizontal', 'vertical'])
            .describe('Direction to apply spacing: "horizontal" or "vertical"'),
        spacing: z
            .number()
            .min(0)
            .describe(
                'Fixed spacing between elements in pixels. If not provided, elements will be distributed evenly across the space between the first and last element',
            )
            .optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, elementIds, direction, spacing } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!elementIds || !Array.isArray(elementIds)) {
            return {
                success: false,
                error: 'elementIds is required',
            };
        }

        if (!direction || !['horizontal', 'vertical'].includes(direction)) {
            return {
                success: false,
                error: 'direction is required and must be either "horizontal" or "vertical"',
            };
        }

        const elementIdList: string[] = elementIds;

        if (elementIdList.length < 3) {
            return {
                success: false,
                error: 'At least three elements are required for even spacing',
            };
        }

        // Find the slide
        const currentPresentation = presentationService.getPresentation();
        const slide = currentPresentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        // Find all elements to space evenly
        const elementsToSpace = slide.elements.filter((element) =>
            elementIdList.includes(element.id),
        );

        if (elementsToSpace.length !== elementIdList.length) {
            const missingIds = elementIdList.filter(
                (id: string) => !slide.elements.some((el) => el.id === id),
            );
            return {
                success: false,
                error: elementsNotFound(missingIds, slide),
            };
        }

        const updates: Array<{ id: string; updates: any }> = [];
        const isHorizontal = direction === 'horizontal';

        // Sort elements by position
        const sortedElements = [...elementsToSpace].sort((a, b) => {
            if (isHorizontal) {
                return a.position.x - b.position.x;
            }
            return a.position.y - b.position.y;
        });

        // Keep first and last elements in their current positions
        const firstElement = sortedElements[0];
        const lastElement = sortedElements[sortedElements.length - 1];
        const middleElements = sortedElements.slice(1, -1);

        if (isHorizontal) {
            // Calculate the total available space between first and last elements
            const startX = firstElement.position.x + firstElement.size.width;
            const endX = lastElement.position.x;
            const totalAvailableSpace = endX - startX;

            // Calculate the total size of all middle elements
            const totalMiddleElementWidth = middleElements.reduce(
                (sum, el) => sum + el.size.width,
                0,
            );

            // Calculate the number of gaps (one less than the number of middle elements)
            const gapCount = Math.max(1, middleElements.length);

            // Calculate the size of each gap
            let gapSize: number;

            if (spacing !== undefined && !Number.isNaN(Number(spacing))) {
                // Use fixed spacing if provided
                gapSize = Number(spacing);
            } else {
                // Otherwise distribute evenly across available space
                gapSize =
                    (totalAvailableSpace - totalMiddleElementWidth) / gapCount;
            }

            if (gapSize < 0) {
                return {
                    success: false,
                    error: 'Not enough space to distribute elements without overlapping',
                };
            }

            // Position the middle elements with even spacing
            let nextX = startX + gapSize;

            middleElements.forEach((el) => {
                if (el.position.x !== nextX) {
                    updates.push({
                        id: el.id,
                        updates: {
                            position: {
                                x: nextX,
                                y: el.position.y,
                            },
                        },
                    });
                }

                nextX += el.size.width + gapSize;
            });
        } else {
            // Calculate the total available space between first and last elements
            const startY = firstElement.position.y + firstElement.size.height;
            const endY = lastElement.position.y;
            const totalAvailableSpace = endY - startY;

            // Calculate the total size of all middle elements
            const totalMiddleElementHeight = middleElements.reduce(
                (sum, el) => sum + el.size.height,
                0,
            );

            // Calculate the number of gaps (one less than the number of middle elements)
            const gapCount = Math.max(1, middleElements.length);

            // Calculate the size of each gap
            let gapSize: number;

            if (spacing !== undefined && !Number.isNaN(Number(spacing))) {
                // Use fixed spacing if provided
                gapSize = Number(spacing);
            } else {
                // Otherwise distribute evenly across available space
                gapSize =
                    (totalAvailableSpace - totalMiddleElementHeight) / gapCount;
            }

            if (gapSize < 0) {
                return {
                    success: false,
                    error: 'Not enough space to distribute elements without overlapping',
                };
            }

            // Position the middle elements with even spacing
            let nextY = startY + gapSize;

            middleElements.forEach((el) => {
                if (el.position.y !== nextY) {
                    updates.push({
                        id: el.id,
                        updates: {
                            position: {
                                x: el.position.x,
                                y: nextY,
                            },
                        },
                    });
                }

                nextY += el.size.height + gapSize;
            });
        }

        if (updates.length === 0) {
            return {
                success: true,
                data: {
                    message: 'Elements are already spaced evenly',
                },
                editedSlidesIds: [slideId],
            };
        }

        // Apply all updates
        for (const update of updates) {
            presentationService.updateElement(update.id, update.updates);
        }

        return {
            success: true,
            data: {
                message: `Successfully spaced ${updates.length + 2} elements evenly in ${direction} direction`,
                updates,
            },
            editedSlidesIds: [slideId],
        };
    }
}
