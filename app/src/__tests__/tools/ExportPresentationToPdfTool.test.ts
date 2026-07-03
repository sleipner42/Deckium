import { ExportPresentationToPdfTool } from '../../main/ai/tools/tools/ExportPresentationToPdfTool';
import { MockPresentationService } from './MockPresentationService';

describe('ExportPresentationToPdfTool', () => {
    let tool: ExportPresentationToPdfTool;
    let mockService: MockPresentationService;

    beforeEach(() => {
        tool = new ExportPresentationToPdfTool();
        mockService = new MockPresentationService();
        mockService.addSlide();
    });

    it('exports via the pdf service and returns the path', async () => {
        const exportToFile = jest
            .fn()
            .mockImplementation(async (filePath: string) => filePath);

        const result = await tool.execute(
            { filePath: '/tmp/deck.pdf' },
            mockService as any,
            { pdfExport: { exportToFile } as any },
        );

        expect(result.success).toBe(true);
        expect(exportToFile).toHaveBeenCalledWith('/tmp/deck.pdf');
        expect(result.data.filePath).toBe('/tmp/deck.pdf');
        expect(result.data.message).toContain('/tmp/deck.pdf');
    });

    it('rejects non-pdf file paths', async () => {
        const exportToFile = jest.fn();
        const result = await tool.execute(
            { filePath: '/tmp/deck.txt' },
            mockService as any,
            { pdfExport: { exportToFile } as any },
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('.pdf');
        expect(exportToFile).not.toHaveBeenCalled();
    });

    it('fails cleanly without the pdf service', async () => {
        const result = await tool.execute(
            { filePath: '/tmp/deck.pdf' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('not available');
    });

    it('fails on empty presentations', async () => {
        const empty = new MockPresentationService();
        const result = await tool.execute(
            { filePath: '/tmp/deck.pdf' },
            empty as any,
            { pdfExport: { exportToFile: jest.fn() } as any },
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('no slides');
    });

    it('surfaces export failures as tool errors', async () => {
        const exportToFile = jest
            .fn()
            .mockRejectedValue(new Error('disk full'));

        const result = await tool.execute(
            { filePath: '/tmp/deck.pdf' },
            mockService as any,
            { pdfExport: { exportToFile } as any },
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('disk full');
    });
});
