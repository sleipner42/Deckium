import {
    elementNotFound,
    elementNotFoundInPresentation,
    elementsNotFound,
    slideNotFound,
    wrongElementType,
} from '../../main/ai/tools/utils/errors';
import { MockPresentationService } from './MockPresentationService';

describe('tool error helpers', () => {
    let mockService: MockPresentationService;

    beforeEach(() => {
        mockService = new MockPresentationService();
    });

    it('slideNotFound lists valid slide IDs with positions', () => {
        mockService.addSlide(mockService.createMockSlide({ id: 'a' }));
        mockService.addSlide(mockService.createMockSlide({ id: 'b' }));

        const message = slideNotFound('x', mockService.getPresentation());

        expect(message).toContain("Slide 'x' not found");
        expect(message).toContain('a (slide 1)');
        expect(message).toContain('b (slide 2)');
    });

    it('slideNotFound handles empty presentations', () => {
        const message = slideNotFound('x', mockService.getPresentation());
        expect(message).toContain('no slides');
    });

    it('elementNotFound lists element IDs and types on the slide', () => {
        const slide = mockService.addSlide(
            mockService.createMockSlide({ id: 's1' }),
        );
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'e1' }),
        );

        const message = elementNotFound('missing', slide);

        expect(message).toContain("Element 'missing' not found on slide 's1'");
        expect(message).toContain('e1 (textbox)');
    });

    it('elementsNotFound lists both missing and existing elements', () => {
        const slide = mockService.addSlide(
            mockService.createMockSlide({ id: 's1' }),
        );
        mockService.addElement(
            slide.id,
            mockService.createMockTextElement({ id: 'e1' }),
        );

        const message = elementsNotFound(['m1', 'm2'], slide);

        expect(message).toContain('m1, m2');
        expect(message).toContain('e1 (textbox)');
    });

    it('elementNotFoundInPresentation lists elements per slide', () => {
        const slide = mockService.addSlide(
            mockService.createMockSlide({ id: 's1' }),
        );
        mockService.addElement(
            slide.id,
            mockService.createMockImageElement({ id: 'img1' }),
        );

        const message = elementNotFoundInPresentation(
            'ghost',
            mockService.getPresentation(),
        );

        expect(message).toContain("Element 'ghost' not found");
        expect(message).toContain('img1 (image)');
    });

    it('wrongElementType states actual type and correct tool', () => {
        const element = mockService.createMockImageElement({ id: 'img1' });

        const message = wrongElementType(element, 'shape');

        expect(message).toContain("'img1' is a image, not a shape");
        expect(message).toContain('updateImageElement');
    });
});
