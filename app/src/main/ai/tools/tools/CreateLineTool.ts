import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createShape } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class CreateLineTool extends BaseTool {
    name = 'createLine';

    description =
        'Add a straight horizontal or vertical line to a slide - for accent lines under headers, dividers between sections, and underlines. Renders as a clean bar with rounded ends and no border.';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the line to'),
        orientation: z
            .enum(['horizontal', 'vertical'])
            .describe('Direction the line runs'),
        x: xSchema(" of the line's top-left corner"),
        y: ySchema(" of the line's top-left corner"),
        length: z
            .number()
            .positive()
            .describe(
                'Length of the line in pixels (60-80 for a header accent line, up to full width for a divider)',
            ),
        thickness: z
            .number()
            .positive()
            .optional()
            .describe('Line thickness in pixels (defaults to 3)'),
        color: colorSchema
            .describe(
                `Line color - use the design language's accent color for highlight lines. ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, orientation, x, y, length } = params;

        if (!slideId || !orientation || x === undefined || y === undefined) {
            return {
                success: false,
                error: 'slideId, orientation, x, and y are required',
            };
        }

        if (length === undefined || Number(length) <= 0) {
            return {
                success: false,
                error: 'length must be a positive number of pixels',
            };
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            return {
                success: false,
                error: slideNotFound(slideId, presentation),
            };
        }

        const thickness =
            params.thickness !== undefined ? Number(params.thickness) : 3;
        const lengthValue = Number(length);
        const width = orientation === 'horizontal' ? lengthValue : thickness;
        const height = orientation === 'horizontal' ? thickness : lengthValue;

        const element = createShape({
            shapeType: 'rectangle',
            position: { x: Number(x), y: Number(y) },
            size: { width, height },
            fillColor: params.color || '#E2E8F0',
            strokeColor: 'transparent',
            strokeWidth: 0,
            borderRadius: Math.ceil(thickness / 2),
            opacity: 1,
            shadow: 'none',
            zIndex: params.zIndex !== undefined ? Number(params.zIndex) : 1,
        });

        const updatedSlide = presentationService.addElement(slideId, element);
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add line to slide ${slideId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId: updatedSlide.id,
                message: `${orientation} line added at (${Number(x)}, ${Number(y)}), ${lengthValue}px long, ${thickness}px thick.`,
            },
            editedSlidesIds: [updatedSlide.id],
        };
    }
}
