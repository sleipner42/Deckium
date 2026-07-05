import type {
    ContentElement,
    Presentation,
    Slide,
} from '../../../../common/domain/entities/types';

/**
 * Find an element by id across all slides of a presentation.
 *
 * Returns the element together with the slide it lives on (and that slide's
 * id), or null if no slide contains an element with the given id.
 */
export function findElement(
    presentation: Presentation,
    elementId: string,
): { element: ContentElement; slide: Slide; slideId: string } | null {
    for (const slide of presentation.slides) {
        const element = slide.elements.find((e) => e.id === elementId);
        if (element) {
            return { element, slide, slideId: slide.id };
        }
    }
    return null;
}
