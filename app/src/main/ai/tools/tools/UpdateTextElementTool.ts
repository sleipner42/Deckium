import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { TextBox } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    elementNotFoundInPresentation,
    wrongElementType,
} from '../utils/errors';
import { findElement } from '../utils/find-element';
import { HTML_CONTENT_DESCRIPTION } from '../utils/html-content';
import { sanitizeTextContent } from '../utils/html-sanitizer';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    positionReferenceSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class UpdateTextElementTool extends BaseTool {
    name = 'updateTextElement';

    description = 'Update an existing text element on a slide';

    inputSchema = z.object({
        elementId: z.string().describe('The ID of the text element to update'),
        content: z.string().optional().describe(HTML_CONTENT_DESCRIPTION),
        x: xSchema(' (new value)').optional(),
        y: ySchema(' (new value)').optional(),
        positionReference: positionReferenceSchema.optional(),
        width: widthSchema(' (new value)').optional(),
        height: heightSchema(' (new value)').optional(),
        borderRadius: z
            .number()
            .optional()
            .describe('The new border radius in pixels'),
        backgroundColor: colorSchema
            .describe(`The new background color. ${COLOR_DESCRIPTION}`)
            .optional(),
        verticalAlign: z
            .enum(['top', 'middle', 'bottom'])
            .optional()
            .describe('The new vertical alignment of the element'),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            elementId,
            content,
            x,
            y,
            positionReference,
            width,
            height,
            borderRadius,
            backgroundColor,
            verticalAlign,
        } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        if (
            !content &&
            x === undefined &&
            y === undefined &&
            width === undefined &&
            height === undefined &&
            borderRadius === undefined &&
            backgroundColor === undefined &&
            verticalAlign === undefined &&
            params.zIndex === undefined
        ) {
            return {
                success: false,
                error: 'At least one property to update must be provided',
            };
        }

        let targetElement: TextBox | null = null;
        let slideId: string | null = null;

        const currentPresentation = presentationService.getPresentation();

        const found = findElement(currentPresentation, elementId);
        if (found && found.element.type === 'textbox') {
            targetElement = found.element as TextBox;
            slideId = found.slideId;
        }

        if (!targetElement || !slideId) {
            return {
                success: false,
                error: found
                    ? wrongElementType(found.element, 'text element')
                    : elementNotFoundInPresentation(
                          elementId,
                          currentPresentation,
                      ),
            };
        }

        const updates: Partial<TextBox> = {};

        const cleaned =
            content !== undefined ? sanitizeTextContent(content) : null;
        if (cleaned) updates.content = cleaned.html;
        if (borderRadius !== undefined)
            updates.borderRadius = Number(borderRadius);
        if (backgroundColor !== undefined)
            updates.backgroundColor = backgroundColor;
        if (verticalAlign !== undefined) updates.verticalAlign = verticalAlign;
        if (params.zIndex !== undefined) updates.zIndex = Number(params.zIndex);

        if (x !== undefined || y !== undefined) {
            let xPos = x !== undefined ? Number(x) : targetElement.position.x;
            let yPos = y !== undefined ? Number(y) : targetElement.position.y;

            const widthValue =
                width !== undefined ? Number(width) : targetElement.size.width;
            const heightValue =
                height !== undefined
                    ? Number(height)
                    : targetElement.size.height;

            if (positionReference === 'center') {
                xPos -= widthValue / 2;
                yPos -= heightValue / 2;
            }

            updates.position = { x: xPos, y: yPos };
        }

        if (width !== undefined || height !== undefined) {
            updates.size = {
                width:
                    width !== undefined
                        ? Number(width)
                        : targetElement.size.width,
                height:
                    height !== undefined
                        ? Number(height)
                        : targetElement.size.height,
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

        const message = 'Text element updated successfully';

        const finalElement =
            updatedSlide.elements.find((e) => e.id === elementId) ??
            targetElement;

        return {
            success: true,
            data: {
                elementId,
                slideId: updatedSlide.id,
                message,
                updates: Object.keys(updates),
                position: updates.position ?? finalElement.position,
                size: updates.size ?? finalElement.size,
                ...(cleaned?.changed
                    ? { contentAdjustments: cleaned.notes }
                    : {}),
            },
            editedSlidesIds: [slideId],
        };
    }
}
