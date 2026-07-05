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

const VALUE_FONT_SIZE = 42;
const LABEL_FONT_SIZE = 14;

export class CreateStatCardTool extends BaseTool {
    name = 'createStatCard';

    description =
        'Create a stat/KPI card in one call: a rounded surface rectangle with a big accent-colored number and a small muted label, both centered. Use a row of 3-4 of these for key metrics - big numbers are strong focal elements.';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the card to'),
        x: xSchema(" of the card's top-left corner"),
        y: ySchema(" of the card's top-left corner"),
        width: widthSchema(' of the card (defaults to 260)').optional(),
        height: heightSchema(' of the card (defaults to 130)').optional(),
        value: z
            .string()
            .describe(
                'The big stat value, e.g. "80%", "$1.2M", "3x" (plain text)',
            ),
        label: z
            .string()
            .describe(
                'Short label under the value, e.g. "cost drop since 2010"',
            ),
        fillColor: colorSchema
            .describe(
                `Card background - use the design language's surface color. ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        valueColor: colorSchema
            .describe("Value color - use the design language's accent color")
            .optional(),
        labelColor: colorSchema
            .describe('Label color (defaults to muted gray)')
            .optional(),
        borderRadius: borderRadiusSchema.optional(),
        shadow: shadowSchema.optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, x, y, value, label } = params;

        if (
            !slideId ||
            x === undefined ||
            y === undefined ||
            !value ||
            !label
        ) {
            return {
                success: false,
                error: 'slideId, x, y, value, and label are required',
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

        const width = params.width !== undefined ? Number(params.width) : 260;
        const height =
            params.height !== undefined ? Number(params.height) : 130;
        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;

        const card = createShape({
            shapeType: 'rectangle',
            position: { x: Number(x), y: Number(y) },
            size: { width, height },
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

        const valueElement = addTextElement(
            presentationService,
            slideId,
            styledParagraph(String(value), {
                fontSize: VALUE_FONT_SIZE,
                color: params.valueColor || '#2563EB',
                bold: true,
                align: 'center',
            }),
            { x: Number(x) + 12, y: Number(y) + 14 },
            { width: width - 24, height: Math.round(height * 0.5) },
            zIndex + 1,
            'middle',
        );

        const labelElement = addTextElement(
            presentationService,
            slideId,
            styledParagraph(String(label), {
                fontSize: LABEL_FONT_SIZE,
                color: params.labelColor || '#64748B',
                align: 'center',
            }),
            { x: Number(x) + 12, y: Number(y) + height - 44 },
            { width: width - 24, height: 32 },
            zIndex + 1,
            'top',
        );

        return {
            success: true,
            data: {
                cardId: card.id,
                valueId: valueElement.id,
                labelId: labelElement.id,
                slideId,
                message: `Stat card "${String(value)}" created at (${Number(x)}, ${Number(y)}) ${width}x${height}.`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
