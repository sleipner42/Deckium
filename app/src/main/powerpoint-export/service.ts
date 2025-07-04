import PptxGenJS from 'pptxgenjs';
import { BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
    BarChart,
    ContentElement,
    Image as ImageType,
    Presentation,
    Shape,
    TextBox,
} from '../../common/domain/entities/types';

export class PowerPointExportService {
    async exportPresentation(
        presentation: Presentation,
        parentWindow?: BrowserWindow,
    ): Promise<void> {
        const pptx = new PptxGenJS();

        // Set presentation properties
        pptx.author = 'KraftPo';
        pptx.company = 'KraftPo Presentation Tool';
        pptx.title = presentation.title || 'Presentation';
        pptx.subject = 'Exported from KraftPo';

        // Set slide size to match our presentation dimensions (16:9 aspect ratio)
        pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
        pptx.layout = 'LAYOUT_16x9';

        // Convert each slide
        for (const slide of presentation.slides) {
            const pptxSlide = pptx.addSlide();

            // Set slide background
            if (slide.background && slide.background !== 'transparent') {
                pptxSlide.background = {
                    color: slide.background.replace('#', ''),
                };
            }

            // Convert each element
            for (const element of slide.elements) {
                await this.convertElement(pptxSlide, element);
            }
        }

        // Save the file using Electron's dialog and fs
        const fileName = `${presentation.title || 'presentation'}.pptx`;

        try {
            // Show save dialog
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

            // Generate the PowerPoint file as a buffer
            const pptxBuffer = await this.generatePptxBuffer(pptx);

            // Write the buffer to the selected file path
            fs.writeFileSync(result.filePath, pptxBuffer);

            console.log(
                `PowerPoint exported successfully to: ${result.filePath}`,
            );
        } catch (error) {
            console.error('Error saving PowerPoint file:', error);
            throw error;
        }
    }

