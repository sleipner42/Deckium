import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    type Chart,
    type Element,
    type Fill,
    type Shape as PptxShape,
    type Slide as PptxSlide,
    type Text as PptxText,
    parse,
} from 'pptxtojson';
import { v4 as uuidv4 } from 'uuid';
import {
    BarChart,
    ContentElement,
    Image as ImageElement,
    Presentation,
    Shape,
    Slide,
    TextBox,
} from '../../common/domain/entities/types';
import { normalizeHex } from '../powerpoint/color';
import { pptxContentToQuillHtml } from '../powerpoint/rich-text';
import {
    type Letterbox,
    letterbox,
    mapPoint,
    mapSize,
    ptToPx,
} from '../powerpoint/units';

export interface ImportResult {
    success: boolean;
    presentation?: Presentation;
    error?: string;
}

export interface ImportProgress {
    stage: string;
    progress: number; // 0-100
    message: string;
}

// Default source slide size in points (4:3) when the file omits it.
const DEFAULT_SLIDE_PT = { width: 720, height: 540 };

export class PowerPointImportService {
    private progressCallback?: (progress: ImportProgress) => void;

    setProgressCallback(callback: (progress: ImportProgress) => void) {
        this.progressCallback = callback;
    }

    private reportProgress(stage: string, progress: number, message: string) {
        this.progressCallback?.({ stage, progress, message });
    }

    async importPowerPointFile(filePath: string): Promise<ImportResult> {
        try {
            this.reportProgress('validation', 0, 'Validating file...');
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'File does not exist' };
            }
            if (path.extname(filePath).toLowerCase() !== '.pptx') {
                return { success: false, error: 'File must be a .pptx file' };
            }

