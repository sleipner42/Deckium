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
            'at least one of x, y, width, height, or targetSlideId',
        );
    });

    describe('cross-slide moves', () => {
        it('moves an element to another slide, keeping its ID', async () => {
            const source = mockService.addSlide();
            const target = mockService.addSlide();
            mockService.addElement(
                source.id,
                mockService.createMockTextElement({ id: 'mover' }),
            );

            const result = await tool.execute(
                { elementId: 'mover', targetSlideId: target.id },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data.slideId).toBe(target.id);
            expect(result.editedSlidesIds?.sort()).toEqual(
                [source.id, target.id].sort(),
            );
            const stored = mockService.getElementById('mover');
            expect(stored?.slide.id).toBe(target.id);
            expect(mockService.getSlideById(source.id)?.elements).toHaveLength(
                0,
            );
        });

        it('moves and repositions in one call', async () => {
            const source = mockService.addSlide();
            const target = mockService.addSlide();
            mockService.addElement(
                source.id,
                mockService.createMockTextElement({ id: 'mover' }),
            );

            const result = await tool.execute(
                { elementId: 'mover', targetSlideId: target.id, x: 10, y: 20 },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data.position).toEqual({ x: 10, y: 20 });
            expect(mockService.getElementById('mover')?.slide.id).toBe(
                target.id,
            );
        });

        it('errors with slide listing for a missing target slide', async () => {
            const source = mockService.addSlide();
            mockService.addElement(
                source.id,
                mockService.createMockTextElement({ id: 'mover' }),
            );

            const result = await tool.execute(
                { elementId: 'mover', targetSlideId: 'nope' },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Slide 'nope' not found");
            expect(mockService.getElementById('mover')?.slide.id).toBe(
                source.id,
            );
        });

        it('treats same-slide targetSlideId as a no-op move', async () => {
            const slide = mockService.addSlide();
            mockService.addElement(
                slide.id,
                mockService.createMockTextElement({ id: 'mover' }),
            );

            const result = await tool.execute(
                { elementId: 'mover', targetSlideId: slide.id },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data.slideId).toBe(slide.id);
        });
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
