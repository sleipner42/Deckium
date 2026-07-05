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
    shadowSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';
import { addTextElement, styledParagraph } from '../utils/slide-components';
import { estimateTextDimensions } from '../utils/text-dimensions';

const DEFAULT_PADDING = 24;
const TITLE_FONT_SIZE = 20;
const BODY_FONT_SIZE = 16;
const TITLE_BLOCK_HEIGHT = 40;

export class CreateCardTool extends BaseTool {
    name = 'createCard';

    description =
        'Create a complete content card in one call: a rounded surface rectangle with a title and body text placed inside with proper padding and z-index. Use for grouped content, feature blocks, and panels instead of hand-assembling a shape plus text boxes.';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the card to'),
        x: xSchema(" of the card's top-left corner"),
        y: ySchema(" of the card's top-left corner"),
        width: widthSchema(' of the card'),
        height: heightSchema(' of the card'),
        title: z
            .string()
            .optional()
            .describe('Short bold card title (plain text)'),
        body: z
            .string()
            .optional()
            .describe('Card body text (plain text, kept concise)'),
        fillColor: colorSchema
            .describe(
                `Card background - use the design language's surface color. ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        titleColor: colorSchema
            .describe('Title text color (defaults to near-black)')
            .optional(),
        bodyColor: colorSchema
            .describe('Body text color (defaults to muted gray)')
            .optional(),
        borderRadius: borderRadiusSchema.optional(),
        shadow: shadowSchema.optional(),
        padding: z
            .number()
            .optional()
            .describe('Inner padding in pixels (defaults to 24)'),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, x, y, width, height, title, body } = params;

        if (
            !slideId ||
            x === undefined ||
            y === undefined ||
            width === undefined ||
            height === undefined
        ) {
            return {
                success: false,
                error: 'slideId, x, y, width, and height are required',
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

        const padding =
            params.padding !== undefined
                ? Number(params.padding)
                : DEFAULT_PADDING;
        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;
        const innerX = Number(x) + padding;
        const innerWidth = Number(width) - padding * 2;

        const card = createShape({
            shapeType: 'rectangle',
            position: { x: Number(x), y: Number(y) },
            size: { width: Number(width), height: Number(height) },
            fillColor: params.fillColor || '#F1F5F9',
            strokeColor: 'transparent',
            strokeWidth: 0,
            borderRadius:
                params.borderRadius !== undefined
                    ? Number(params.borderRadius)
                    : 12,
            opacity: 1,
            shadow: params.shadow || 'soft',
            zIndex,
        });
        presentationService.addElement(slideId, card);

        const ids: Record<string, string> = { cardId: card.id };
        let contentY = Number(y) + padding;

        if (title) {
            const titleElement = addTextElement(
                presentationService,
                slideId,
                styledParagraph(String(title), {
                    fontSize: TITLE_FONT_SIZE,
                    color: params.titleColor || '#0F172A',
                    bold: true,
                }),
                { x: innerX, y: contentY },
                { width: innerWidth, height: TITLE_BLOCK_HEIGHT },
                zIndex + 1,
                'top',
            );
            ids.titleId = titleElement.id;
            contentY += TITLE_BLOCK_HEIGHT;
        }

        let overflowNote = '';
        if (body) {
            const bodyHeight = Number(y) + Number(height) - padding - contentY;
            const estimate = estimateTextDimensions(
                String(body),
                BODY_FONT_SIZE,
                innerWidth,
            );
            if (estimate.height > bodyHeight) {
                overflowNote = ` Warning: body text is ~${Math.ceil(estimate.height)}px tall but only ${bodyHeight}px fits inside the card - shorten the text or enlarge the card.`;
            }
            const bodyElement = addTextElement(
                presentationService,
                slideId,
                styledParagraph(String(body), {
                    fontSize: BODY_FONT_SIZE,
                    color: params.bodyColor || '#475569',
                }),
                { x: innerX, y: contentY },
                { width: innerWidth, height: Math.max(bodyHeight, 24) },
                zIndex + 1,
                'top',
            );
            ids.bodyId = bodyElement.id;
        }

        return {
            success: true,
            data: {
                ...ids,
                slideId,
                message: `Card created at (${Number(x)}, ${Number(y)}) ${Number(width)}x${Number(height)}.${overflowNote}`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
