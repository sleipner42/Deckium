import type { BrowserWindow } from 'electron';
import type { Slide } from '../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../common/utils/constants';

export type GeometrySource = 'canvas' | 'thumbnail' | 'model';

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ElementGeometry {
    elementId: string;
    /** Where bounds/zIndex came from. */
    source: GeometrySource;
    /** Rendered outer bounds in slide coordinates (rounded). */
    bounds: Rect;
    zIndex: number;
    /** Textboxes: union of rendered .ql-editor child rects, slide coords. */
    textContentBounds?: Rect;
    /** 'model' when the Quill editor was missing or empty. */
    textSource?: GeometrySource;
}

export interface GeometrySnapshot {
    slideId: string;
    elements: Record<string, ElementGeometry>;
}

/**
 * Builds the single renderer-side script that measures every requested
 * element in one pass. Element ids are passed via JSON, never interpolated
 * into selectors. For elements rendered both on the editor canvas and in a
 * sidebar thumbnail, the canvas instance wins (full scale, no rounding
 * amplification).
 */
export function buildSnapshotScript(elementIds: string[]): string {
    return `
(async () => {
  const wanted = new Set(${JSON.stringify(elementIds)});
  // Two frames so React commits any just-applied AI edits before measuring —
  // raced against a timeout because rAF is throttled (or never fires) in
  // hidden/occluded windows and linting must never hang on visibility.
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 100);
  });

  const SLIDE_WIDTH = ${PRESENTATION_DIMENSIONS.WIDTH};
  const SLIDE_HEIGHT = ${PRESENTATION_DIMENSIONS.HEIGHT};

  const chosen = new Map();
  for (const node of document.querySelectorAll('[data-element-id]')) {
    const id = node.getAttribute('data-element-id');
    if (!wanted.has(id)) continue;
    const inThumbnail = !!node.closest('.slide-navigation');
    const previous = chosen.get(id);
    if (!previous || (previous.inThumbnail && !inThumbnail)) {
      chosen.set(id, { node, inThumbnail });
    }
  }

  const result = {};
  for (const [id, { node, inThumbnail }] of chosen) {
    const container = node.closest('[data-slide-container]');
    if (!container) continue;
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) continue;

    const scaleX = SLIDE_WIDTH / containerRect.width;
    const scaleY = SLIDE_HEIGHT / containerRect.height;
    const toSlideCoords = (rect) => ({
      x: Math.round((rect.left - containerRect.left) * scaleX),
      y: Math.round((rect.top - containerRect.top) * scaleY),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY),
    });

    let zIndex = parseInt(window.getComputedStyle(node).zIndex, 10);
    if (Number.isNaN(zIndex)) zIndex = 0;

    let textContentBounds = null;
    const qlEditor = node.querySelector('.ql-editor');
    if (qlEditor) {
      let minX = Infinity, minY = Infinity;
      let maxRight = -Infinity, maxBottom = -Infinity;
      let anyContent = false;
      for (const child of qlEditor.children) {
        const rect = child.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          anyContent = true;
          minX = Math.min(minX, rect.left);
          minY = Math.min(minY, rect.top);
          maxRight = Math.max(maxRight, rect.right);
          maxBottom = Math.max(maxBottom, rect.bottom);
        }
      }
      if (anyContent) {
        textContentBounds = toSlideCoords({
          left: minX,
          top: minY,
          width: maxRight - minX,
          height: maxBottom - minY,
        });
      }
    }

    result[id] = {
      elementId: id,
      source: inThumbnail ? 'thumbnail' : 'canvas',
      bounds: toSlideCoords(node.getBoundingClientRect()),
      zIndex,
      textContentBounds,
    };
  }
  return result;
})()`;
}

/**
 * Captures rendered geometry for every element of the slide in ONE renderer
 * round-trip, merging in model-derived fallbacks so no element is ever
 * silently skipped: elements missing from the DOM (or when the window is
 * unavailable) fall back to their model position/size.
 */
export async function captureGeometrySnapshot(
    win: BrowserWindow | null,
    slide: Slide,
): Promise<GeometrySnapshot> {
    let measured: Record<string, ElementGeometry> = {};

    if (win && !win.isDestroyed()) {
        try {
            measured = await win.webContents.executeJavaScript(
                buildSnapshotScript(slide.elements.map((e) => e.id)),
            );
        } catch (error) {
            console.warn(
                'Geometry snapshot failed, falling back to model data:',
                error,
            );
            measured = {};
        }
    }

    const elements: Record<string, ElementGeometry> = {};
    for (const element of slide.elements) {
        const modelBounds: Rect = {
            x: element.position.x,
            y: element.position.y,
            width: element.size.width,
            height: element.size.height,
        };

        const domGeometry = measured?.[element.id];
        const geometry: ElementGeometry = domGeometry
            ? { ...domGeometry }
            : {
                  elementId: element.id,
                  source: 'model',
                  bounds: modelBounds,
                  zIndex: element.zIndex || 1,
              };

        if (element.type === 'textbox' && !geometry.textContentBounds) {
            // Empty or unmeasurable text: the model rect keeps boundary
            // checks working while size-vs-container can never fire
            // (content bounds equal the container).
            geometry.textContentBounds = modelBounds;
            geometry.textSource = 'model';
        }

        elements[element.id] = geometry;
    }

    return { slideId: slide.id, elements };
}
