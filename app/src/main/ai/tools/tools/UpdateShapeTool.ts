import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { Shape } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    elementNotFoundInPresentation,
    wrongElementType,
} from '../utils/errors';
import { findElement } from '../utils/find-element';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class UpdateShapeTool extends BaseTool {
    name = 'updateShape';

    description = 'Update an existing shape element on a slide';

    inputSchema = z.object({
        elementId: z.string().describe('The ID of the shape element to update'),
        x: xSchema(' (new value)').optional(),
        y: ySchema(' (new value)').optional(),
        width: widthSchema(' (new value)').optional(),
        height: heightSchema(' (new value)').optional(),
        fillColor: colorSchema
            .describe(`New fill color. ${COLOR_DESCRIPTION}`)
            .optional(),
        strokeColor: colorSchema
            .describe(`New stroke/border color. ${COLOR_DESCRIPTION}`)
            .optional(),
        strokeWidth: z
            .number()
            .describe('New stroke/border width in pixels')
            .optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            elementId,
            x,
            y,
            width,
            height,
            fillColor,
            strokeColor,
            strokeWidth,
            zIndex,
        } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        // Find the element to ensure it's a shape
        const currentPresentation = presentationService.getPresentation();
        const found = findElement(currentPresentation, elementId);

        if (!found) {
            return {
                success: false,
                error: elementNotFoundInPresentation(
                    elementId,
                    currentPresentation,
                ),
            };
        }

        const foundElement = found.element;
        const slideId = found.slideId;

        if (!['rectangle', 'circle', 'triangle'].includes(foundElement.type)) {
            return {
                success: false,
                error: wrongElementType(foundElement, 'shape'),
            };
        }

        const shape = foundElement as Shape;
        const updates: Partial<Shape> = {};

        // Process position updates
        if (x !== undefined || y !== undefined) {
            updates.position = {
                x: x !== undefined ? Number(x) : shape.position.x,
                y: y !== undefined ? Number(y) : shape.position.y,
            };
        }

        // Process size updates
        if (width !== undefined || height !== undefined) {
            updates.size = {
                width: width !== undefined ? Number(width) : shape.size.width,
                height:
                    height !== undefined ? Number(height) : shape.size.height,
            };
        }

        // Process other property updates
        if (fillColor !== undefined) {
            updates.fillColor = fillColor;
        }

        if (strokeColor !== undefined) {
            updates.strokeColor = strokeColor;
        }

        if (strokeWidth !== undefined) {
            updates.strokeWidth = Number(strokeWidth);
        }

        if (zIndex !== undefined) {
            updates.zIndex = Number(zIndex);
        }

        // If no updates were requested, return success
        if (Object.keys(updates).length === 0) {
            return {
                success: true,
                data: {
                    message: 'No updates were requested',
                },
                editedSlidesIds: slideId ? [slideId] : [],
            };
        }

        // Update the element first
        const updatedElement = presentationService.updateElement(
            elementId,
            updates,
        );

        if (!updatedElement) {
            return {
                success: false,
                error: `Failed to update shape with ID ${elementId}`,
            };
        }

        const message = 'Shape updated successfully';

        return {
            success: true,
            data: {
                elementId,
                message,
                updates,
            },
            editedSlidesIds: slideId ? [slideId] : [],
        };
    }
}
