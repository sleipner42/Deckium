import { CreateSVGImageTool } from '../../main/ai/tools/tools/CreateSVGImageTool';
import { MockPresentationService } from './MockPresentationService';

describe('CreateSVGImageTool', () => {
    let tool: CreateSVGImageTool;
    let mockService: MockPresentationService;

    beforeEach(() => {
        tool = new CreateSVGImageTool();
        mockService = new MockPresentationService();
        mockService.addSlide(mockService.createMockSlide({ id: 'slide-1' }));
    });

    it('should create SVG image with valid parameters', async () => {
        const params = {
            slideId: 'slide-1',
            svgContent:
                '<svg><rect width="100" height="100" fill="red"/></svg>',
            x: 100,
            y: 200,
            width: 150,
            height: 150,
        };

        const result = await tool.execute(params, mockService as any);

        expect(result.success).toBe(true);
        expect(result.data?.elementId).toBeDefined();
        expect(result.data?.message).toContain('SVG image added successfully');
    });

    it('should fail when slideId is missing', async () => {
        const params = {
            svgContent:
                '<svg><rect width="100" height="100" fill="red"/></svg>',
        };

        const result = await tool.execute(params, mockService as any);

        expect(result.success).toBe(false);
        expect(result.error).toBe('slideId is required');
    });

    it('should fail when svgContent is missing', async () => {
        const params = {
            slideId: 'slide-1',
        };

        const result = await tool.execute(params, mockService as any);

        expect(result.success).toBe(false);
        expect(result.error).toBe('svgContent is required');
    });

    it('should fail when svgContent is invalid', async () => {
        const params = {
            slideId: 'slide-1',
            svgContent: 'not valid svg content',
        };

        const result = await tool.execute(params, mockService as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('svgContent must be valid SVG markup');
    });

    it('should use default values for optional parameters', async () => {
        const params = {
            slideId: 'slide-1',
            svgContent: '<svg><circle r="50" fill="blue"/></svg>',
        };

        const result = await tool.execute(params, mockService as any);

        expect(result.success).toBe(true);
        expect(result.data?.svgInfo.position).toEqual({ x: 100, y: 100 });
        expect(result.data?.svgInfo.size).toEqual({ width: 200, height: 200 });
    });

    it('should handle center positioning', async () => {
        const params = {
            slideId: 'slide-1',
            svgContent: '<svg><circle r="50" fill="blue"/></svg>',
            x: 300,
            y: 300,
            width: 100,
            height: 100,
            positionReference: 'center',
        };

        const result = await tool.execute(params, mockService as any);

        expect(result.success).toBe(true);
        // Should center the element: x=300-50=250, y=300-50=250
        expect(result.data?.svgInfo.position).toEqual({ x: 250, y: 250 });
    });
});
