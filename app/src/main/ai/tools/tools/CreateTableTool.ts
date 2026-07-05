import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createTable } from '../../../../common/domain/entities/element-factory';
import type { TableCell } from '../../../../common/domain/entities/types';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { sanitizeTextContent } from '../utils/html-sanitizer';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class CreateTableTool extends BaseTool {
    name = 'createTable';

    description =
        'Create a table element on a slide. Provide the cell contents as a 2D array (rows of columns). Each cell is rich text — plain text works, or the same limited HTML allowed in text boxes (e.g. <strong>, <em>, <span style="color:#ff0000">). Rows may be ragged; short rows are padded with empty cells.';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the table to'),
        data: z
            .array(z.array(z.string()))
            .describe(
                'Table contents as rows of cells: data[r][c] is the cell in row r, column c. Example: [["Region","Q1","Q2"],["North","120","145"]]. Must have at least one row and one column.',
            ),
        headerRow: z
            .boolean()
            .describe(
                'Whether the first row is a header (rendered bold with a distinct background). Defaults to false.',
            )
            .optional(),
        columnWidths: z
            .array(z.number())
            .describe(
                'Relative column widths (weights, not pixels), one per column. Defaults to equal widths.',
            )
            .optional(),
        x: xSchema(' (defaults to 100)').optional(),
        y: ySchema(' (defaults to 100)').optional(),
        width: widthSchema(' (defaults to 500)').optional(),
        height: heightSchema(' (defaults to 200)').optional(),
        borderColor: colorSchema
            .describe(
                `The border color (defaults to #000000). ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        borderWidth: z
            .number()
            .describe('Border width in pixels (defaults to 1)')
            .optional(),
        headerBackgroundColor: colorSchema
            .describe(
                `Background color for the header row when headerRow is true. ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            data,
            headerRow,
            columnWidths,
            x,
            y,
            width,
            height,
            borderColor,
            borderWidth,
            headerBackgroundColor,
            zIndex,
        } = params;

        if (!slideId) {
            return { success: false, error: 'slideId is required' };
        }
        if (!Array.isArray(data) || data.length === 0) {
            return {
                success: false,
                error: 'data must be a non-empty 2D array of cell strings',
            };
        }

        const numCols = Math.max(...data.map((row) => row.length));
        if (numCols === 0) {
            return {
                success: false,
                error: 'data must have at least one column',
            };
        }

        // Sanitize every cell and pad ragged rows to a rectangle.
        const notes = new Set<string>();
        const rows: TableCell[][] = data.map((row) =>
            Array.from({ length: numCols }, (_, c) => {
                const raw = row[c] ?? '';
                const cleaned = sanitizeTextContent(String(raw));
                if (cleaned.changed) {
                    for (const n of cleaned.notes) notes.add(n);
                }
                return { content: cleaned.html };
            }),
        );

        const cols =
            Array.isArray(columnWidths) && columnWidths.length === numCols
                ? columnWidths.map((w) => (w > 0 ? Number(w) : 1))
                : Array.from({ length: numCols }, () => 1);
        const rowHeights = Array.from({ length: rows.length }, () => 1);

        const element = createTable({
            position: {
                x: x !== undefined ? Number(x) : 100,
                y: y !== undefined ? Number(y) : 100,
            },
            size: {
                width: width !== undefined ? Number(width) : 500,
                height: height !== undefined ? Number(height) : 200,
            },
            rows,
            columnWidths: cols,
            rowHeights,
            headerRow: headerRow ?? false,
            borderColor: borderColor || '#000000',
            borderWidth: borderWidth !== undefined ? Number(borderWidth) : 1,
            headerBackgroundColor,
            zIndex: zIndex !== undefined ? Number(zIndex) : 1,
        });

        const updatedSlide = presentationService.addElement(slideId, element);
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add table to slide with ID ${slideId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId: element.id,
                message: 'Table added successfully',
                position: element.position,
                size: element.size,
                dimensions: { rows: rows.length, columns: numCols },
                ...(notes.size > 0 ? { contentAdjustments: [...notes] } : {}),
            },
            editedSlidesIds: [slideId],
        };
    }
}
