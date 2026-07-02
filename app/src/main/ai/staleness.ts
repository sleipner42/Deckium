import type {
    ContentElement,
    Presentation,
} from '../../common/domain/entities/types';

interface ElementSnapshot {
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
}

interface SlideSnapshot {
    background: string;
    elements: Record<string, ElementSnapshot>;
}

export interface PresentationSnapshot {
    slideOrder: string[];
    slides: Record<string, SlideSnapshot>;
}

export interface PresentationDiff {
    changedSlideIds: string[];
    summary: string;
}

function snapshotElement(element: ContentElement): ElementSnapshot {
    return {
        type: element.type,
        x: element.position.x,
        y: element.position.y,
        w: element.size.width,
        h: element.size.height,
        z: element.zIndex ?? 1,
    };
}

export function takeSnapshot(presentation: Presentation): PresentationSnapshot {
    const slides: Record<string, SlideSnapshot> = {};
    for (const slide of presentation.slides) {
        const elements: Record<string, ElementSnapshot> = {};
        for (const element of slide.elements) {
            elements[element.id] = snapshotElement(element);
        }
        slides[slide.id] = { background: slide.background, elements };
    }
    return {
        slideOrder: presentation.slides.map((slide) => slide.id),
        slides,
    };
}

/**
 * Compare the presentation as the agent last saw it with its current state.
 * Returns null when nothing changed; otherwise a human-readable summary of
 * user edits plus the IDs of changed slides (for fresh grid rendering).
 */
export function diffSnapshots(
    previous: PresentationSnapshot,
    current: PresentationSnapshot,
): PresentationDiff | null {
    const lines: string[] = [];
    const changedSlideIds = new Set<string>();

    const prevOrder = previous.slideOrder;
    const currOrder = current.slideOrder;

    for (const slideId of currOrder) {
        if (!prevOrder.includes(slideId)) {
            lines.push(`Slide ${slideId} was added.`);
            changedSlideIds.add(slideId);
        }
    }
    for (const slideId of prevOrder) {
        if (!currOrder.includes(slideId)) {
            lines.push(`Slide ${slideId} was deleted.`);
        }
    }

    const survivingPrevOrder = prevOrder.filter((id) => currOrder.includes(id));
    const survivingCurrOrder = currOrder.filter((id) => prevOrder.includes(id));
    if (survivingPrevOrder.join('|') !== survivingCurrOrder.join('|')) {
        lines.push(
            `Slides were reordered. New order: ${currOrder.join(', ')}.`,
        );
    }

    for (const slideId of currOrder) {
        const prevSlide = previous.slides[slideId];
        const currSlide = current.slides[slideId];
        if (!prevSlide || !currSlide) continue;

        if (prevSlide.background !== currSlide.background) {
            lines.push(
                `Slide ${slideId}: background changed to ${currSlide.background}.`,
            );
            changedSlideIds.add(slideId);
        }

        for (const [elementId, currElement] of Object.entries(
            currSlide.elements,
        )) {
            const prevElement = prevSlide.elements[elementId];
            if (!prevElement) {
                lines.push(
                    `Slide ${slideId}: ${currElement.type} element ${elementId} was added at (${currElement.x}, ${currElement.y}).`,
                );
                changedSlideIds.add(slideId);
                continue;
            }
            const changes: string[] = [];
            if (
                prevElement.x !== currElement.x ||
                prevElement.y !== currElement.y
            ) {
                changes.push(
                    `moved from (${prevElement.x}, ${prevElement.y}) to (${currElement.x}, ${currElement.y})`,
                );
            }
            if (
                prevElement.w !== currElement.w ||
                prevElement.h !== currElement.h
            ) {
                changes.push(
                    `resized from ${prevElement.w}x${prevElement.h} to ${currElement.w}x${currElement.h}`,
                );
            }
            if (prevElement.z !== currElement.z) {
                changes.push(
                    `z-index changed from ${prevElement.z} to ${currElement.z}`,
                );
            }
            if (changes.length > 0) {
                lines.push(
                    `Slide ${slideId}: ${currElement.type} element ${elementId} ${changes.join(', ')}.`,
                );
                changedSlideIds.add(slideId);
            }
        }

        for (const [elementId, prevElement] of Object.entries(
            prevSlide.elements,
        )) {
            if (!currSlide.elements[elementId]) {
                lines.push(
                    `Slide ${slideId}: ${prevElement.type} element ${elementId} was deleted.`,
                );
                changedSlideIds.add(slideId);
            }
        }
    }

    // Note: content/style-only edits (e.g. text changes) are not captured by
    // the geometric snapshot; the refreshed grid covers layout, and the model
    // can re-read content with getAllInfoAboutSlide when needed.

    if (lines.length === 0) {
        return null;
    }

    return {
        changedSlideIds: [...changedSlideIds],
        summary: lines.join('\n'),
    };
}
