import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementNotFoundInPresentation } from '../utils/errors';
import { heightSchema, widthSchema, xSchema, ySchema } from '../utils/schemas';

export class MoveElementTool extends BaseTool {
    name = 'moveElement';

    description =
        'Move and/or resize any element (text, shape, image, chart, plot) regardless of its type. Provide at least one of x, y, width, height; omitted values stay unchanged. Prefer this tool for pure move/resize operations; use the type-specific update tools to change content or styling.';

    inputSchema = z
        .object({
            elementId: z
                .string()
                .describe('The ID of the element to move or resize'),
            x: xSchema(' (top-left corner of the element)').optional(),
            y: ySchema(' (top-left corner of the element)').optional(),
            width: widthSchema().optional(),
            height: heightSchema().optional(),
        })
        .refine(
            (value) =>
                value.x !== undefined ||
                value.y !== undefined ||
                value.width !== undefined ||
                value.height !== undefined,
            {
                message: 'Provide at least one of x, y, width, or height',
            },
        );

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId, x, y, width, height } = params;

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
            height === undefined
        ) {
            return {
                success: false,
                error: 'Provide at least one of x, y, width, or height',
            };
        }

        const presentation = presentationService.getPresentation();
        let element = null;
        let slideId = null;
        for (const slide of presentation.slides) {
            const found = slide.elements.find((e) => e.id === elementId);
            if (found) {
                element = found;
                slideId = slide.id;
                break;
            }
        }

        if (!element || !slideId) {
            return {
                success: false,
                error: elementNotFoundInPresentation(elementId, presentation),
            };
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

        const finalPosition = updates.position ?? element.position;
        const finalSize = updates.size ?? element.size;

        return {
            success: true,
            data: {
                elementId,
                slideId,
                elementType: element.type,
                position: finalPosition,
                size: finalSize,
                message: `Element moved/resized: now at (${finalPosition.x}, ${finalPosition.y}) with size ${finalSize.width}x${finalSize.height}px.`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
