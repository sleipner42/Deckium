import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import type {
    Table,
    TableCell,
} from '../../../../common/domain/entities/types';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    elementNotFoundInPresentation,
    wrongElementType,
} from '../utils/errors';
import { findElement } from '../utils/find-element';
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

export class UpdateTableTool extends BaseTool {
    name = 'updateTable';

    description =
        'Update an existing table: edit individual cells, replace all contents, add/remove rows or columns, or change styling. Cell text is rich text (plain text or the limited HTML allowed in text boxes). Row/column indices are 0-based.';

    inputSchema = z.object({
        elementId: z.string().describe('The ID of the table element to update'),
        data: z
            .array(z.array(z.string()))
            .describe(
                'Replace ALL cell contents with this 2D array (rows of columns). Resets the table dimensions to match.',
            )
            .optional(),
        setCells: z
            .array(
                z.object({
                    row: z.number().describe('0-based row index'),
                    col: z.number().describe('0-based column index'),
                    content: z
                        .string()
                        .describe('New rich-text/HTML content for the cell'),
                }),
            )
            .describe('Set specific cells by row/column.')
            .optional(),
        addRow: z
            .object({
                at: z
                    .number()
                    .describe(
                        '0-based index to insert at (defaults to the end)',
                    )
                    .optional(),
                cells: z
                    .array(z.string())
                    .describe('Cell contents for the new row (optional)')
                    .optional(),
            })
            .describe('Insert a new row.')
            .optional(),
        deleteRow: z
            .number()
            .describe('0-based index of a row to delete')
            .optional(),
        addColumn: z
            .object({
                at: z
                    .number()
                    .describe(
                        '0-based index to insert at (defaults to the end)',
                    )
                    .optional(),
                cells: z
                    .array(z.string())
                    .describe('Cell contents for the new column (optional)')
                    .optional(),
            })
            .describe('Insert a new column.')
            .optional(),
        deleteColumn: z
            .number()
            .describe('0-based index of a column to delete')
            .optional(),
        headerRow: z
            .boolean()
            .describe('Whether the first row is a header')
            .optional(),
        borderColor: colorSchema
            .describe(`New border color. ${COLOR_DESCRIPTION}`)
            .optional(),
        borderWidth: z
            .number()
            .describe('New border width in pixels')
            .optional(),
        headerBackgroundColor: colorSchema
            .describe(`New header-row background color. ${COLOR_DESCRIPTION}`)
            .optional(),
        x: xSchema(' (new value)').optional(),
        y: ySchema(' (new value)').optional(),
        width: widthSchema(' (new value)').optional(),
        height: heightSchema(' (new value)').optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId } = params;
        if (!elementId) {
            return { success: false, error: 'elementId is required' };
        }

        const presentation = presentationService.getPresentation();
        const found = findElement(presentation, elementId);
        if (!found) {
            return {
                success: false,
                error: elementNotFoundInPresentation(elementId, presentation),
            };
        }
        if (found.element.type !== 'table') {
            return {
                success: false,
                error: wrongElementType(found.element, 'table'),
            };
        }

        const table = found.element as Table;
        const notes = new Set<string>();
        const clean = (raw: string): string => {
            const c = sanitizeTextContent(String(raw ?? ''));
            if (c.changed) for (const n of c.notes) notes.add(n);
            return c.html;
        };

        // Deep-copy the current geometry so we never mutate frozen state.
        let rows: TableCell[][] = table.rows.map((row) =>
            row.map((cell) => ({ ...cell })),
        );
        let columnWidths = [...table.columnWidths];
        let rowHeights = [...table.rowHeights];
        const colCount = () => columnWidths.length;

        // 1. Full replace.
        if (Array.isArray(params.data)) {
            const numCols = Math.max(
                1,
                ...params.data.map((r: string[]) => r.length),
            );
            rows = params.data.map((row: string[]) =>
                Array.from({ length: numCols }, (_, c) => ({
                    content: clean(row[c] ?? ''),
                })),
            );
            columnWidths = Array.from({ length: numCols }, () => 1);
            rowHeights = Array.from({ length: rows.length }, () => 1);
        }

        // 2. Structural: delete before add is avoided; apply adds then deletes
        //    by explicit index as given.
        if (params.addColumn) {
            const at = Math.min(
                Math.max(0, params.addColumn.at ?? colCount()),
                colCount(),
            );
            const cells: string[] = params.addColumn.cells ?? [];
            rows = rows.map((row, r) => {
                const next = [...row];
                next.splice(at, 0, { content: clean(cells[r] ?? '') });
                return next;
            });
            columnWidths.splice(at, 0, 1);
        }
        if (params.deleteColumn !== undefined) {
            const idx = Number(params.deleteColumn);
            if (idx < 0 || idx >= colCount()) {
                return {
                    success: false,
                    error: `deleteColumn index ${idx} is out of range (0..${colCount() - 1})`,
                };
            }
            if (colCount() <= 1) {
                return {
                    success: false,
                    error: 'Cannot delete the last remaining column',
                };
            }
            rows = rows.map((row) => row.filter((_, c) => c !== idx));
            columnWidths.splice(idx, 1);
        }
        if (params.addRow) {
            const at = Math.min(
                Math.max(0, params.addRow.at ?? rows.length),
                rows.length,
            );
            const cells: string[] = params.addRow.cells ?? [];
            const newRow: TableCell[] = Array.from(
                { length: colCount() },
                (_, c) => ({ content: clean(cells[c] ?? '') }),
            );
            rows.splice(at, 0, newRow);
            rowHeights.splice(at, 0, 1);
        }
        if (params.deleteRow !== undefined) {
            const idx = Number(params.deleteRow);
            if (idx < 0 || idx >= rows.length) {
                return {
                    success: false,
                    error: `deleteRow index ${idx} is out of range (0..${rows.length - 1})`,
                };
            }
            if (rows.length <= 1) {
                return {
                    success: false,
                    error: 'Cannot delete the last remaining row',
                };
            }
            rows.splice(idx, 1);
            rowHeights.splice(idx, 1);
        }

        // 3. Targeted cell edits (after structure settles).
        if (Array.isArray(params.setCells)) {
            for (const { row, col, content } of params.setCells) {
                if (
                    row < 0 ||
                    row >= rows.length ||
                    col < 0 ||
                    col >= colCount()
                ) {
                    return {
                        success: false,
                        error: `setCells target (row ${row}, col ${col}) is out of range for a ${rows.length}x${colCount()} table`,
                    };
                }
                rows[row][col] = { ...rows[row][col], content: clean(content) };
            }
        }

        const updates: Partial<Table> = { rows, columnWidths, rowHeights };
        if (params.headerRow !== undefined)
            updates.headerRow = Boolean(params.headerRow);
        if (params.borderColor !== undefined)
            updates.borderColor = params.borderColor;
        if (params.borderWidth !== undefined)
            updates.borderWidth = Number(params.borderWidth);
        if (params.headerBackgroundColor !== undefined)
            updates.headerBackgroundColor = params.headerBackgroundColor;
        if (params.zIndex !== undefined) updates.zIndex = Number(params.zIndex);
        if (params.x !== undefined || params.y !== undefined) {
            updates.position = {
                x: params.x !== undefined ? Number(params.x) : table.position.x,
                y: params.y !== undefined ? Number(params.y) : table.position.y,
            };
        }
        if (params.width !== undefined || params.height !== undefined) {
            updates.size = {
                width:
                    params.width !== undefined
                        ? Number(params.width)
                        : table.size.width,
                height:
                    params.height !== undefined
                        ? Number(params.height)
                        : table.size.height,
            };
        }

        const updatedSlide = presentationService.updateElement(
            elementId,
            updates,
        );
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to update table with ID ${elementId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId,
                message: 'Table updated successfully',
                dimensions: { rows: rows.length, columns: colCount() },
                ...(notes.size > 0 ? { contentAdjustments: [...notes] } : {}),
            },
            editedSlidesIds: [found.slideId],
        };
    }
}
