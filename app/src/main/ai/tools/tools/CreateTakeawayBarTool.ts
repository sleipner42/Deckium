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
    SLIDE_WIDTH,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';
import { addTextElement, styledParagraph } from '../utils/slide-components';

const TAKEAWAY_FONT_SIZE = 18;
const DEFAULT_HEIGHT = 56;
const DEFAULT_MARGIN_X = 64;
const DEFAULT_Y = 636;

export class CreateTakeawayBarTool extends BaseTool {
    name = 'createTakeawayBar';

    description =
        'Create a bottom takeaway bar in one call: a full-width rounded bar near the bottom of the slide with a single centered key message. Use it to land the one thing the audience should remember.';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the bar to'),
        text: z
            .string()
            .describe('The takeaway message (plain text, one short sentence)'),
        fillColor: colorSchema
            .describe(
                `Bar background - a dark neutral or the design language's accent. ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        textColor: colorSchema
            .describe(
                'Message text color (defaults to white; ensure strong contrast with fillColor)',
            )
            .optional(),
        y: ySchema(' of the bar (defaults to 636, near the bottom)').optional(),
        height: z
            .number()
            .positive()
            .optional()
            .describe('Bar height in pixels (defaults to 56)'),
        marginX: z
            .number()
            .optional()
            .describe('Left/right margin in pixels (defaults to 64)'),
        borderRadius: borderRadiusSchema.optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, text } = params;

        if (!slideId || !text) {
            return { success: false, error: 'slideId and text are required' };
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            return {
                success: false,
                error: slideNotFound(slideId, presentation),
            };
        }

        const marginX =
            params.marginX !== undefined
                ? Number(params.marginX)
                : DEFAULT_MARGIN_X;
        const y = params.y !== undefined ? Number(params.y) : DEFAULT_Y;
        const height =
            params.height !== undefined
                ? Number(params.height)
                : DEFAULT_HEIGHT;
        const width = SLIDE_WIDTH - marginX * 2;
        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 5;

        const bar = createShape({
            shapeType: 'rectangle',
            position: { x: marginX, y },
            size: { width, height },
            fillColor: params.fillColor || '#0F172A',
            strokeColor: 'transparent',
            strokeWidth: 0,
            borderRadius:
                params.borderRadius !== undefined
                    ? Number(params.borderRadius)
                    : 10,
            opacity: 1,
            shadow: 'none',
            zIndex,
        });
        presentationService.addElement(slideId, bar);

        const textElement = addTextElement(
            presentationService,
            slideId,
            styledParagraph(String(text), {
                fontSize: TAKEAWAY_FONT_SIZE,
                color: params.textColor || '#FFFFFF',
                bold: true,
                align: 'center',
            }),
            { x: marginX + 16, y },
            { width: width - 32, height },
            zIndex + 1,
            'middle',
        );

        return {
            success: true,
            data: {
                barId: bar.id,
                textId: textElement.id,
                slideId,
                message: `Takeaway bar created at y=${y}.`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
