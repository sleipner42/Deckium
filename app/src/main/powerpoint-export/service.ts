import { BrowserWindow, dialog } from 'electron';
import PptxGenJS from 'pptxgenjs';
import {
    BarChart,
    ContentElement,
    Image as ImageType,
    Plot,
    Presentation,
    Shape,
    TextBox,
} from '../../common/domain/entities/types';
import { getSecondWindow, setSlideInHiddenWindow } from '../main';
import { normalizeHex } from '../powerpoint/color';
import { quillHtmlToPptxRichText } from '../powerpoint/rich-text';
import { LAYOUT, pxToInch } from '../powerpoint/units';

// Plotly draws asynchronously; the hidden-window render ack (double-rAF +
// 100ms) can fire before the plot paints, so wait a little longer before
// capturing a slide that contains plots.
const PLOT_SETTLE_MS = 350;

const CHART_COLORS = [
    '0088CC',
    'FFCC00',
    '00AA44',
    'FF6600',
    'AA00FF',
    'FF0066',
];

interface InchRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Renders a slide offscreen at most once, on demand (for plot capture). */
type EnsureRendered = () => Promise<boolean>;

export class PowerPointExportService {
    async exportPresentation(
        presentation: Presentation,
        parentWindow?: BrowserWindow,
    ): Promise<void> {
        const pptx = new PptxGenJS();
        pptx.author = 'KraftPo';
        pptx.company = 'KraftPo Presentation Tool';
        pptx.title = presentation.title || 'Presentation';
        pptx.subject = 'Exported from KraftPo';

        // Layout matches the app canvas exactly at 96 DPI.
        pptx.defineLayout({
            name: LAYOUT.name,
            width: LAYOUT.width,
            height: LAYOUT.height,
        });
        pptx.layout = LAYOUT.name;

        for (const slide of presentation.slides) {
            const pptxSlide = pptx.addSlide();

            const background = normalizeHex(slide.background);
            if (background) {
                pptxSlide.background = { color: background };
            }

            let rendered = false;
            const ensureRendered: EnsureRendered = async () => {
                if (rendered) return true;
                const window = getSecondWindow();
                if (!window || window.isDestroyed()) return false;
                await setSlideInHiddenWindow(slide.id);
                await new Promise((r) => setTimeout(r, PLOT_SETTLE_MS));
                rendered = true;
                return true;
            };

            for (const element of slide.elements) {
                await this.convertElement(
                    pptxSlide,
                    element,
                    pptx,
                    ensureRendered,
                );
            }
        }

        const fileName = `${presentation.title || 'presentation'}.pptx`;
        const dialogOptions = {
            title: 'Export to PowerPoint',
            defaultPath: fileName,
            filters: [
                { name: 'PowerPoint Presentations', extensions: ['pptx'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        };
        const result = parentWindow
            ? await dialog.showSaveDialog(parentWindow, dialogOptions)
            : await dialog.showSaveDialog(dialogOptions);

        if (result.canceled || !result.filePath) {
            throw new Error('Export canceled by user');
        }

        await pptx.writeFile({ fileName: result.filePath });
    }

    private async convertElement(
        slide: PptxGenJS.Slide,
        element: ContentElement,
        pptx: PptxGenJS,
        ensureRendered: EnsureRendered,
    ): Promise<void> {
        const rect = this.toInchRect(element.position, element.size);

        switch (element.type) {
            case 'textbox':
                this.convertText(slide, element, rect);
                break;
            case 'rectangle':
            case 'circle':
            case 'triangle':
                this.convertShape(slide, element, rect, pptx);
                break;
            case 'image':
                this.convertImage(slide, element, rect);
                break;
            case 'barchart':
                this.convertChart(slide, element, rect, pptx);
                break;
            case 'plot':
                await this.convertPlot(slide, element, rect, ensureRendered);
                break;
            default:
                break;
        }
    }

    private toInchRect(
        position: { x: number; y: number },
        size: { width: number; height: number },
    ): InchRect {
        return {
            x: pxToInch(position.x),
            y: pxToInch(position.y),
            w: pxToInch(size.width),
            h: pxToInch(size.height),
        };
    }

    private convertText(
        slide: PptxGenJS.Slide,
        element: TextBox,
        rect: InchRect,
    ): void {
        const runs = quillHtmlToPptxRichText(element.content || '');
        const options: PptxGenJS.TextPropsOptions = {
            ...rect,
            valign: element.verticalAlign || 'top',
            wrap: true,
            autoFit: false,
        };

        const fill = normalizeHex(element.backgroundColor);
        if (fill) options.fill = { color: fill };
        if (element.borderRadius && element.borderRadius > 0) {
            options.rectRadius = element.borderRadius;
        }

        slide.addText(
            runs.length ? runs : [{ text: '', options: {} }],
            options,
        );
    }

    private convertShape(
        slide: PptxGenJS.Slide,
        element: Shape,
        rect: InchRect,
        pptx: PptxGenJS,
    ): void {
        const shapeType = {
            rectangle: pptx.ShapeType.rect,
            circle: pptx.ShapeType.ellipse,
            triangle: pptx.ShapeType.triangle,
        }[element.type];

        const options: PptxGenJS.ShapeProps = { ...rect };

        const fill = normalizeHex(element.fillColor);
        options.fill = { color: fill ?? 'FFFFFF' };

        const stroke = normalizeHex(element.strokeColor);
        if (stroke && element.strokeWidth && element.strokeWidth > 0) {
            options.line = {
                color: stroke,
                width: Math.max(element.strokeWidth, 1),
            };
        }

        slide.addShape(shapeType, options);
    }

    private convertImage(
        slide: PptxGenJS.Slide,
        element: ImageType,
        rect: InchRect,
    ): void {
        if (element.content?.startsWith('data:')) {
            slide.addImage({ data: element.content, ...rect });
        }
    }

    private convertChart(
        slide: PptxGenJS.Slide,
        element: BarChart,
        rect: InchRect,
        pptx: PptxGenJS,
    ): void {
        const data = this.chartData(element);
        slide.addChart(pptx.ChartType.bar, data, {
            ...rect,
            chartColors: CHART_COLORS,
            showLegend: true,
            legendPos: 'r',
            barGrouping: 'clustered',
            catAxisTitle: element.xAxisLabel || '',
            valAxisTitle: element.yAxisLabel || '',
            showTitle: !!element.title,
            title: element.title || 'Bar Chart',
            titleColor: '000000',
            titleFontSize: 14,
        });
    }

    private chartData(element: BarChart): PptxGenJS.IChartMulti['data'] {
        const { x, y } = element.data ?? { x: [], y: [] };
        return [
            {
                name: element.title || 'Data Series',
                labels: (x ?? []).map((item) => String(item)),
                values: (y ?? []).map((item) => Number(item) || 0),
            },
        ];
    }

    private async convertPlot(
        slide: PptxGenJS.Slide,
        element: Plot,
        rect: InchRect,
        ensureRendered: EnsureRendered,
    ): Promise<void> {
        const png = (await ensureRendered())
            ? await this.capturePlot(element)
            : null;

        if (png) {
            slide.addImage({ data: png, ...rect });
            return;
        }

        // Fallback: the offscreen window was unavailable or capture failed.
        slide.addText(`Plot: ${element.plotType ?? 'chart'}`, {
            ...rect,
            fontSize: 14,
            align: 'center',
            valign: 'middle',
            fill: { color: 'F8F9FA' },
            color: '666666',
            line: { color: 'CCCCCC', width: 1 },
        });
    }

    private async capturePlot(element: Plot): Promise<string | null> {
        const window = getSecondWindow();
        if (!window || window.isDestroyed()) return null;
        try {
            const image = await window.webContents.capturePage({
                x: Math.round(element.position.x),
                y: Math.round(element.position.y),
                width: Math.round(element.size.width),
                height: Math.round(element.size.height),
            });
            return `data:image/png;base64,${image.toPNG().toString('base64')}`;
        } catch {
            return null;
        }
    }
}
