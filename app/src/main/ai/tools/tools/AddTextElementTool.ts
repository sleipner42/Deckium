import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createTextBox } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import { HTML_CONTENT_DESCRIPTION } from '../utils/html-content';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    positionReferenceSchema,
    SLIDE_HEIGHT,
    SLIDE_WIDTH,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class AddTextElementTool extends BaseTool {
    name = 'addTextElement';

    description = 'Add a text element to a slide';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to add the element to'),
        content: z.string().describe(HTML_CONTENT_DESCRIPTION),
        x: xSchema(' (defaults to horizontally centered)').optional(),
        y: ySchema(' (defaults to vertically centered)').optional(),
        positionReference: positionReferenceSchema.optional(),
        width: widthSchema(' (defaults to 400)').optional(),
        height: heightSchema(' (defaults to 200)').optional(),
        borderRadius: z
            .number()
            .optional()
            .describe(
                'The border radius of the element in pixels (defaults to 0)',
            ),
        backgroundColor: colorSchema
            .describe(
                `The background color of the element (defaults to transparent). ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        verticalAlign: z
            .enum(['top', 'middle', 'bottom'])
            .optional()
            .describe(
                'The vertical alignment of the element (defaults to top), choose from top, middle, bottom',
            ),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            content,
            x,
            y,
            positionReference,
            borderRadius,
            backgroundColor,
            verticalAlign,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!content) {
            return {
                success: false,
                error: 'Content is required for text element',
            };
        }

        const width = params.width !== undefined ? Number(params.width) : 400;
        const height =
            params.height !== undefined ? Number(params.height) : 200;

        let xPos = x !== undefined ? Number(x) : SLIDE_WIDTH / 2 - width / 2;
        let yPos = y !== undefined ? Number(y) : SLIDE_HEIGHT / 2 - height / 2;

        if (positionReference === 'center') {
            xPos -= width / 2;
            yPos -= height / 2;
        }

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

        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;

        const element = createTextBox({
            content,
            position: { x: xPos, y: yPos },
            size: { width, height },
            borderRadius: borderRadius !== undefined ? Number(borderRadius) : 0,
            backgroundColor: backgroundColor || 'transparent',
            verticalAlign: verticalAlign || 'top',
            zIndex,
        });

        const updatedSlide = presentationService.addElement(slideId, element);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add element to slide with ID ${slideId}`,
            };
        }

        const message = `Text element added successfully at position (${element.position.x}, ${element.position.y}) with size ${element.size.width}x${element.size.height}px.`;

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId: updatedSlide.id,
                message,
            },
            editedSlidesIds: [updatedSlide.id],
        };
    }
}
