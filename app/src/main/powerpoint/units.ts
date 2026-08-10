import { PRESENTATION_DIMENSIONS } from '../../common/utils/constants';

// One source of truth for every PowerPoint coordinate conversion.
//
// PPTX/pptxgenjs work in inches; pptxtojson emits points; the app canvas is
// pixels. Everything here is anchored at 96 DPI, which is what makes the app's
// 1280x720 canvas map to PowerPoint's exact 16:9 "Widescreen" size
// (13.333in x 7.5in) and lets geometry and font sizes scale by the same factor.
const DPI = 96;
const PT_PER_INCH = 72;

/** px -> points (72pt = 1in = 96px). */
export const pxToPt = (px: number): number => (px * PT_PER_INCH) / DPI;

/** points -> px. */
export const ptToPx = (pt: number): number => (pt * DPI) / PT_PER_INCH;

/** px -> inches (pptxgenjs positioning unit). */
export const pxToInch = (px: number): number => px / DPI;

/** pptxgenjs layout matching the app canvas exactly at 96 DPI. */
export const LAYOUT = {
    name: 'DECKIUM_16x9',
    width: PRESENTATION_DIMENSIONS.WIDTH / DPI, // 13.333...
    height: PRESENTATION_DIMENSIONS.HEIGHT / DPI, // 7.5
};

export interface Letterbox {
    scale: number;
    offsetX: number;
    offsetY: number;
}

/**
 * Fit a source slide (given in app px) onto the canvas preserving aspect
 * ratio, centering the letterbox. A true 16:9 source yields scale 1 / no
 * offset; a 4:3 source is scaled down and centered instead of stretched.
 */
export const letterbox = (srcPxW: number, srcPxH: number): Letterbox => {
    const { WIDTH, HEIGHT } = PRESENTATION_DIMENSIONS;
    if (srcPxW <= 0 || srcPxH <= 0) {
        return { scale: 1, offsetX: 0, offsetY: 0 };
    }
    const scale = Math.min(WIDTH / srcPxW, HEIGHT / srcPxH);
    return {
        scale,
        offsetX: (WIDTH - srcPxW * scale) / 2,
        offsetY: (HEIGHT - srcPxH * scale) / 2,
    };
};

/** Map a point given in POINTS (pptxtojson) into canvas px, with letterbox. */
export const mapPoint = (
    ptX: number,
    ptY: number,
    lb: Letterbox,
): { x: number; y: number } => ({
    x: lb.offsetX + ptToPx(ptX) * lb.scale,
    y: lb.offsetY + ptToPx(ptY) * lb.scale,
});

/** Map a size given in POINTS (pptxtojson) into canvas px, with letterbox. */
export const mapSize = (
    ptW: number,
    ptH: number,
    lb: Letterbox,
): { width: number; height: number } => ({
    width: ptToPx(ptW) * lb.scale,
    height: ptToPx(ptH) * lb.scale,
});
