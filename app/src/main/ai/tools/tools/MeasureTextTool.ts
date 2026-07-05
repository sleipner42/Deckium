import { z } from 'zod';
import { DEFAULT_TEXT_FONT_SIZE } from '../../../../common/config/typography';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { BaseTool } from '../BaseTool';
import { estimateTextDimensions } from '../utils/text-dimensions';

export class MeasureTextTool extends BaseTool {
    name = 'measureText';

    description =
        'Estimate how tall a piece of text will render at a given box width and font size BEFORE adding it to a slide. Use this to pick the right text box height up front instead of fixing overflow after linting. Uses the same estimator as the linter, so a passing measurement will also pass lint.';

    inputSchema = z.object({
        content: z
            .string()
            .describe(
                'The text to measure. HTML is accepted; tags are stripped and <br>/<li>/<p> become line breaks.',
            ),
        width: z
            .number()
            .positive()
            .describe('The width of the intended text box in pixels'),
        fontSize: z
            .number()
            .optional()
            .describe(
                `Font size in pixels (defaults to ${Number.parseInt(DEFAULT_TEXT_FONT_SIZE, 10)}, the body text default)`,
            ),
        boxHeight: z
            .number()
            .optional()
            .describe(
                'Optional intended box height in pixels; when given, the result reports whether the text fits',
            ),
    });

    protected async executeImpl(
        params: Record<string, any>,
    ): Promise<AIToolResult> {
        const { content, width, fontSize, boxHeight } = params;

        if (!content || width === undefined) {
            return {
                success: false,
                error: 'content and width are required',
            };
        }

        const effectiveFontSize =
            fontSize !== undefined
                ? Number(fontSize)
                : Number.parseInt(DEFAULT_TEXT_FONT_SIZE, 10);

        const plainText = htmlToPlainText(String(content));
        const result = estimateTextDimensions(
            plainText,
            effectiveFontSize,
            Number(width),
        );

        const fits =
            boxHeight !== undefined
                ? result.height <= Number(boxHeight)
                : undefined;

        return {
            success: true,
            data: {
                estimatedHeight: Math.ceil(result.height),
                estimatedWidth: Math.ceil(result.width),
                fontSize: effectiveFontSize,
                boxWidth: Number(width),
                ...(fits !== undefined && {
                    boxHeight: Number(boxHeight),
                    fits,
                }),
                ...(result.lineBreakInfo && { note: result.lineBreakInfo }),
                recommendation: `Use a box height of at least ${Math.ceil(result.height + 10)}px for this content at ${effectiveFontSize}px in a ${Number(width)}px wide box.`,
            },
            editedSlidesIds: [],
        };
    }
}

function htmlToPlainText(html: string): string {
    return html
        .replace(/<(br|\/p|\/li|\/h[1-6]|\/div)[^>]*>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
