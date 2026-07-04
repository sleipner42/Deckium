import { PRESENTATION_DIMENSIONS } from '../../../common/utils/constants';
import {
    getRenderedScale,
    getSlideContainer,
    screenDeltaToSlide,
} from './coordinates';

function fakeContainer(renderedWidth: number): HTMLElement {
    return {
        getBoundingClientRect: () => ({ width: renderedWidth }) as DOMRect,
    } as unknown as HTMLElement;
}

describe('coordinates', () => {
    describe('getRenderedScale', () => {
        it('derives scale from the rendered width vs the slide width', () => {
            const half = fakeContainer(PRESENTATION_DIMENSIONS.WIDTH / 2);
            expect(getRenderedScale(half)).toBeCloseTo(0.5);

            const full = fakeContainer(PRESENTATION_DIMENSIONS.WIDTH);
            expect(getRenderedScale(full)).toBeCloseTo(1);
        });

        it('falls back to 1 for a missing or zero-width container', () => {
            expect(getRenderedScale(null)).toBe(1);
            expect(getRenderedScale(fakeContainer(0))).toBe(1);
        });
    });

    describe('screenDeltaToSlide', () => {
        it('divides screen deltas by scale to get slide units', () => {
            // At 0.5 zoom, a 50px screen move is a 100-unit slide move.
            expect(screenDeltaToSlide(50, 30, 0.5)).toEqual({ x: 100, y: 60 });
        });

        it('is identity at scale 1', () => {
            expect(screenDeltaToSlide(12, -8, 1)).toEqual({ x: 12, y: -8 });
        });

        it('guards against a zero scale', () => {
            expect(screenDeltaToSlide(10, 10, 0)).toEqual({ x: 10, y: 10 });
        });
    });

    describe('getSlideContainer', () => {
        it('returns null for a null node', () => {
            expect(getSlideContainer(null)).toBeNull();
        });
    });
});
