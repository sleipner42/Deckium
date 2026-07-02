import { CreatePlotTool } from '../../main/ai/tools/tools/CreatePlotTool';
import { UpdatePlotTool } from '../../main/ai/tools/tools/UpdatePlotTool';
import { MockPresentationService } from './MockPresentationService';

describe('CreatePlotTool', () => {
    let tool: CreatePlotTool;
    let mockService: MockPresentationService;
    let slideId: string;

    beforeEach(() => {
        tool = new CreatePlotTool();
        mockService = new MockPresentationService();
        slideId = mockService.addSlide().id;
    });

    it('should create a line plot with multiple series', async () => {
        const result = await tool.execute(
            {
                slideId,
                plotType: 'line',
                series: [
                    { name: 'Revenue', x: [2021, 2022, 2023], y: [10, 25, 40] },
                    { name: 'Costs', x: [2021, 2022, 2023], y: [8, 12, 15] },
                ],
                title: 'Financials',
            },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.editedSlidesIds).toEqual([slideId]);
        const stored = mockService.getElementById(result.data.elementId);
        expect(stored?.element.type).toBe('plot');
        expect((stored?.element as any).plotType).toBe('line');
        expect((stored?.element as any).data.series).toHaveLength(2);
        expect((stored?.element as any).title).toBe('Financials');
    });

    it('should create a pie plot from labels and values', async () => {
        const result = await tool.execute(
            {
                slideId,
                plotType: 'pie',
                labels: ['A', 'B', 'C'],
                values: [30, 50, 20],
            },
            mockService as any,
        );

        expect(result.success).toBe(true);
        const stored = mockService.getElementById(result.data.elementId);
        expect((stored?.element as any).data.labels).toEqual(['A', 'B', 'C']);
    });

    it('should reject mismatched pie labels/values with an actionable error', async () => {
        const result = await tool.execute(
            {
                slideId,
                plotType: 'pie',
                labels: ['A', 'B'],
                values: [1, 2, 3],
            },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('2 items');
        expect(result.error).toContain('3 items');
    });

    it('should reject a line plot without series', async () => {
        const result = await tool.execute(
            { slideId, plotType: 'line' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("'series'");
    });

    it('should reject mismatched series x/y lengths naming the series', async () => {
        const result = await tool.execute(
            {
                slideId,
                plotType: 'line',
                series: [{ name: 'Bad', x: [1, 2], y: [1] }],
            },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("'Bad'");
    });
});

describe('UpdatePlotTool', () => {
    let createTool: CreatePlotTool;
    let updateTool: UpdatePlotTool;
    let mockService: MockPresentationService;
    let slideId: string;
    let elementId: string;

    beforeEach(async () => {
        createTool = new CreatePlotTool();
        updateTool = new UpdatePlotTool();
        mockService = new MockPresentationService();
        slideId = mockService.addSlide().id;
        const created = await createTool.execute(
            {
                slideId,
                plotType: 'line',
                series: [{ x: [1, 2, 3], y: [4, 5, 6] }],
            },
            mockService as any,
        );
        elementId = created.data.elementId;
    });

    it('should update plot data and title', async () => {
        const result = await updateTool.execute(
            {
                elementId,
                series: [{ name: 'New', x: [1, 2], y: [9, 9] }],
                title: 'Updated',
            },
            mockService as any,
        );

        expect(result.success).toBe(true);
        const stored = mockService.getElementById(elementId);
        expect((stored?.element as any).data.series[0].name).toBe('New');
        expect((stored?.element as any).title).toBe('Updated');
    });

    it('should move and resize the plot, echoing final geometry', async () => {
        const result = await updateTool.execute(
            { elementId, x: 50, y: 60, width: 300 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.position).toEqual({ x: 50, y: 60 });
        expect(result.data.size.width).toBe(300);
    });

    it('should reject updating a non-plot element with tool hint', async () => {
        const textElement = mockService.createMockTextElement({ id: 'txt1' });
        mockService.addElement(slideId, textElement);

        const result = await updateTool.execute(
            { elementId: 'txt1', title: 'x' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('is a textbox, not a plot');
        expect(result.error).toContain('updateTextElement');
    });

    it('should error with listing when plot element missing', async () => {
        const result = await updateTool.execute(
            { elementId: 'ghost', title: 'x' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Element 'ghost' not found");
    });
});
