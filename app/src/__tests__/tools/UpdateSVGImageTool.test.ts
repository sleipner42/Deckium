import { CreateSVGImageTool } from '../../main/ai/tools/tools/CreateSVGImageTool';
import { UpdateSVGImageTool } from '../../main/ai/tools/tools/UpdateSVGImageTool';
import { MockPresentationService } from './MockPresentationService';

describe('UpdateSVGImageTool', () => {
    let createTool: CreateSVGImageTool;
    let updateTool: UpdateSVGImageTool;
    let mockService: MockPresentationService;
    let slideId: string;
    let svgElementId: string;

    beforeEach(async () => {
        createTool = new CreateSVGImageTool();
        updateTool = new UpdateSVGImageTool();
        mockService = new MockPresentationService();
        slideId = mockService.addSlide().id;
        const created = await createTool.execute(
            {
                slideId,
                svgContent: '<svg><rect width="10" height="10"/></svg>',
                x: 0,
                y: 0,
            },
            mockService as any,
        );
        svgElementId = created.data.elementId;
    });

    it('replaces the SVG markup', async () => {
        const newSvg = '<svg><circle r="5"/></svg>';
        const result = await updateTool.execute(
            { elementId: svgElementId, svgContent: newSvg },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.editedSlidesIds).toEqual([slideId]);
        const stored = mockService.getElementById(svgElementId);
        expect((stored?.element as any).content).toBe(
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(newSvg)}`,
        );
    });

    it('can resize while updating', async () => {
        const result = await updateTool.execute(
            {
                elementId: svgElementId,
                svgContent: '<svg><circle r="5"/></svg>',
                width: 300,
            },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.size.width).toBe(300);
    });

    it('rejects invalid SVG markup', async () => {
        const result = await updateTool.execute(
            { elementId: svgElementId, svgContent: '<div>not svg</div>' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('<svg');
    });

    it('rejects raster images with a tool hint', async () => {
        const raster = mockService.createMockImageElement({ id: 'raster1' });
        mockService.addElement(slideId, raster);

        const result = await updateTool.execute(
            { elementId: 'raster1', svgContent: '<svg></svg>' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('raster image');
        expect(result.error).toContain('updateImageElement');
    });

    it('rejects non-image elements', async () => {
        const text = mockService.createMockTextElement({ id: 'txt1' });
        mockService.addElement(slideId, text);

        const result = await updateTool.execute(
            { elementId: 'txt1', svgContent: '<svg></svg>' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('textbox');
    });

    it('errors with a listing for missing elements', async () => {
        const result = await updateTool.execute(
            { elementId: 'ghost', svgContent: '<svg></svg>' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Element 'ghost' not found");
    });
});
