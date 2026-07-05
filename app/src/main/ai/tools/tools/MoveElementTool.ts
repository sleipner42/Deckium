import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementNotFoundInPresentation, slideNotFound } from '../utils/errors';
import { findElement } from '../utils/find-element';
import { heightSchema, widthSchema, xSchema, ySchema } from '../utils/schemas';

export class MoveElementTool extends BaseTool {
    name = 'moveElement';

    description =
        'Move and/or resize any element (text, shape, image, chart, plot) regardless of its type, optionally moving it to a different slide via targetSlideId. Provide at least one of x, y, width, height, targetSlideId; omitted values stay unchanged. Prefer this tool for pure move/resize operations; use the type-specific update tools to change content or styling.';

    inputSchema = z
        .object({
            elementId: z
                .string()
                .describe('The ID of the element to move or resize'),
            x: xSchema(' (top-left corner of the element)').optional(),
            y: ySchema(' (top-left corner of the element)').optional(),
            width: widthSchema().optional(),
            height: heightSchema().optional(),
            targetSlideId: z
                .string()
                .optional()
                .describe(
                    'Move the element to this slide (keeps its ID). Omit to stay on the current slide.',
                ),
        })
        .refine(
            (value) =>
                value.x !== undefined ||
                value.y !== undefined ||
                value.width !== undefined ||
                value.height !== undefined ||
                value.targetSlideId !== undefined,
            {
                message:
                    'Provide at least one of x, y, width, height, or targetSlideId',
            },
        );

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId, x, y, width, height, targetSlideId } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        if (
            x === undefined &&
            y === undefined &&
            width === undefined &&
            height === undefined &&
            targetSlideId === undefined
        ) {
            return {
                success: false,
                error: 'Provide at least one of x, y, width, height, or targetSlideId',
            };
        }

        const presentation = presentationService.getPresentation();
        const found = findElement(presentation, elementId);

        if (!found) {
            return {
                success: false,
                error: elementNotFoundInPresentation(elementId, presentation),
            };
        }

        const { element, slideId } = found;

        // Cross-slide move: delete from the source slide and re-add (same
        // element object, same ID) on the target, as one undo step.
        let movedToSlideId: string | null = null;
        if (targetSlideId !== undefined && targetSlideId !== slideId) {
            const targetSlide = presentation.slides.find(
                (s) => s.id === targetSlideId,
            );
            if (!targetSlide) {
                return {
                    success: false,
                    error: slideNotFound(targetSlideId, presentation),
                };
            }

            presentationService.beginTransaction('moveElement');
            try {
                presentationService.deleteElement(elementId);
                const added = presentationService.addElement(
                    targetSlideId,
                    element,
                );
                if (!added) {
                    return {
                        success: false,
                        error: `Failed to move element to slide ${targetSlideId}`,
                    };
                }
            } finally {
                presentationService.endTransaction('moveElement');
            }
            movedToSlideId = targetSlideId;
        }

        const updates: {
            position?: { x: number; y: number };
            size?: { width: number; height: number };
        } = {};

        if (x !== undefined || y !== undefined) {
            updates.position = {
                x: x !== undefined ? Number(x) : element.position.x,
                y: y !== undefined ? Number(y) : element.position.y,
            };
        }

        if (width !== undefined || height !== undefined) {
            updates.size = {
                width: width !== undefined ? Number(width) : element.size.width,
                height:
                    height !== undefined ? Number(height) : element.size.height,
            };
        }

        if (Object.keys(updates).length > 0) {
            const updatedSlide = presentationService.updateElement(
                elementId,
                updates,
            );
            if (!updatedSlide) {
                return {
                    success: false,
                    error: `Failed to update element with ID ${elementId}`,
                };
            }
        }

        const finalPosition = updates.position ?? element.position;
        const finalSize = updates.size ?? element.size;
        const finalSlideId = movedToSlideId ?? slideId;
        const movedNote = movedToSlideId
            ? ` and moved to slide ${movedToSlideId}`
            : '';

        return {
            success: true,
            data: {
                elementId,
                slideId: finalSlideId,
                elementType: element.type,
                position: finalPosition,
                size: finalSize,
                message: `Element moved/resized: now at (${finalPosition.x}, ${finalPosition.y}) with size ${finalSize.width}x${finalSize.height}px${movedNote}.`,
            },
            editedSlidesIds: movedToSlideId
                ? [slideId, movedToSlideId]
                : [slideId],
        };
    }
}