    private async generatePptxBuffer(pptx: PptxGenJS): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                // Use writeFile method to generate the buffer
                pptx.writeFile({
                    fileName: 'temp.pptx',
                    outputType: 'stream',
                })
                    .then((data: any) => {
                        if (data instanceof ArrayBuffer) {
                            resolve(Buffer.from(data));
                        } else if (Buffer.isBuffer(data)) {
                            resolve(data);
                        } else if (data instanceof Uint8Array) {
                            resolve(Buffer.from(data));
                        } else if (data && data.buffer) {
                            resolve(Buffer.from(data.buffer));
                        } else {
                            // Try alternative approach with base64
                            pptx.writeFile({
                                fileName: 'temp.pptx',
                                outputType: 'base64',
                            })
                                .then((base64Data: string) => {
                                    resolve(Buffer.from(base64Data, 'base64'));
                                })
                                .catch(reject);
                        }
                    })
                    .catch((error: any) => {
                        // Fallback: try the stream method
                        try {
                            pptx.stream((streamData: any) => {
                                if (streamData instanceof ArrayBuffer) {
                                    resolve(Buffer.from(streamData));
                                } else if (Buffer.isBuffer(streamData)) {
                                    resolve(streamData);
                                } else if (streamData instanceof Uint8Array) {
                                    resolve(Buffer.from(streamData));
                                } else {
                                    reject(
                                        new Error(
                                            'Unable to generate PowerPoint buffer',
                                        ),
                                    );
                                }
                            });
                        } catch (streamError) {
                            reject(
                                new Error(
                                    `PowerPoint generation failed: ${error.message || error}`,
                                ),
                            );
                        }
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    private async convertElement(
        slide: any,
        element: ContentElement,
    ): Promise<void> {
        const position = this.convertPosition(element.position, element.size);

        try {
            switch (element.type) {
                case 'textbox':
                    this.convertTextElement(
                        slide,
                        element as TextBox,
                        position,
                    );
                    break;
                case 'rectangle':
                case 'circle':
                case 'triangle':
                    this.convertShapeElement(slide, element as Shape, position);
                    break;
                case 'image':
                    await this.convertImageElement(
                        slide,
                        element as ImageType,
                        position,
                    );
                    break;
                case 'barchart':
                    this.convertChartElement(
                        slide,
                        element as BarChart,
                        position,
                    );
                    break;
                default:
                    console.warn(`Unsupported element type: ${element.type}`);
            }
        } catch (error) {
            console.error(`Error converting element ${element.type}:`, error);
        }
    }

    private convertTextElement(
        slide: any,
        element: TextBox,
        position: any,
    ): void {
        // Convert HTML content to plain text (basic conversion)
        const text = this.htmlToPlainText(element.content);

        const textOptions: any = {
            x: position.x,
            y: position.y,
            w: position.w,
            h: position.h,
            fontSize: 14,
            color: '000000',
            align: 'left',
            valign: this.convertVerticalAlign(element.verticalAlign),
            wrap: true,
            autoFit: false,
        };

        // Set background color if specified
        if (
            element.backgroundColor &&
            element.backgroundColor !== 'transparent'
        ) {
            textOptions.fill = {
                color: element.backgroundColor.replace('#', ''),
            };
        }

        // Set border radius if specified
        if (element.borderRadius && element.borderRadius > 0) {
            textOptions.rectRadius = element.borderRadius;
        }

        slide.addText(text, textOptions);
    }

    private convertShapeElement(
        slide: any,
        element: Shape,
        position: any,
    ): void {
        const shapeType = this.mapShapeType(element.shapeType);

        const shapeOptions: any = {
            x: position.x,
            y: position.y,
            w: position.w,
            h: position.h,
        };

        // Set fill color
        if (element.fillColor && element.fillColor !== 'transparent') {
            shapeOptions.fill = { color: element.fillColor.replace('#', '') };
        }

        // Set stroke/border
        if (element.strokeColor && element.strokeWidth > 0) {
            shapeOptions.line = {
                color: element.strokeColor.replace('#', ''),
                width: element.strokeWidth,
            };
        }

        slide.addShape(shapeType, shapeOptions);
    }

    private async convertImageElement(
        slide: any,
        element: ImageType,
        position: any,
    ): Promise<void> {
        try {
            // Handle base64 images
            if (element.content.startsWith('data:')) {
                slide.addImage({
                    data: element.content,
                    x: position.x,
                    y: position.y,
                    w: position.w,
                    h: position.h,
                });
            } else {
                console.warn(
                    'Non-base64 images not supported in PowerPoint export',
                );
            }
        } catch (error) {
            console.error('Error adding image to slide:', error);
        }
    }

    private convertChartElement(
        slide: any,
        element: BarChart,
        position: any,
    ): void {
        try {
            // Convert chart data to PowerPoint format
            const chartData = this.convertChartData(element);

            slide.addChart('bar', chartData, {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
                title: element.title || 'Chart',
                showTitle: !!element.title,
                titleColor: '000000',
                titleFontSize: 14,
                showLegend: true,
                legendPos: 'r', // right
                showValue: false,
                catAxisTitle: element.xAxisLabel || '',
                valAxisTitle: element.yAxisLabel || '',
            });
        } catch (error) {
            console.error('Error converting chart:', error);
            // Fallback: add a text box indicating chart
            slide.addText(`Chart: ${element.title || 'Untitled Chart'}`, {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
                fontSize: 16,
                align: 'center',
                valign: 'middle',
                fill: { color: 'F0F0F0' },
                color: '666666',
            });
        }
    }

    private convertPosition(
        position: { x: number; y: number },
        size: { width: number; height: number },
    ) {
        // Convert from pixels to inches (PowerPoint uses inches)
        // Assuming 96 DPI and adjusting for slide dimensions
        const SLIDE_WIDTH_PX = 1920; // Your presentation width
        const SLIDE_HEIGHT_PX = 1080; // Your presentation height
        const PPTX_WIDTH_INCHES = 10;
        const PPTX_HEIGHT_INCHES = 5.625;

        return {
            x: (position.x / SLIDE_WIDTH_PX) * PPTX_WIDTH_INCHES,
            y: (position.y / SLIDE_HEIGHT_PX) * PPTX_HEIGHT_INCHES,
            w: (size.width / SLIDE_WIDTH_PX) * PPTX_WIDTH_INCHES,
            h: (size.height / SLIDE_HEIGHT_PX) * PPTX_HEIGHT_INCHES,
        };
    }

    private mapShapeType(shapeType: string): string {
        const shapeMap: { [key: string]: string } = {
            rectangle: 'rect',
            circle: 'ellipse',
            triangle: 'triangle',
        };
        return shapeMap[shapeType] || 'rect';
    }

    private convertVerticalAlign(align?: string): string {
        const alignMap: { [key: string]: string } = {
            top: 'top',
            middle: 'middle',
            bottom: 'bottom',
        };
        return alignMap[align || 'top'] || 'top';
    }

    private htmlToPlainText(html: string): string {
        // Basic HTML to text conversion
        // Remove HTML tags and decode common entities
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    private convertChartData(element: BarChart): any[] {
        try {
            // Parse the chart data if it's stored as JSON
            let data = element.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            // Convert to PptxGenJS chart format
            if (Array.isArray(data) && data.length > 0) {
                // Assume data is in format: [{ category: string, value: number }, ...]
                return data.map((item) => ({
                    name: item.category || item.name || 'Category',
                    labels: [item.category || item.name || 'Category'],
                    values: [Number(item.value) || 0],
                }));
            }

            // Fallback data
            return [
                {
                    name: 'Sample',
                    labels: ['Category 1', 'Category 2'],
                    values: [10, 20],
                },
            ];
        } catch (error) {
            console.error('Error parsing chart data:', error);
            return [{ name: 'Data Error', labels: ['Error'], values: [0] }];
        }
    }
}
