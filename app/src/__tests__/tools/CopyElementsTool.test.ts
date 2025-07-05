import { ContentElement } from '../../common/domain/entities/types';
import { CopyElementsTool } from '../../main/ai/tools/tools/CopyElementsTool';
import { MockPresentationService } from './MockPresentationService';

describe('CopyElementsTool', () => {
    let tool: CopyElementsTool;
    let mockPresentationService: MockPresentationService;

    beforeEach(() => {
        tool = new CopyElementsTool();
        mockPresentationService = new MockPresentationService();
    });

    const createTestElement = (id: string, type: string): ContentElement => ({
        id,
        type: type as any,
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        content: `Test ${type}`,
        zIndex: 1,
    });

    it('should copy specific elements by ID to target slide', async () => {
        // Setup presentation with two slides
        const sourceSlide = mockPresentationService.addSlide();
        const targetSlide = mockPresentationService.addSlide();

        // Add elements to source slide
        const element1 = createTestElement('elem1', 'textbox');
        const element2 = createTestElement('elem2', 'rectangle');
        mockPresentationService.addElement(sourceSlide.id, element1);
        mockPresentationService.addElement(sourceSlide.id, element2);

        // Copy specific element
        const result = await tool.execute(
            {
                targetSlideId: targetSlide.id,
                elementIds: ['elem1'],
                positionOffset: { x: 20, y: 20 },
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.copiedElementsCount).toBe(1);
        expect(result.data.copiedElementTypes).toEqual(['textbox']);
        expect(result.data.copiedElementIds).toEqual(['elem1']);
        expect(result.editedSlidesIds).toEqual([targetSlide.id]);

        // Verify element was copied to target slide
        const updatedPresentation = mockPresentationService.getPresentation();
        const updatedTargetSlide = updatedPresentation.slides.find(
            (s) => s.id === targetSlide.id,
        );
        expect(updatedTargetSlide?.elements).toHaveLength(1);
        expect(updatedTargetSlide?.elements[0].type).toBe('textbox');
        expect(updatedTargetSlide?.elements[0].position).toEqual({
            x: 120,
            y: 120,
        }); // Original + offset
    });

    it('should copy multiple elements by ID to target slide', async () => {
        // Setup presentation with two slides
        const sourceSlide = mockPresentationService.addSlide();
        const targetSlide = mockPresentationService.addSlide();

        // Add elements to source slide
        const element1 = createTestElement('elem1', 'textbox');
        const element2 = createTestElement('elem2', 'rectangle');
        mockPresentationService.addElement(sourceSlide.id, element1);
        mockPresentationService.addElement(sourceSlide.id, element2);

        // Copy all elements by specifying their IDs
        const result = await tool.execute(
            {
                targetSlideId: targetSlide.id,
                elementIds: ['elem1', 'elem2'],
                positionOffset: { x: 10, y: 10 },
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.copiedElementsCount).toBe(2);
        expect(result.data.copiedElementTypes).toEqual([
            'textbox',
            'rectangle',
        ]);
        expect(result.data.copiedElementIds).toEqual(['elem1', 'elem2']);

        // Verify elements were copied to target slide
        const updatedPresentation = mockPresentationService.getPresentation();
        const updatedTargetSlide = updatedPresentation.slides.find(
            (s) => s.id === targetSlide.id,
        );
        expect(updatedTargetSlide?.elements).toHaveLength(2);
    });

    it('should find elements across different slides', async () => {
        // Setup presentation with three slides
        const slide1 = mockPresentationService.addSlide();
        const slide2 = mockPresentationService.addSlide();
        const targetSlide = mockPresentationService.addSlide();

        // Add elements to different slides
        const element1 = createTestElement('elem1', 'textbox');
        const element2 = createTestElement('elem2', 'rectangle');
        mockPresentationService.addElement(slide1.id, element1);
        mockPresentationService.addElement(slide2.id, element2);

        // Copy elements from different source slides
        const result = await tool.execute(
            {
                targetSlideId: targetSlide.id,
                elementIds: ['elem1', 'elem2'],
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.copiedElementsCount).toBe(2);
        expect(result.data.sourceSlideIds).toEqual([slide1.id, slide2.id]);
    });

    it('should return error when target slide not found', async () => {
        const result = await tool.execute(
            {
                targetSlideId: 'nonexistent-slide',
                elementIds: ['elem1'],
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(
            'Target slide with ID nonexistent-slide not found',
        );
    });

    it('should return error when specific element not found', async () => {
        const targetSlide = mockPresentationService.addSlide();

        const result = await tool.execute(
            {
                targetSlideId: targetSlide.id,
                elementIds: ['nonexistent-element'],
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(
            'Element with ID nonexistent-element not found in any slide',
        );
    });

    it('should return error when elementIds is empty', async () => {
        const targetSlide = mockPresentationService.addSlide();

        const result = await tool.execute(
            {
                targetSlideId: targetSlide.id,
                elementIds: [],
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(
            'elementIds is required and must be a non-empty array',
        );
    });

    it('should return error when targetSlideId is missing', async () => {
        const result = await tool.execute(
            {
                elementIds: ['elem1'],
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('targetSlideId is required');
    });

    it('should return error when elementIds is missing', async () => {
        const targetSlide = mockPresentationService.addSlide();

        const result = await tool.execute(
            {
                targetSlideId: targetSlide.id,
            },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(
            'elementIds is required and must be a non-empty array',
        );
    });
});
