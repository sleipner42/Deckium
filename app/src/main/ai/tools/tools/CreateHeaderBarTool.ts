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
} from '../utils/schemas';
import { addTextElement, escapeHtml } from '../utils/slide-components';

const HEADER_ZINDEX = 4;
const HEADER_HEIGHT = 56;
const ACCENT_LINE_WIDTH = 72;
const ACCENT_LINE_THICKNESS = 4;

export class CreateHeaderBarTool extends BaseTool {
    name = 'createHeaderBar';

    description =
        'Create a standard slide header in one call: an H2 title with a short accent-colored highlight line under it, at consistent margins. Use this on every content slide for a uniform, professional header.';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to add the header to'),
        title: z
            .string()
            .describe(
                'The slide title (plain text) - short and assertive, a claim rather than a topic label',
            ),
        accentColor: colorSchema
            .describe(
                `Color of the highlight line - use the design language's accent. ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        textColor: colorSchema
            .describe(
                'Title text color (defaults to near-black; use a light color on dark slides)',
            )
            .optional(),
        x: xSchema(' of the header (defaults to 64)').optional(),
        y: ySchema(' of the header (defaults to 36)').optional(),
        width: z
            .number()
            .positive()
            .optional()
            .describe('Header width in pixels (defaults to 1152)'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, title } = params;

        if (!slideId || !title) {
            return { success: false, error: 'slideId and title are required' };
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            return {
                success: false,
                error: slideNotFound(slideId, presentation),
            };
        }

        const x = params.x !== undefined ? Number(params.x) : 64;
        const y = params.y !== undefined ? Number(params.y) : 36;
        const width = params.width !== undefined ? Number(params.width) : 1152;
        const textColor = params.textColor || '#0F172A';

        const titleElement = addTextElement(
            presentationService,
            slideId,
            `<h2><span style='color: ${textColor}'>${escapeHtml(String(title))}</span></h2>`,
            { x, y },
            { width, height: HEADER_HEIGHT },
            HEADER_ZINDEX,
            'top',
        );

        const line = createShape({
            shapeType: 'rectangle',
            position: { x, y: y + HEADER_HEIGHT + 6 },
            size: { width: ACCENT_LINE_WIDTH, height: ACCENT_LINE_THICKNESS },
            fillColor: params.accentColor || '#2563EB',
            strokeColor: 'transparent',
            strokeWidth: 0,
            borderRadius: Math.ceil(ACCENT_LINE_THICKNESS / 2),
            opacity: 1,
            shadow: 'none',
            zIndex: HEADER_ZINDEX,
        });
        presentationService.addElement(slideId, line);

        return {
            success: true,
            data: {
                titleId: titleElement.id,
                accentLineId: line.id,
                slideId,
                message: `Header "${String(title)}" with accent line created at (${x}, ${y}).`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