            this.reportProgress('parsing', 10, 'Reading PowerPoint file...');
            const buffer = fs.readFileSync(filePath);
            const arrayBuffer = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength,
            );
            const pptx = await parse(arrayBuffer);

            this.reportProgress('conversion', 30, 'Converting slides...');
            const presentation = this.convert(pptx, filePath);

            this.reportProgress('complete', 100, 'Import completed');
            return { success: true, presentation };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private convert(
        pptx: Awaited<ReturnType<typeof parse>>,
        filePath: string,
    ): Presentation {
        // Source geometry is in points; fit it onto the app canvas preserving
        // aspect ratio (letterbox) rather than stretching X and Y separately.
        const srcW = pptx.size?.width || DEFAULT_SLIDE_PT.width;
        const srcH = pptx.size?.height || DEFAULT_SLIDE_PT.height;
        const lb = letterbox(ptToPx(srcW), ptToPx(srcH));

        const slides: Slide[] = (pptx.slides ?? []).map((slide, i) => {
            this.reportProgress(
                'conversion',
                30 + ((i + 1) / Math.max(pptx.slides.length, 1)) * 60,
                `Converting slide ${i + 1}...`,
            );
            return this.convertSlide(slide, lb);
        });

        return {
            id: uuidv4(),
            title:
                path.basename(filePath, path.extname(filePath)) || 'Imported',
            slides,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    private convertSlide(slide: PptxSlide, lb: Letterbox): Slide {
        const elements: ContentElement[] = [];
        for (const element of slide.elements ?? []) {
            this.collect(element, lb, 0, 0, elements);
        }
        const bg = this.fillHex(slide.fill);
        return {
            id: uuidv4(),
            elements,
            background: bg ? `#${bg}` : '#FFFFFF',
        };
    }

    /** Flatten groups, accumulating their point-space offset. */
    private collect(
        element: Element,
        lb: Letterbox,
        offX: number,
        offY: number,
        out: ContentElement[],
    ): void {
        if (element.type === 'group') {
            for (const child of element.elements) {
                this.collect(
                    child,
                    lb,
                    offX + element.left,
                    offY + element.top,
                    out,
                );
            }
            return;
        }
        const converted = this.convertElement(element, lb, offX, offY);
        if (converted) out.push(converted);
    }

    private convertElement(
        element: Element,
        lb: Letterbox,
        offX: number,
        offY: number,
    ): ContentElement | null {
        const base = {
            id: uuidv4(),
            position: mapPoint(element.left + offX, element.top + offY, lb),
            size: mapSize(element.width, element.height, lb),
            zIndex: element.order ?? 1,
        };

        switch (element.type) {
            case 'text':
                return this.convertText(element, base, lb.scale);
            case 'shape':
                // pptxtojson emits text boxes as shapes carrying HTML content;
                // a shape with text is a textbox, an empty one is a shape.
                return element.content?.trim()
                    ? this.convertText(element, base, lb.scale)
                    : this.convertShape(element, base);
            case 'image':
                return this.convertImage(element, base);
            case 'chart':
                return this.convertChart(element, base);
            default:
                // table / video / audio / diagram / math have no model type.
                return null;
        }
    }

    private convertText(
        element: PptxText | PptxShape,
        base: Omit<TextBox, 'type' | 'content' | 'verticalAlign'>,
        fontScale: number,
    ): TextBox {
        const bg = this.fillHex(element.fill);
        return {
            ...base,
            type: 'textbox',
            content: pptxContentToQuillHtml(element.content || '', fontScale),
            backgroundColor: bg ? `#${bg}` : undefined,
            borderRadius: 0,
            verticalAlign: this.vAlign(element.vAlign),
        };
    }

    private convertShape(
        element: PptxShape,
        base: Omit<Shape, 'type' | 'fillColor' | 'strokeColor' | 'strokeWidth'>,
    ): Shape {
        const fill = this.fillHex(element.fill);
        const stroke = normalizeHex(element.borderColor);
        return {
            ...base,
            type: this.shapeType(element.shapType),
            fillColor: fill ? `#${fill}` : '#FFFFFF',
            strokeColor: stroke ? `#${stroke}` : '#000000',
            strokeWidth: element.borderWidth || 0,
        };
    }

    private convertImage(
        element: Extract<Element, { type: 'image' }>,
        base: Omit<ImageElement, 'type' | 'content'>,
    ): ImageElement | null {
        if (!element.src) return null;
        return { ...base, type: 'image', content: element.src };
    }

    private convertChart(
        element: Chart,
        base: Omit<
            BarChart,
            'type' | 'data' | 'title' | 'xAxisLabel' | 'yAxisLabel'
        >,
    ): BarChart {
        const { x, y, title } = this.chartData(element);
        return {
            ...base,
            type: 'barchart',
            data: { x, y },
            title,
            xAxisLabel: '',
            yAxisLabel: '',
        };
    }

    private chartData(element: Chart): {
        x: (string | number)[];
        y: number[];
        title: string;
    } {
        // Scatter/bubble carry parallel number arrays ([number[], number[]]);
        // every other chart is a list of {key, values:[{x,y}]} series. The app
        // chart holds a single series.
        const first = element.data[0];
        if (Array.isArray(first)) {
            const [xs, ys] = element.data as [number[], number[]];
            return { x: xs ?? [], y: ys ?? [], title: 'Imported Chart' };
        }
        if (!first) {
            return { x: [], y: [], title: 'Imported Chart' };
        }
        // values[].x are point indices; the human category labels live in
        // xlabels keyed by that index.
        return {
            x: first.values.map((v) => first.xlabels?.[String(v.x)] ?? v.x),
            y: first.values.map((v) => v.y),
            title: first.key || 'Imported Chart',
        };
    }

    private fillHex(fill?: Fill): string | undefined {
        return fill && fill.type === 'color'
            ? normalizeHex(fill.value)
            : undefined;
    }

    private shapeType(shapType?: string): 'rectangle' | 'circle' | 'triangle' {
        switch ((shapType || '').toLowerCase()) {
            case 'ellipse':
            case 'circle':
            case 'oval':
                return 'circle';
            case 'triangle':
            case 'righttriangle':
                return 'triangle';
            default:
                return 'rectangle';
        }
    }

    private vAlign(vAlign?: string): 'top' | 'middle' | 'bottom' {
        switch ((vAlign || '').toLowerCase()) {
            case 'mid':
            case 'middle':
            case 'ctr':
                return 'middle';
            case 'down':
            case 'bottom':
            case 'b':
                return 'bottom';
            default:
                return 'top';
        }
    }
}
