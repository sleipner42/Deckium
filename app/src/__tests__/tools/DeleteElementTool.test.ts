import { DeleteElementTool } from '../../main/ai/tools/tools/DeleteElementTool';
import { MockPresentationService } from './MockPresentationService';

describe('DeleteElementTool', () => {
    let tool: DeleteElementTool;
    let mockService: MockPresentationService;
    let slideId: string;

    beforeEach(() => {
        tool = new DeleteElementTool();
        mockService = new MockPresentationService();

        // Add a test slide
        const slide = mockService.addSlide();
        slideId = slide.id;
    });

    describe('Parameter Validation', () => {
        it('should return error when elementId is missing', async () => {
            const result = await tool.execute({}, mockService as any);

            expect(result.success).toBe(false);
            expect(result.error).toBe('elementId is required');
        });

        it('should return error when element does not exist', async () => {
            const result = await tool.execute(
                {
                    elementId: 'non-existent-element',
                },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain(
                "Element 'non-existent-element' not found in the presentation",
            );
        });
    });

    describe('Element Deletion', () => {
        it('should successfully delete a text element', async () => {
            // Add an element to delete
            const element = mockService.createMockTextElement({
                content: 'Test element to delete',
            });
            mockService.addElement(slideId, element);

            // Verify element exists
            const slideBeforeDeletion = mockService.getSlideById(slideId);
            expect(slideBeforeDeletion?.elements).toHaveLength(1);

            // Delete the element
            const result = await tool.execute(
                {
                    elementId: element.id,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                elementId: element.id,
                slideId,
                elementType: 'textbox',
                message: 'textbox element deleted successfully',
            });

            // Verify element was removed
            const slideAfterDeletion = mockService.getSlideById(slideId);
            expect(slideAfterDeletion?.elements).toHaveLength(0);
        });

        it('should successfully delete an image element', async () => {
            // Add an image element to delete
            const element = mockService.createMockImageElement({
                content: 'https://example.com/test-image.jpg',
            });
            mockService.addElement(slideId, element);

            // Delete the element
            const result = await tool.execute(
                {
                    elementId: element.id,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data.elementType).toBe('image');
            expect(result.data.message).toBe(
                'image element deleted successfully',
            );

            // Verify element was removed
            const slide = mockService.getSlideById(slideId);
            expect(slide?.elements).toHaveLength(0);
        });

        it('should delete specific element from multiple elements', async () => {
            // Add multiple elements
            const element1 = mockService.createMockTextElement({
                content: 'Element 1',
            });
            const element2 = mockService.createMockTextElement({
                content: 'Element 2',
            });
            const element3 = mockService.createMockImageElement();

            mockService.addElement(slideId, element1);
            mockService.addElement(slideId, element2);
            mockService.addElement(slideId, element3);

            // Verify all elements exist
            const slideBeforeDeletion = mockService.getSlideById(slideId);
            expect(slideBeforeDeletion?.elements).toHaveLength(3);

            // Delete middle element
            const result = await tool.execute(
                {
                    elementId: element2.id,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);

            // Verify only the target element was removed
            const slideAfterDeletion = mockService.getSlideById(slideId);
            expect(slideAfterDeletion?.elements).toHaveLength(2);

            const remainingIds =
                slideAfterDeletion?.elements.map((el) => el.id) || [];
            expect(remainingIds).toContain(element1.id);
            expect(remainingIds).toContain(element3.id);
            expect(remainingIds).not.toContain(element2.id);
        });
    });

    describe('Cross-Slide Element Finding', () => {
        it('should find and delete element from any slide', async () => {
            // Add multiple slides
            const slide1 = mockService.addSlide();
            const slide2 = mockService.addSlide();

            // Add elements to different slides
            const element1 = mockService.createMockTextElement({
                content: 'Slide 1 element',
            });
            const element2 = mockService.createMockTextElement({
                content: 'Slide 2 element',
            });

            mockService.addElement(slide1.id, element1);
            mockService.addElement(slide2.id, element2);

            // Delete element from slide 2
            const result = await tool.execute(
                {
                    elementId: element2.id,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(result.data.slideId).toBe(slide2.id);

            // Verify element was removed from correct slide
            const updatedSlide1 = mockService.getSlideById(slide1.id);
            const updatedSlide2 = mockService.getSlideById(slide2.id);

            expect(updatedSlide1?.elements).toHaveLength(1); // Still has its element
            expect(updatedSlide2?.elements).toHaveLength(0); // Element removed
        });
    });

    describe('Service Integration', () => {
        it('should handle service deletion failure', async () => {
            // Add an element
            const element = mockService.createMockTextElement();
            mockService.addElement(slideId, element);

            // Mock service to return null (simulating failure)
            const failingService = {
                ...mockService,
                deleteElement: jest.fn().mockReturnValue(null),
                getPresentation: jest
                    .fn()
                    .mockReturnValue(mockService.getPresentation()),
            };

            const result = await tool.execute(
                {
                    elementId: element.id,
                },
                failingService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(
                `Failed to delete element with ID ${element.id}`,
            );
        });

        it('should call deleteElement method on service', async () => {
            const element = mockService.createMockTextElement();
            mockService.addElement(slideId, element);

            // Spy on the deleteElement method
            const deleteElementSpy = jest.spyOn(mockService, 'deleteElement');

            const result = await tool.execute(
                {
                    elementId: element.id,
                },
                mockService as any,
            );

            expect(result.success).toBe(true);
            expect(deleteElementSpy).toHaveBeenCalledWith(element.id);
        });
    });

    describe('Element Type Detection', () => {
        it('should correctly identify different element types in response', async () => {
            const testCases = [
                {
                    element: mockService.createMockTextElement(),
                    expectedType: 'textbox',
                    expectedMessage: 'textbox element deleted successfully',
                },
                {
                    element: mockService.createMockImageElement(),
                    expectedType: 'image',
                    expectedMessage: 'image element deleted successfully',
                },
            ];

            for (const testCase of testCases) {
                // Reset service for each test
                mockService.reset();
                const slide = mockService.addSlide();
                mockService.addElement(slide.id, testCase.element);

                const result = await tool.execute(
                    {
                        elementId: testCase.element.id,
                    },
                    mockService as any,
                );

                expect(result.success).toBe(true);
                expect(result.data.elementType).toBe(testCase.expectedType);
                expect(result.data.message).toBe(testCase.expectedMessage);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle deletion from empty slide gracefully', async () => {
            // Try to delete from empty slide
            const result = await tool.execute(
                {
                    elementId: 'non-existent',
                },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Element 'non-existent' not found");
        });

        it('should handle deletion when no slides exist', async () => {
            // Reset to have no slides
            mockService.reset();

            const result = await tool.execute(
                {
                    elementId: 'any-id',
                },
                mockService as any,
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Element 'any-id' not found");
        });
    });
});
