import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementsNotFound, slideNotFound } from '../utils/errors';

export class AlignToSlideTool extends BaseTool {
    name = 'alignToSlide';

    description =
        'Align elements relative to the 1280x720 SLIDE itself (center of slide, slide edges, etc.). To align elements relative to each other, use alignElements instead.';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide containing the elements'),
        elementIds: z
            .array(z.string())
            .min(1)
            .describe('Array of element IDs to align to the slide'),
        alignType: z
            .enum([
                'center',
                'center-horizontal',
                'center-vertical',
                'top',
                'bottom',
                'left',
                'right',
            ])
            .describe(
                'Type of alignment, relative to the 1280x720 slide (e.g. "left" moves elements to the left edge of the slide): "center", "center-horizontal", "center-vertical", "top", "bottom", "left", "right"',
            ),
        margin: z
            .number()
            .min(0)
            .describe('Margin from the slide edges in pixels (defaults to 0)')
            .optional(),
    });

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

        if (!elementIds || !Array.isArray(elementIds)) {
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
            'right',
        ];

        if (!validAlignTypes.includes(alignType)) {
            return {
                success: false,
                error: `alignType must be one of: ${validAlignTypes.join(', ')}`,
            };
        }

        const elementIdList: string[] = elementIds;

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
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
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
                error: elementsNotFound(missingIds, slide),
            };
        }

        const slideWidth = 1280;
        const slideHeight = 720;
        // Tolerate string input at runtime; a legitimate 0 is kept as 0
        const marginNumber = Number(margin);
        const marginValue = Number.isFinite(marginNumber) ? marginNumber : 0;
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
                    message:
                        'Elements are already aligned to slide as requested',
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
                message: `Successfully aligned ${updates.length} elements to slide using "${alignType}" alignment`,
                updates,
            },
            editedSlidesIds: [slideId],
        };
    }
}
