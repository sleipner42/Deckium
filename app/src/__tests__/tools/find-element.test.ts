import { findElement } from '../../main/ai/tools/utils/find-element';
import { MockPresentationService } from './MockPresentationService';

describe('findElement', () => {
    let mockService: MockPresentationService;

    beforeEach(() => {
        mockService = new MockPresentationService();
    });

    it('finds an element on the first slide', () => {
        const slide = mockService.addSlide(
            mockService.createMockSlide({ id: 's1' }),
        );
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'e1' }),
        );

        const result = findElement(mockService.getPresentation(), 'e1');

        expect(result).not.toBeNull();
        expect(result?.element.id).toBe('e1');
        expect(result?.slideId).toBe('s1');
        expect(result?.slide.id).toBe('s1');
    });

    it('finds an element on a later slide', () => {
        mockService.addSlide(mockService.createMockSlide({ id: 's1' }));
        const slide2 = mockService.addSlide(
            mockService.createMockSlide({ id: 's2' }),
        );
        mockService.addElement(
            slide2.id,
            mockService.createMockImageElement({ id: 'img1' }),
        );

        const result = findElement(mockService.getPresentation(), 'img1');

        expect(result).not.toBeNull();
        expect(result?.element.id).toBe('img1');
        expect(result?.element.type).toBe('image');
        expect(result?.slideId).toBe('s2');
    });

    it('returns null when the element does not exist', () => {
        const slide = mockService.addSlide(
            mockService.createMockSlide({ id: 's1' }),
        );
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'e1' }),
        );

        const result = findElement(mockService.getPresentation(), 'missing');

        expect(result).toBeNull();
    });
});
