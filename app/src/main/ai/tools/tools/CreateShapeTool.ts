import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createShape } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import {
    borderRadiusSchema,
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    opacitySchema,
    positionReferenceSchema,
    shadowSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class CreateShapeTool extends BaseTool {
    name = 'createShape';

    description =
        'Create a shape element (rectangle, circle, or triangle) on a slide';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the shape to'),
        shapeType: z
            .enum(['rectangle', 'circle', 'triangle'])
            .describe(
                'The type of shape to create (rectangle, circle, or triangle)',
            ),
        x: xSchema(' (defaults to 100)').optional(),
        y: ySchema(' (defaults to 100)').optional(),
        positionReference: positionReferenceSchema.optional(),
        width: widthSchema(' (defaults to 150)').optional(),
        height: heightSchema(' (defaults to 150)').optional(),
        fillColor: colorSchema
            .describe(
                `The fill color of the shape (defaults to white). ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        strokeColor: colorSchema
            .describe(
                `The stroke/border color of the shape (only visible when strokeWidth > 0). ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        strokeWidth: z
            .number()
            .describe(
                'The stroke/border width of the shape in pixels (defaults to 0 - modern flat design rarely outlines shapes)',
            )
            .optional(),
        borderRadius: borderRadiusSchema.optional(),
        opacity: opacitySchema.optional(),
        shadow: shadowSchema.optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            shapeType,
            x,
            y,
            positionReference,
            width,
            height,
            fillColor,
            strokeColor,
            strokeWidth,
            borderRadius,
            opacity,
            shadow,
            zIndex,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (
            !shapeType ||
            !['rectangle', 'circle', 'triangle'].includes(shapeType)
        ) {
            return {
                success: false,
                error: 'shapeType is required and must be one of: rectangle, circle, triangle',
            };
        }

        const widthValue = width !== undefined ? Number(width) : 150;
        const heightValue = height !== undefined ? Number(height) : 150;
        const strokeWidthValue =
            strokeWidth !== undefined ? Number(strokeWidth) : 0;

        let xPos = x !== undefined ? Number(x) : 100;
        let yPos = y !== undefined ? Number(y) : 100;

        if (positionReference === 'center') {
            xPos -= widthValue / 2;
            yPos -= heightValue / 2;
        }

        // Get the current slide to check for overlaps
        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        const element = createShape({
            shapeType: shapeType as 'rectangle' | 'circle' | 'triangle',
            position: { x: xPos, y: yPos },
            size: {
                width: widthValue,
                height: heightValue,
            },
            fillColor: fillColor || '#FFFFFF',
            strokeColor: strokeColor || '#000000',
            strokeWidth: strokeWidthValue,
            borderRadius:
                borderRadius !== undefined ? Number(borderRadius) : 0,
            opacity: opacity !== undefined ? Number(opacity) : 1,
            shadow: shadow || 'none',
            zIndex: zIndex !== undefined ? Number(zIndex) : 1,
        });

        const updatedSlide = presentationService.addElement(slideId, element);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add shape to slide with ID ${slideId}`,
            };
        }

        const message = `${shapeType} shape added successfully`;

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId: updatedSlide.id,
                message,
                shapeInfo: {
                    type: shapeType,
                    position: { x: xPos, y: yPos },
                    size: {
                        width: widthValue,
                        height: heightValue,
                    },
                    fillColor: fillColor || '#FFFFFF',
                    strokeColor: strokeColor || '#000000',
                    strokeWidth: strokeWidthValue,
                },
            },
            editedSlidesIds: [slideId],
        };
    }
}
