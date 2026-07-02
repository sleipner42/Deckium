import type {
    ContentElement,
    Presentation,
    Slide,
} from '../../../../common/domain/entities/types';

const UPDATE_TOOL_BY_TYPE: Record<string, string> = {
    textbox: 'updateTextElement',
    rectangle: 'updateShape',
    circle: 'updateShape',
    triangle: 'updateShape',
    image: 'updateImageElement',
    barchart: 'updateBarChart',
    plot: 'updatePlot',
};

export function updateToolFor(elementType: string): string | undefined {
    return UPDATE_TOOL_BY_TYPE[elementType];
}

export function slideNotFound(
    slideId: string,
    presentation: Presentation,
): string {
    const validIds = presentation.slides
        .map((slide, index) => `${slide.id} (slide ${index + 1})`)
        .join(', ');
    return `Slide '${slideId}' not found. Valid slide IDs: ${validIds || 'none - the presentation has no slides'}.`;
}

export function elementNotFound(elementId: string, slide: Slide): string {
    const validIds = slide.elements
        .map((element) => `${element.id} (${element.type})`)
        .join(', ');
    return `Element '${elementId}' not found on slide '${slide.id}'. Elements on this slide: ${validIds || 'none'}.`;
}

export function elementsNotFound(missingIds: string[], slide: Slide): string {
    const validIds = slide.elements
        .map((element) => `${element.id} (${element.type})`)
        .join(', ');
    return `Elements not found on slide '${slide.id}': ${missingIds.join(', ')}. Elements on this slide: ${validIds || 'none'}.`;
}

export function elementNotFoundInPresentation(
    elementId: string,
    presentation: Presentation,
): string {
    const listing = presentation.slides
        .map((slide, index) => {
            const ids = slide.elements
                .map((element) => `${element.id} (${element.type})`)
                .join(', ');
            return `slide ${index + 1} (${slide.id}): ${ids || 'no elements'}`;
        })
        .join('; ');
    return `Element '${elementId}' not found in the presentation. Existing elements: ${listing || 'none'}.`;
}

export function wrongElementType(
    element: ContentElement,
    expected: string,
): string {
    const correctTool = updateToolFor(element.type);
    const hint = correctTool ? ` Use the ${correctTool} tool instead.` : '';
    return `Element '${element.id}' is a ${element.type}, not a ${expected}.${hint}`;
}
