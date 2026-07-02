import { MoveSlideTool } from '../../main/ai/tools/tools/MoveSlideTool';
import { MockPresentationService } from './MockPresentationService';

describe('MoveSlideTool', () => {
    let tool: MoveSlideTool;
    let mockService: MockPresentationService;
    let slideIds: string[];

    beforeEach(() => {
        tool = new MoveSlideTool();
        mockService = new MockPresentationService();
        slideIds = [];
        for (let i = 0; i < 3; i++) {
            slideIds.push(
                mockService.addSlide(
                    mockService.createMockSlide({ id: `slide-${i}` }),
                ).id,
            );
        }
    });

    it('should move a slide to the front', async () => {
        const result = await tool.execute(
            { slideId: 'slide-2', newIndex: 0 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.slideOrder).toEqual([
            'slide-2',
            'slide-0',
            'slide-1',
        ]);
        expect(result.data.fromIndex).toBe(2);
        expect(result.data.toIndex).toBe(0);
    });

    it('should move a slide backwards', async () => {
        const result = await tool.execute(
            { slideId: 'slide-0', newIndex: 2 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.slideOrder).toEqual([
            'slide-1',
            'slide-2',
            'slide-0',
        ]);
    });

    it('should no-op when slide already at target index', async () => {
        const result = await tool.execute(
            { slideId: 'slide-1', newIndex: 1 },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.message).toContain('already at position 1');
        expect(mockService.getPresentation().slides.map((s) => s.id)).toEqual([
            'slide-0',
            'slide-1',
            'slide-2',
        ]);
    });

    it('should error with valid range when index out of bounds', async () => {
        const result = await tool.execute(
            { slideId: 'slide-1', newIndex: 5 },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('out of range');
        expect(result.error).toContain('0 to 2');
    });

    it('should error with valid slide IDs when slide missing', async () => {
        const result = await tool.execute(
            { slideId: 'nope', newIndex: 0 },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Slide 'nope' not found");
        expect(result.error).toContain('slide-0');
    });
});
