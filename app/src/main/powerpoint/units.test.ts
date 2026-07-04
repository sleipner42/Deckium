/**
 * @jest-environment node
 */
import {
    LAYOUT,
    letterbox,
    mapPoint,
    mapSize,
    ptToPx,
    pxToInch,
    pxToPt,
} from './units';

describe('unit conversions', () => {
    it('round-trips px <-> pt at 96 DPI', () => {
        expect(pxToPt(16)).toBe(12);
        expect(ptToPx(12)).toBe(16);
        expect(ptToPx(pxToPt(24))).toBeCloseTo(24, 6);
    });

    it('maps px to inches at 96 DPI', () => {
        expect(pxToInch(96)).toBe(1);
        expect(pxToInch(1280)).toBeCloseTo(13.3333, 3);
    });

    it('defines the layout as the exact 16:9 widescreen size', () => {
        expect(LAYOUT.width).toBeCloseTo(13.3333, 3);
        expect(LAYOUT.height).toBe(7.5);
    });
});

describe('letterbox', () => {
    it('is identity for a 16:9 source', () => {
        // 960x540 pt -> 1280x720 px
        const lb = letterbox(1280, 720);
        expect(lb).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    });

    it('centers a 4:3 source horizontally without stretching', () => {
        // 720x540 pt -> 960x720 px
        const lb = letterbox(960, 720);
        expect(lb.scale).toBe(1);
        expect(lb.offsetX).toBe(160);
        expect(lb.offsetY).toBe(0);
    });

    it('scales down and centers an oversized source', () => {
        const lb = letterbox(2560, 1440);
        expect(lb.scale).toBe(0.5);
        expect(lb.offsetX).toBe(0);
        expect(lb.offsetY).toBe(0);
    });

    it('clamps a tall source by height', () => {
        const lb = letterbox(720, 720);
        expect(lb.scale).toBe(1);
        expect(lb.offsetX).toBe(280);
    });

    it('is safe for degenerate sizes', () => {
        expect(letterbox(0, 0)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    });
});

describe('mapPoint / mapSize', () => {
    it('maps a point at the origin of a 4:3 source into the letterbox', () => {
        const lb = letterbox(960, 720);
        expect(mapPoint(0, 0, lb)).toEqual({ x: 160, y: 0 });
    });

    it('converts point sizes to px preserving aspect for 4:3', () => {
        const lb = letterbox(960, 720);
        // a 72pt (=96px) square stays square
        const s = mapSize(72, 72, lb);
        expect(s.width).toBe(96);
        expect(s.height).toBe(96);
    });
});
