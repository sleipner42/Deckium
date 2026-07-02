import { MoveElementTool } from '../../main/ai/tools/tools/MoveElementTool';
import { MockPresentationService } from './MockPresentationService';

describe('MoveElementTool', () => {
    let tool: MoveElementTool;
    let mockService: MockPresentationService;

    beforeEach(() => {
        tool = new MoveElementTool();
        mockService = new MockPresentationService();
    });

    it('should move an element to a new position', async () => {
        const slide = mockService.addSlide();
        const element = mockService.createMockTextElement({ id: 'elem1' });
        mockService.addElement(slide.id, element);

        const result = await tool.execute(
            { elementId: 'elem1', x: 300, y: 250 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.position).toEqual({ x: 300, y: 250 });
        expect(result.data.size).toEqual({ width: 200, height: 50 });
        expect(result.editedSlidesIds).toEqual([slide.id]);
        const stored = mockService.getElementById('elem1');
        expect(stored?.element.position).toEqual({ x: 300, y: 250 });
    });

    it('should resize without moving, preserving position', async () => {
        const slide = mockService.addSlide();
        const element = mockService.createMockTextElement({ id: 'elem1' });
        mockService.addElement(slide.id, element);

        const result = await tool.execute(
            { elementId: 'elem1', width: 400 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.position).toEqual({ x: 100, y: 100 });
        expect(result.data.size).toEqual({ width: 400, height: 50 });
    });

    it('should move any element type (image)', async () => {
        const slide = mockService.addSlide();
        const element = mockService.createMockImageElement({ id: 'img1' });
        mockService.addElement(slide.id, element);

        const result = await tool.execute(
            { elementId: 'img1', x: 0, y: 0 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.elementType).toBe('image');
        expect(result.data.position).toEqual({ x: 0, y: 0 });
    });

    it('should error with valid element listing when element missing', async () => {
        const slide = mockService.addSlide();
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'existing' }),
        );

        const result = await tool.execute(
            { elementId: 'missing', x: 10 },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Element 'missing' not found");
        expect(result.error).toContain('existing');
    });

    it('should error when no geometry field is provided', async () => {
        const slide = mockService.addSlide();
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'elem1' }),
        );

        const result = await tool.execute(
            { elementId: 'elem1' },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain(
            'at least one of x, y, width, or height',
        );
    });

    it('should accept 0 as a valid coordinate', async () => {
        const slide = mockService.addSlide();
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'elem1' }),
        );

        const result = await tool.execute(
            { elementId: 'elem1', x: 0 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.position.x).toBe(0);
        expect(result.data.position.y).toBe(100);
    });
});
