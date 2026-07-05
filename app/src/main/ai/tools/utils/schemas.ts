import { z } from 'zod';

export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

export const COORDINATE_NOTE = `in pixels; the slide is ${SLIDE_WIDTH}x${SLIDE_HEIGHT}px with the origin (0,0) at the top-left corner`;

export const COLOR_DESCRIPTION =
    'CSS color. Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla to include opacity/transparency.';

export const colorSchema = z.string().describe(COLOR_DESCRIPTION);

export const positionReferenceSchema = z
    .enum(['top left', 'center'])
    .describe(
        "What the given x/y refer to on the element: its top-left corner ('top left', the default) or its center ('center')",
    );

export const zIndexSchema = z
    .number()
    .int()
    .min(0)
    .describe(
        'Z-index controlling stacking order; higher values appear on top. Background 0, content 1-3, titles 4-5, overlays 6+.',
    );

export function xSchema(detail = '') {
    return z.number().describe(`X position ${COORDINATE_NOTE}${detail}`);
}

export function ySchema(detail = '') {
    return z.number().describe(`Y position ${COORDINATE_NOTE}${detail}`);
}

export function widthSchema(detail = '') {
    return z.number().positive().describe(`Width in pixels${detail}`);
}

export function heightSchema(detail = '') {
    return z.number().positive().describe(`Height in pixels${detail}`);
}

export const elementIdsSchema = z
    .array(z.string())
    .min(1)
    .describe('Array of element IDs');

export const borderRadiusSchema = z
    .number()
    .min(0)
    .describe(
        'Corner radius in pixels. Use 8-16 for modern cards/panels, higher for pills. 0 = sharp corners.',
    );

export const opacitySchema = z
    .number()
    .min(0)
    .max(1)
    .describe(
        'Opacity from 0 (invisible) to 1 (solid). Use 0.05-0.15 for subtle background panels, 0.4-0.7 for scrims over images.',
    );

export const shadowSchema = z
    .enum(['none', 'soft', 'medium'])
    .describe(
        "Drop shadow preset: 'none' (flat), 'soft' (subtle card elevation), 'medium' (prominent floating card).",
    );
