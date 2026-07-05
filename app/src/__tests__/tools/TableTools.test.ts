import { Table } from '../../common/domain/entities/types';
import { CreateTableTool } from '../../main/ai/tools/tools/CreateTableTool';
import { UpdateTableTool } from '../../main/ai/tools/tools/UpdateTableTool';
import { MockPresentationService } from './MockPresentationService';

describe('CreateTableTool', () => {
    let tool: CreateTableTool;
    let mockService: MockPresentationService;
    let slideId: string;

    beforeEach(() => {
        tool = new CreateTableTool();
        mockService = new MockPresentationService();
        slideId = mockService.addSlide().id;
    });

    const findTable = (): Table => {
        const el = mockService
            .getPresentation()
            .slides.flatMap((s) => s.elements)
            .find((e) => e.type === 'table');
        return el as Table;
    };

    it('requires a slideId', async () => {
        const result = await tool.execute(
            { data: [['a']] },
            mockService as any,
        );
        expect(result.success).toBe(false);
        expect(result.error).toBe('slideId is required');
    });

    it('rejects empty data', async () => {
        const result = await tool.execute(
            { slideId, data: [] },
            mockService as any,
        );
        expect(result.success).toBe(false);
    });

    it('creates a table and pads ragged rows to a rectangle', async () => {
        const result = await tool.execute(
            {
                slideId,
                data: [
                    ['Region', 'Q1', 'Q2'],
                    ['North', '120'],
                ],
                headerRow: true,
            },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.dimensions).toEqual({ rows: 2, columns: 3 });

        const table = findTable();
        expect(table.headerRow).toBe(true);
        expect(table.rows).toHaveLength(2);
        // Ragged second row padded to 3 cells.
        expect(table.rows[1]).toHaveLength(3);
        expect(table.rows[1][2].content).toBe('');
        expect(table.columnWidths).toHaveLength(3);
        expect(table.rowHeights).toHaveLength(2);
    });

    it('sanitizes disallowed cell HTML', async () => {
        const result = await tool.execute(
            {
                slideId,
                data: [['<script>alert(1)</script>bad', 'ok']],
            },
            mockService as any,
        );

        expect(result.success).toBe(true);
        const table = findTable();
        expect(table.rows[0][0].content).not.toContain('<script>');
    });
});

describe('UpdateTableTool', () => {
    let createTool: CreateTableTool;
    let tool: UpdateTableTool;
    let mockService: MockPresentationService;
    let slideId: string;
    let tableId: string;

    beforeEach(async () => {
        createTool = new CreateTableTool();
        tool = new UpdateTableTool();
        mockService = new MockPresentationService();
        slideId = mockService.addSlide().id;
        const res = await createTool.execute(
            {
                slideId,
                data: [
                    ['A', 'B'],
                    ['1', '2'],
                ],
            },
            mockService as any,
        );
        tableId = res.data?.elementId as string;
    });

    const table = (): Table =>
        mockService
            .getPresentation()
            .slides.flatMap((s) => s.elements)
            .find((e) => e.id === tableId) as Table;

    it('errors on a wrong element type', async () => {
        const textEl = mockService.createMockTextElement({});
        mockService.addElement(slideId, textEl);
        const result = await tool.execute(
            {
                elementId: textEl.id,
                setCells: [{ row: 0, col: 0, content: 'x' }],
            },
            mockService as any,
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/table/i);
    });

    it('sets a specific cell', async () => {
        const result = await tool.execute(
            {
                elementId: tableId,
                setCells: [{ row: 1, col: 1, content: '42' }],
            },
            mockService as any,
        );
        expect(result.success).toBe(true);
        expect(table().rows[1][1].content).toContain('42');
    });

    it('rejects an out-of-range cell target', async () => {
        const result = await tool.execute(
            {
                elementId: tableId,
                setCells: [{ row: 9, col: 0, content: 'x' }],
            },
            mockService as any,
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/out of range/i);
    });

    it('adds and deletes rows/columns keeping the grid rectangular', async () => {
        await tool.execute(
            { elementId: tableId, addRow: { cells: ['3', '4'] } },
            mockService as any,
        );
        expect(table().rows).toHaveLength(3);
        expect(table().rowHeights).toHaveLength(3);

        await tool.execute(
            {
                elementId: tableId,
                addColumn: { at: 1, cells: ['x', 'y', 'z'] },
            },
            mockService as any,
        );
        const t = table();
        expect(t.columnWidths).toHaveLength(3);
        expect(t.rows.every((r) => r.length === 3)).toBe(true);
        expect(t.rows[0][1].content).toContain('x');

        await tool.execute(
            { elementId: tableId, deleteColumn: 0 },
            mockService as any,
        );
        expect(table().rows.every((r) => r.length === 2)).toBe(true);
    });

    it('refuses to delete the last remaining row or column', async () => {
        // Shrink to a 1x1 table first.
        await tool.execute(
            { elementId: tableId, data: [['only']] },
            mockService as any,
        );
        const rowRes = await tool.execute(
            { elementId: tableId, deleteRow: 0 },
            mockService as any,
        );
        expect(rowRes.success).toBe(false);
        const colRes = await tool.execute(
            { elementId: tableId, deleteColumn: 0 },
            mockService as any,
        );
        expect(colRes.success).toBe(false);
    });

    it('updates styling and geometry', async () => {
        const result = await tool.execute(
            {
                elementId: tableId,
                headerRow: true,
                borderColor: '#ff0000',
                width: 640,
                x: 50,
            },
            mockService as any,
        );
        expect(result.success).toBe(true);
        const t = table();
        expect(t.headerRow).toBe(true);
        expect(t.borderColor).toBe('#ff0000');
        expect(t.size.width).toBe(640);
        expect(t.position.x).toBe(50);
    });
});
