import { PRESENTATION_DIMENSIONS } from '../../../common/utils/constants';

/**
 * The slide is a fixed {@link PRESENTATION_DIMENSIONS} design surface rendered
 * inside a `transform: scale(...)` container (SlideView) so it fits the window.
 * Element positions/sizes are stored in slide units. Mouse events arrive in
 * screen pixels, so any drag/resize delta must be converted back to slide units
 * before it is applied. These helpers are the single conversion boundary.
 */

/** The DOM node that carries the slide's `transform: scale()`. */
export function getSlideContainer(
    from: HTMLElement | null,
): HTMLElement | null {
    return from?.closest<HTMLElement>('[data-slide-container]') ?? null;
}

/**
 * The actual rendered scale, measured from the DOM rather than threaded as a
 * prop — so it can never drift from the applied CSS transform. Falls back to 1
 * if the container can't be measured.
 */
export function getRenderedScale(container: HTMLElement | null): number {
    if (!container) return 1;
    const renderedWidth = container.getBoundingClientRect().width;
    if (renderedWidth <= 0) return 1;
    return renderedWidth / PRESENTATION_DIMENSIONS.WIDTH;
}

/** Convert a screen-pixel delta to slide units at the given rendered scale. */
export function screenDeltaToSlide(
    dx: number,
    dy: number,
    scale: number,
): { x: number; y: number } {
    const safeScale = scale || 1;
    return { x: dx / safeScale, y: dy / safeScale };
}
