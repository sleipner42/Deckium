import { AddTextElementTool } from '../../main/ai/tools/tools/AddTextElementTool';
import { MockPresentationService } from './MockPresentationService';

describe('AddTextElementTool', () => {
    let tool: AddTextElementTool;
    let mockService: MockPresentationService;
    let slideId: string;

    beforeEach(() => {
        tool = new AddTextElementTool();
        mockService = new MockPresentationService();

        // Add a test slide
        const slide = mockService.addSlide();
        slideId = slide.id;
    });

    describe('Parameter Validation', () => {
        it('should return error when slideId is missing', async () => {
            const result = await tool.execute(
                {
                    content: 'Test text',
                },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('slideId is required');
        });

        it('should return error when content is missing', async () => {
            const result = await tool.execute(
                {
                    slideId,
                },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Content is required for text element');
        });

        it('should return error when slide does not exist', async () => {
            const result = await tool.execute(
                {
                    slideId: 'non-existent-slide',
                    content: 'Test text',
                },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain(
                "Slide 'non-existent-slide' not found",
            );
        });
    });

    describe('Element Creation', () => {
        it('should create text element with default parameters', async () => {
            const result = await tool.execute(
                {
                    slideId,
                    content: 'Test text content',
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('elementId');
            expect(result.data).toHaveProperty('slideId', slideId);
            expect(result.data).toHaveProperty('message');

            // Verify element was added to slide
            const slide = mockService.getSlideById(slideId);
            expect(slide?.elements).toHaveLength(1);

            const element = slide?.elements[0] as any;
            expect(element?.type).toBe('textbox');
            expect(element?.content).toBe('Test text content');
        });

        it('sanitizes unsupported HTML and reports adjustments', async () => {
            const result = await tool.execute(
                {
                    slideId,
                    content: '<table><tr><td>data</td></tr></table>',
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            const element = mockService.getSlideById(slideId)
                ?.elements[0] as any;
            expect(element?.content).toBe('data');
            expect(result.data.contentAdjustments).toBeDefined();
            expect(result.data.contentAdjustments.join(' ')).toContain('table');
        });

        it('stores valid HTML unchanged with no adjustments', async () => {
            const result = await tool.execute(
                {
                    slideId,
                    content: "<p class='ql-align-center'>Centered</p>",
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            const element = mockService.getSlideById(slideId)
                ?.elements[0] as any;
            expect(element?.content).toBe(
                "<p class='ql-align-center'>Centered</p>",
            );
            expect(result.data.contentAdjustments).toBeUndefined();
        });

        it('should create text element with custom parameters', async () => {
            const result = await tool.execute(
                {
                    slideId,
                    content: 'Custom text',
                    x: 200,
                    y: 150,
                    width: 300,
                    backgroundColor: '#ff0000',
                    zIndex: 5,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);

            const slide = mockService.getSlideById(slideId);
            const element = slide?.elements[0] as any;

            expect(element?.content).toBe('Custom text');
            expect(element?.position).toEqual({ x: 200, y: 150 });
            expect(element?.size.width).toBe(300);
            expect(element?.backgroundColor).toBe('#ff0000');
            expect(element?.zIndex).toBe(5);
        });

        it('should use center positioning when no x,y provided', async () => {
            const result = await tool.execute(
                {
                    slideId,
                    content: 'Centered text',
                    width: 400,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);

            const slide = mockService.getSlideById(slideId);
            const element = slide?.elements[0] as any;

            // Should be centered: (1280 - 400) / 2 = 440
            expect(element?.position.x).toBe(440);
            // Should be centered: (720 - estimated_height) / 2
            expect(element?.position.y).toBeGreaterThan(0);
        });
    });

    // Overlap and boundary violations are reported by the linting system
    // after each edit, not by this tool.

    describe('Text Dimension Estimation', () => {
        it('should estimate and adjust height for long text', async () => {
            const longText =
                'This is a very long text that should wrap multiple lines and require height adjustment to fit properly within the specified width of the text element container.';

            const result = await tool.execute(
                {
                    slideId,
                    content: longText,
                    width: 200, // Narrow width to force wrapping
                },
                mockService as any,
            );

            expect(result.success).toBe(true);

            const slide = mockService.getSlideById(slideId);
            const element = slide?.elements[0] as any;

            // Height should be adjusted based on text wrapping
            expect(element?.size.height).toBeGreaterThan(50); // Should be taller than default
        });
    });

    describe('Error Handling', () => {
        it('should handle service failures gracefully', async () => {
            // Mock service to return null (simulating failure)
            const failingService = {
                ...mockService,
                addElement: jest.fn().mockReturnValue(null),
                getPresentation: jest
                    .fn()
                    .mockReturnValue(mockService.getPresentation()),
            };

            const result = await tool.execute(
                {
                    slideId,
                    content: 'Test text',
                },
                failingService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(
                `Failed to add element to slide with ID ${slideId}`,
            );
        });
    });

    describe('Integration Tests', () => {
        it('should handle multiple elements on same slide', async () => {
            // Add multiple elements
            const results = await Promise.all([
                tool.execute(
                    {
                        slideId,
                        content: 'Title',
                        x: 100,
                        y: 50,
                        fontSize: 24,
                    },
                    mockService as any,
                ),
                tool.execute(
                    {
                        slideId,
                        content: 'Subtitle',
                        x: 100,
                        y: 100,
                        fontSize: 16,
                    },
                    mockService as any,
                ),
                tool.execute(
                    {
                        slideId,
                        content: 'Body text',
                        x: 100,
                        y: 150,
                        fontSize: 12,
                    },
                    mockService as any,
                ),
            ]);

            // All should succeed
            results.forEach((result) => {
                expect(result.success).toBe(true);
            });

            // Slide should have 3 elements
            const slide = mockService.getSlideById(slideId);
            expect(slide?.elements).toHaveLength(3);
        });
    });
});
