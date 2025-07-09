import { BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as html2pptxgenjs from 'html2pptxgenjs';
import * as path from 'path';
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
import { PRESENTATION_DIMENSIONS } from '../../common/utils/constants';

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
                await this.convertElement(pptxSlide, element, pptx);
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

            // Generate the PowerPoint file directly to the selected path
            await this.savePptxFile(pptx, result.filePath);

            console.log(
                `PowerPoint exported successfully to: ${result.filePath}`,
            );
        } catch (error) {
            console.error('Error saving PowerPoint file:', error);
            throw error;
        }
    }

    private async savePptxFile(
        pptx: PptxGenJS,
        filePath: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Use writeFile with the actual file path - this creates a working file
                pptx.writeFile({ fileName: filePath })
                    .then(() => {
                        resolve();
                    })
                    .catch((error: any) => {
                        // Fallback: try with just the filename (creates temp file) then copy
                        const tempFileName = 'temp_export.pptx';
                        pptx.writeFile({ fileName: tempFileName })
                            .then(() => {
                                try {
                                    // Copy the temp file to the desired location
                                    if (fs.existsSync(tempFileName)) {
                                        fs.copyFileSync(tempFileName, filePath);
                                        fs.unlinkSync(tempFileName); // Clean up temp file
                                        resolve();
                                    } else {
                                        reject(
                                            new Error(
                                                'Temp file was not created',
                                            ),
                                        );
                                    }
                                } catch (copyError) {
                                    reject(copyError);
                                }
                            })
                            .catch(reject);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    private async convertElement(
        slide: any,
        element: ContentElement,
        pptx: PptxGenJS,
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
                    this.convertShapeElement(
                        slide,
                        element as Shape,
                        position,
                        pptx,
                    );
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
                        pptx,
                    );
                    break;
                case 'plot':
                    await this.convertPlotToImage(slide, element, position);
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
        try {
            // Preprocess Quill HTML to make it compatible with html2pptxgenjs
            const processedHtml = this.preprocessQuillHtml(element.content);

            // Use html2pptxgenjs to convert HTML to PowerPoint text
            const richTextArray = html2pptxgenjs.htmlToPptxText(processedHtml);

            const textOptions: any = {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
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

            // Add rich text to slide
            slide.addText(richTextArray, textOptions);
            console.log('Added rich text with html2pptxgenjs:', richTextArray);
        } catch (error) {
            console.error(
                'Error converting HTML with html2pptxgenjs, falling back to plain text:',
                error,
            );

            // Fallback to plain text if html2pptxgenjs fails
            const plainText = this.htmlToPlainText(element.content);
            const fallbackOptions: any = {
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

            if (
                element.backgroundColor &&
                element.backgroundColor !== 'transparent'
            ) {
                fallbackOptions.fill = {
                    color: element.backgroundColor.replace('#', ''),
                };
            }

            slide.addText(plainText, fallbackOptions);
        }
    }

    // Removed complex list handling - now handled by html2pptxgenjs

    // Removed - no longer needed with html2pptxgenjs
    // private groupConsecutiveListItems(...)

    // Removed - no longer needed with html2pptxgenjs
    // private extractListSegments(...)

    private convertShapeElement(
        slide: any,
        element: Shape,
        position: any,
        pptx: PptxGenJS,
    ): void {
        try {
            // Use the correct PptxGenJS ShapeType constants
            const shapeType = this.getCorrectShapeType(element.type, pptx);

            const shapeOptions: any = {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
            };

            // For circles/ellipses, preserve the original dimensions
            // Don't force them to be perfect circles if the user made them oval-shaped

            // Set fill color
            if (element.fillColor && element.fillColor !== 'transparent') {
                shapeOptions.fill = {
                    color: element.fillColor.replace('#', ''),
                };
            } else {
                // Default fill for visibility
                shapeOptions.fill = { color: 'FFFFFF' };
            }

            // Set stroke/border
            if (
                element.strokeColor &&
                element.strokeWidth &&
                element.strokeWidth > 0
            ) {
                shapeOptions.line = {
                    color: element.strokeColor.replace('#', ''),
                    width: Math.max(element.strokeWidth, 1), // Ensure minimum width
                };
            } else {
                // Default border for visibility
                shapeOptions.line = {
                    color: '000000',
                    width: 1,
                };
            }

            // Add the shape using the correct constant
            console.log(
                `Adding shape: ${element.type} -> ${shapeType} with options:`,
                JSON.stringify(shapeOptions, null, 2),
            );
            slide.addShape(shapeType, shapeOptions);
            console.log(`Successfully added shape: ${shapeType}`);
        } catch (error) {
            console.error(`Error adding shape ${element.type}:`, error);
            // Fallback: create a text placeholder
            slide.addText(`${element.type.toUpperCase()} SHAPE`, {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
                fontSize: 12,
                align: 'center',
                valign: 'middle',
                fill: { color: 'F0F0F0' },
                color: '666666',
                border: { color: '999999', width: 1 },
            });
        }
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
        pptx: PptxGenJS,
    ): void {
        try {
            // Convert chart data to PptxGenJS format
            const chartData = this.convertChartData(element);

            // Chart options for PptxGenJS
            const chartOptions: any = {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
                chartColors: [
                    '0088CC',
                    'FFCC00',
                    '00AA44',
                    'FF6600',
                    'AA00FF',
                    'FF0066',
                ],
                showLegend: true,
                legendPos: 'r', // right
                showValue: false,
                barGrouping: 'clustered', // clustered bars
                catAxisTitle: element.xAxisLabel || '',
                valAxisTitle: element.yAxisLabel || '',
                title: element.title || 'Bar Chart',
                showTitle: !!element.title,
                titleColor: '000000',
                titleFontSize: 14,
            };

            // Add the chart using PptxGenJS ChartType
            slide.addChart(pptx.ChartType.bar, chartData, chartOptions);
            console.log('Successfully added bar chart:', element.title);
        } catch (error) {
            console.error('Error converting chart to PowerPoint:', error);
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

    private async convertPlotToImage(
        slide: any,
        element: Plot,
        position: any,
    ): Promise<void> {
        try {
            // Create a placeholder image or convert plot to image
            // For now, we'll create a simple placeholder since plot rendering is complex

            // Option 1: Create a placeholder
            const placeholderText = `Plot: ${element.title || 'Mathematical Plot'}`;
            slide.addText(placeholderText, {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
                fontSize: 14,
                align: 'center',
                valign: 'middle',
                fill: { color: 'F8F9FA' },
                color: '666666',
                border: { color: 'CCCCCC', width: 1 },
            });

            // TODO: For future enhancement, we could:
            // 1. Render the plot to canvas using the plot data
            // 2. Convert canvas to base64 image
            // 3. Add the image to the slide using slide.addImage()

            console.log('Plot converted to placeholder text:', element.title);
        } catch (error) {
            console.error('Error converting plot to image:', error);
            // Fallback to a simple text placeholder
            slide.addText('Plot Element', {
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
        // Using actual presentation dimensions from constants
        const SLIDE_WIDTH_PX = PRESENTATION_DIMENSIONS.WIDTH;
        const SLIDE_HEIGHT_PX = PRESENTATION_DIMENSIONS.HEIGHT;
        const PPTX_WIDTH_INCHES = 10;
        const PPTX_HEIGHT_INCHES = 5.625;

        const result = {
            x: (position.x / SLIDE_WIDTH_PX) * PPTX_WIDTH_INCHES,
            y: (position.y / SLIDE_HEIGHT_PX) * PPTX_HEIGHT_INCHES,
            w: (size.width / SLIDE_WIDTH_PX) * PPTX_WIDTH_INCHES,
            h: (size.height / SLIDE_HEIGHT_PX) * PPTX_HEIGHT_INCHES,
        };

        console.log(
            `Position conversion: ${position.x},${position.y} (${size.width}x${size.height}) -> ${result.x.toFixed(2)},${result.y.toFixed(2)} (${result.w.toFixed(2)}x${result.h.toFixed(2)})`,
        );
        return result;
    }

    private getCorrectShapeType(shapeType: string, pptx: PptxGenJS): any {
        // Return the correct PptxGenJS ShapeType constant
        // Based on the official documentation: https://gitbrent.github.io/PptxGenJS/docs/api-shapes/
        const shapeMap: { [key: string]: any } = {
            rectangle: pptx.ShapeType.rect, // pres.ShapeType.rect
            circle: pptx.ShapeType.ellipse, // pres.ShapeType.ellipse
            triangle: pptx.ShapeType.triangle, // pres.ShapeType.triangle
        };

        const mappedType = shapeMap[shapeType];
        if (!mappedType) {
            console.warn(
                `Unknown shape type: ${shapeType}, defaulting to rect. Available types: ${Object.keys(shapeMap).join(', ')}`,
            );
            return pptx.ShapeType.rect;
        }

        console.log(`Mapping shape type: ${shapeType} -> ${mappedType}`);
        return mappedType;
    }

    private convertVerticalAlign(align?: string): string {
        const alignMap: { [key: string]: string } = {
            top: 'top',
            middle: 'middle',
            bottom: 'bottom',
        };
        return alignMap[align || 'top'] || 'top';
    }

    // Removed - no longer needed with html2pptxgenjs
    // private htmlToRichTextWithAlignment(...)

    // Removed - no longer needed with html2pptxgenjs
    // private processListsForPowerPoint(...)

    // Removed - no longer needed with html2pptxgenjs
    // private htmlToRichText(...)

    // Removed - no longer needed with html2pptxgenjs
    // private getFormattingForTag(...)

    // Removed - no longer needed with html2pptxgenjs
    // private mergeFormatting(...)

    // Removed - no longer needed with html2pptxgenjs
    // private parseParagraphAttributes(...)

    // Removed - no longer needed with html2pptxgenjs
    // private parseSpanAttributes(...)

    // Removed - no longer needed with html2pptxgenjs
    // private convertCssColorToHex(...)

    private convertChartData(element: BarChart): any[] {
        try {
            // Parse the chart data if it's stored as JSON
            let data = element.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            console.log('Converting chart data:', data);
            console.log('Data type:', typeof data);
            console.log('Is array:', Array.isArray(data));
            if (data && typeof data === 'object') {
                console.log('Object keys:', Object.keys(data));
                console.log('Has x property:', !!data.x);
                console.log('Has y property:', !!data.y);
                if (data.x) console.log('x is array:', Array.isArray(data.x));
                if (data.y) console.log('y is array:', Array.isArray(data.y));
            }

            // Convert to PptxGenJS chart format

            // Check if data has x and y arrays (object format: {x: [...], y: [...]})
            if (
                data &&
                typeof data === 'object' &&
                data.x &&
                data.y &&
                Array.isArray(data.x) &&
                Array.isArray(data.y)
            ) {
                console.log('Using x/y array format');
                return [
                    {
                        name: element.title || 'Data Series',
                        labels: data.x.map((item: any) => String(item)),
                        values: data.y.map((item: any) => Number(item) || 0),
                    },
                ];
            }

            if (Array.isArray(data) && data.length > 0) {
                // Handle array of objects format: [{ category: string, value: number }, ...]
                if (data[0] && typeof data[0] === 'object') {
                    return [
                        {
                            name: element.title || 'Data Series',
                            labels: data.map((item: any) =>
                                String(
                                    item.category ||
                                        item.name ||
                                        item.x ||
                                        'Category',
                                ),
                            ),
                            values: data.map(
                                (item: any) =>
                                    Number(item.value || item.y) || 0,
                            ),
                        },
                    ];
                }

                // Handle simple array format: [value1, value2, ...]
                if (typeof data[0] === 'number') {
                    return [
                        {
                            name: element.title || 'Data Series',
                            labels: data.map(
                                (_: any, index: number) => `Item ${index + 1}`,
                            ),
                            values: data.map((item: any) => Number(item) || 0),
                        },
                    ];
                }
            }

            // Fallback data if we can't parse the actual data
            console.warn('Could not parse chart data, using fallback data');
            return [
                {
                    name: element.title || 'Sample Data',
                    labels: ['Category 1', 'Category 2', 'Category 3'],
                    values: [10, 20, 15],
                },
            ];
        } catch (error) {
            console.error('Error parsing chart data:', error);
            // Fallback data for errors
            return [
                {
                    name: 'Data Error',
                    labels: ['Error'],
                    values: [0],
                },
            ];
        }
    }

    // Removed - no longer needed with html2pptxgenjs
    // private decodeHtmlEntities(...)

    /**
     * Preprocesses Quill HTML to make it compatible with html2pptxgenjs
     * Handles Quill-specific formatting and converts to standard HTML
     */
    private preprocessQuillHtml(html: string): string {
        let processed = html;

        // Remove Quill UI elements that interfere with conversion
        processed = processed.replace(/<span class="ql-ui"[^>]*><\/span>/g, '');

        // Convert pixel font sizes to points (1px ≈ 0.75pt)
        processed = processed.replace(
            /font-size:\s*(\d+)px/g,
            (match, pixels) => {
                const points = Math.round(parseInt(pixels) * 0.75);
                console.log(`Converting font-size: ${pixels}px -> ${points}pt`);
                return `font-size: ${points}pt`;
            },
        );

        // Protect empty paragraphs between lists - these should become proper spacing
        processed = processed.replace(/<\/ol>\s*<p[^>]*>\s*<br\s*\/?>\s*<\/p>\s*<ol/g, '</ol>|||INTENTIONAL_EMPTY_LINE|||<ol');
        processed = processed.replace(/<\/ul>\s*<p[^>]*>\s*<br\s*\/?>\s*<\/p>\s*<ul/g, '</ul>|||INTENTIONAL_EMPTY_LINE|||<ul');
        processed = processed.replace(/<\/ol>\s*<p[^>]*>\s*<br\s*\/?>\s*<\/p>\s*<ul/g, '</ol>|||INTENTIONAL_EMPTY_LINE|||<ul');
        processed = processed.replace(/<\/ul>\s*<p[^>]*>\s*<br\s*\/?>\s*<\/p>\s*<ol/g, '</ul>|||INTENTIONAL_EMPTY_LINE|||<ol');

        // Convert Quill's data-list attributes to plain text with manual bullets/numbers
        // html2pptxgenjs seems to have issues with lists, so we'll format them manually
        processed = processed.replace(
            /<(ol|ul)[^>]*>(.*?)<\/\1>/gs,
            (match, tagName, content) => {
                const items = content.match(/<li[^>]*>(.*?)<\/li>/gs);
                if (!items) return match;

                // Check what type of list this should be based on data-list attributes
                const hasOrderedItems = items.some((item) =>
                    item.includes('data-list="ordered"'),
                );
                const hasBulletItems = items.some((item) =>
                    item.includes('data-list="bullet"'),
                );

                console.log(
                    `Processing ${tagName} with ${items.length} items:`,
                    {
                        hasOrderedItems,
                        hasBulletItems,
                        firstItem: items[0],
                    },
                );

                // Process the list items and add manual numbering/bullets
                const listItems = items
                    .map((item, index) => {
                        const textMatch = item.match(/<li[^>]*>(.*?)<\/li>/s);
                        if (textMatch) {
                            let text = textMatch[1];
                            // Remove ql-ui spans
                            text = text.replace(
                                /<span class="ql-ui"[^>]*><\/span>/g,
                                '',
                            );
                            
                            // Add manual bullet or number
                            if (hasBulletItems && !hasOrderedItems) {
                                return `<p>• ${text.trim()}</p>`;
                            } else if (hasOrderedItems && !hasBulletItems) {
                                return `<p>${index + 1}. ${text.trim()}</p>`;
                            } else {
                                // Mixed or default case - use index to determine
                                const isOrdered = item.includes('data-list="ordered"');
                                if (isOrdered) {
                                    return `<p>${index + 1}. ${text.trim()}</p>`;
                                } else {
                                    return `<p>• ${text.trim()}</p>`;
                                }
                            }
                        }
                        return '';
                    })
                    .filter((item) => item);

                // Return as a single paragraph with line breaks instead of multiple paragraphs
                return `<p>${listItems.map(item => item.replace(/<\/?p>/g, '')).join('<br>')}</p>`;
            },
        );

        // Convert Quill alignment classes to inline styles
        processed = processed.replace(
            /<p[^>]*class="[^"]*ql-align-(center|right|justify)[^"]*"[^>]*>/g,
            (match, align) => {
                return `<p style="text-align: ${align}">`;
            },
        );

        // First, protect intentional empty lines (p with just br) by replacing with placeholder
        processed = processed.replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/g, '|||INTENTIONAL_EMPTY_LINE|||');
        
        // Clean up any remaining truly empty paragraphs (no content at all)
        processed = processed.replace(/<p[^>]*>\s*<\/p>/g, '');
        
        // Clean up multiple consecutive line breaks
        processed = processed.replace(/(<br\s*\/?>){2,}/g, '<br>');
        
        // Remove leading/trailing breaks from paragraphs
        processed = processed.replace(/<p([^>]*)>\s*<br\s*\/?>/g, '<p$1>');
        processed = processed.replace(/<br\s*\/?>\s*<\/p>/g, '</p>');
        
        // Remove leading and trailing empty content
        processed = processed.replace(/^(\s*<p[^>]*>\s*<\/p>\s*)+/, '');
        processed = processed.replace(/(\s*<p[^>]*>\s*<\/p>\s*)+$/, '');
        processed = processed.replace(/^(\s*<br\s*\/?>)+/, '');
        processed = processed.replace(/(\s*<br\s*\/?>)+$/, '');
        
        // Remove any leading/trailing whitespace between tags
        processed = processed.trim();
        
        // Final step: Convert all content to a single paragraph to eliminate spacing issues
        // First, let's add debug logging to see what we're working with
        console.log('Before empty line processing:', processed);
        
        // The intentional empty lines are already protected as |||INTENTIONAL_EMPTY_LINE|||
        // No need to search for <p><br></p> patterns here since they're already handled
        console.log('After empty line replacement:', processed);
        
        // Replace paragraph boundaries with line breaks, but handle placeholders properly
        processed = processed.replace(/<\/p>\s*\|\|\|INTENTIONAL_EMPTY_LINE\|\|\|\s*<p[^>]*>/g, '<br>&nbsp;<br>');
        processed = processed.replace(/<\/p>\s*<p[^>]*>/g, '<br>');
        console.log('After paragraph boundary replacement:', processed);
        
        // Handle remaining placeholders that weren't between paragraphs
        processed = processed.replace(/\|\|\|INTENTIONAL_EMPTY_LINE\|\|\|/g, '<br>&nbsp;<br>');
        console.log('After standalone placeholder conversion:', processed);
        
        // Remove any remaining opening/closing paragraph tags and wrap everything in one paragraph
        processed = processed.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
        console.log('After tag removal:', processed);
        
        processed = `<p>${processed}</p>`;

        console.log('Preprocessed Quill HTML:', {
            original: html,
            processed: processed,
            hadFontSizeConversion:
                html !== processed && html.includes('font-size'),
            originalListCount: (html.match(/<ol[^>]*>/g) || []).length + (html.match(/<ul[^>]*>/g) || []).length,
            processedParagraphs: (processed.match(/<p[^>]*>/g) || []).length,
            startsWithParagraph: processed.startsWith('<p'),
            endsWithParagraph: processed.endsWith('</p>'),
            originalLength: html.length,
            processedLength: processed.length
        });
        return processed;
    }

    private htmlToPlainText(html: string): string {
        // Basic HTML to text conversion (kept for fallback)
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
}
