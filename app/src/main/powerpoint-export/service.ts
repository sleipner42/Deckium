import { BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
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
                    await this.convertChartToImage(
                        slide,
                        element as BarChart,
                        position,
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
            // Parse HTML content and convert to PptxGenJS rich text format
            const richTextArray = this.htmlToRichText(element.content);

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
            console.log('Added rich text with formatting:', richTextArray);
        } catch (error) {
            console.error(
                'Error converting rich text, falling back to plain text:',
                error,
            );

            // Fallback to plain text if rich text parsing fails
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

    private async convertChartToImage(
        slide: any,
        element: BarChart,
        position: any,
    ): Promise<void> {
        try {
            // Create a placeholder for the chart since native charts cause file corruption
            // In the future, this could render the chart to canvas and convert to image

            const chartTitle = element.title || 'Bar Chart';
            const placeholderText = `📊 ${chartTitle}`;

            slide.addText(placeholderText, {
                x: position.x,
                y: position.y,
                w: position.w,
                h: position.h,
                fontSize: 16,
                align: 'center',
                valign: 'middle',
                fill: { color: 'E3F2FD' }, // Light blue background
                color: '1976D2', // Blue text
                border: { color: '1976D2', width: 2 },
            });

            // Add chart details if available
            if (element.xAxisLabel || element.yAxisLabel) {
                const details = [
                    element.xAxisLabel && `X: ${element.xAxisLabel}`,
                    element.yAxisLabel && `Y: ${element.yAxisLabel}`,
                ]
                    .filter(Boolean)
                    .join(' | ');

                if (details) {
                    slide.addText(details, {
                        x: position.x,
                        y: position.y + position.h * 0.7,
                        w: position.w,
                        h: position.h * 0.2,
                        fontSize: 10,
                        align: 'center',
                        valign: 'middle',
                        color: '666666',
                    });
                }
            }

            console.log('Chart converted to placeholder:', chartTitle);
        } catch (error) {
            console.error('Error converting chart to placeholder:', error);
            // Fallback to a simple text placeholder
            slide.addText('Chart Element', {
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

    private htmlToRichText(html: string): any[] {
        // Convert HTML to PptxGenJS rich text format
        // This preserves formatting like bold, italic, colors, font sizes, etc.

        try {
            // First, let's try a simpler approach using DOM-like parsing
            // Since we can't use actual DOM in Node.js, we'll simulate it

            // Clean up the HTML and prepare for parsing
            let content = html
                .replace(/^<p[^>]*>|<\/p>$/gi, '') // Remove outer p tags
                .replace(/<br\s*\/?>/gi, '\n') // Convert br tags to newlines
                .replace(/<\/p>/gi, '\n') // Convert p end tags to newlines
                .replace(/<p[^>]*>/gi, ''); // Remove p start tags

            // For now, let's use a more robust approach
            // Strip all unknown tags but preserve the known formatting
            const richTextArray: any[] = [];

            // Parse the content character by character, tracking formatting state
            const formatStack: any[] = [];
            let currentText = '';
            let i = 0;

            while (i < content.length) {
                if (content[i] === '<') {
                    // Found a tag, extract it
                    const tagEnd = content.indexOf('>', i);
                    if (tagEnd === -1) {
                        // Malformed tag, treat as text
                        currentText += content[i];
                        i++;
                        continue;
                    }

                    // Process any accumulated text with current formatting
                    if (currentText.trim()) {
                        const currentFormat = this.mergeFormatting(formatStack);
                        richTextArray.push({
                            text: this.decodeHtmlEntities(currentText),
                            options: currentFormat,
                        });
                        currentText = '';
                    }

                    const fullTag = content.substring(i, tagEnd + 1);
                    const tagMatch = fullTag.match(/<(\/?)([\w\d]+)([^>]*)>/);

                    if (tagMatch) {
                        const [, isClosing, tagName, attributes] = tagMatch;

                        if (isClosing) {
                            // Remove the last occurrence of this tag from the stack
                            for (let j = formatStack.length - 1; j >= 0; j--) {
                                if (
                                    formatStack[j].tag === tagName.toLowerCase()
                                ) {
                                    formatStack.splice(j, 1);
                                    break;
                                }
                            }
                        } else {
                            // Add formatting to the stack
                            const formatting = this.getFormattingForTag(
                                tagName.toLowerCase(),
                                attributes,
                            );
                            if (formatting) {
                                formatStack.push({
                                    tag: tagName.toLowerCase(),
                                    ...formatting,
                                });
                            }
                        }
                    }

                    i = tagEnd + 1;
                } else {
                    currentText += content[i];
                    i++;
                }
            }

            // Process any remaining text
            if (currentText.trim()) {
                const currentFormat = this.mergeFormatting(formatStack);
                richTextArray.push({
                    text: this.decodeHtmlEntities(currentText),
                    options: currentFormat,
                });
            }

            // If no rich text was parsed, return the plain text
            if (richTextArray.length === 0) {
                const plainText = this.htmlToPlainText(html);
                return [
                    {
                        text: plainText,
                        options: { fontSize: 14, color: '000000' },
                    },
                ];
            }

            return richTextArray;
        } catch (error) {
            console.error('Error parsing HTML to rich text:', error);
            // Fallback to plain text
            const plainText = this.htmlToPlainText(html);
            return [
                {
                    text: plainText,
                    options: { fontSize: 14, color: '000000' },
                },
            ];
        }
    }

    private getFormattingForTag(tagName: string, attributes: string): any {
        const formatting: any = {};

        switch (tagName) {
            case 'b':
            case 'strong':
                formatting.bold = true;
                break;
            case 'i':
            case 'em':
                formatting.italic = true;
                break;
            case 'u':
                formatting.underline = true;
                break;
            case 's':
            case 'strike':
            case 'del':
                formatting.strike = true;
                break;
            case 'h1':
                formatting.bold = true;
                formatting.fontSize = 24;
                break;
            case 'h2':
                formatting.bold = true;
                formatting.fontSize = 20;
                break;
            case 'h3':
                formatting.bold = true;
                formatting.fontSize = 18;
                break;
            case 'h4':
                formatting.bold = true;
                formatting.fontSize = 16;
                break;
            case 'h5':
                formatting.bold = true;
                formatting.fontSize = 14;
                break;
            case 'h6':
                formatting.bold = true;
                formatting.fontSize = 12;
                break;
            case 'a':
                formatting.color = '0000FF';
                formatting.underline = true;
                break;
            case 'span':
                this.parseSpanAttributes(attributes, formatting);
                break;
            default:
                return null; // Unknown tag
        }

        return formatting;
    }

    private mergeFormatting(formatStack: any[]): any {
        const merged: any = { fontSize: 14, color: '000000' };

        // Apply all formatting from the stack
        for (const format of formatStack) {
            Object.assign(merged, format);
        }

        // Remove the tag property that we used for tracking
        delete merged.tag;

        return merged;
    }

    private parseSpanAttributes(attributes: string, textOptions: any): void {
        // Parse span style attributes for color, font-size, etc.
        const styleMatch = attributes.match(/style\s*=\s*["']([^"']+)["']/i);
        if (styleMatch) {
            const styleString = styleMatch[1];

            // Parse text color
            const colorMatch = styleString.match(
                /(?:^|;)\s*color\s*:\s*([^;]+)/i,
            );
            if (colorMatch) {
                const color = colorMatch[1].trim();
                textOptions.color = this.convertCssColorToHex(color);
            }

            // Parse background color
            const backgroundColorMatch = styleString.match(
                /(?:^|;)\s*background-color\s*:\s*([^;]+)/i,
            );
            if (backgroundColorMatch) {
                const backgroundColor = backgroundColorMatch[1].trim();
                textOptions.highlight =
                    this.convertCssColorToHex(backgroundColor);
            }

            // Parse font-size
            const fontSizeMatch = styleString.match(/font-size\s*:\s*(\d+)px/i);
            if (fontSizeMatch) {
                textOptions.fontSize = parseInt(fontSizeMatch[1]);
            }

            // Parse font-weight for bold
            const fontWeightMatch = styleString.match(
                /font-weight\s*:\s*(bold|[5-9]\d\d)/i,
            );
            if (fontWeightMatch) {
                textOptions.bold = true;
            }

            // Parse font-style for italic
            const fontStyleMatch = styleString.match(
                /font-style\s*:\s*italic/i,
            );
            if (fontStyleMatch) {
                textOptions.italic = true;
            }
        }
    }

    private convertCssColorToHex(color: string): string {
        const trimmedColor = color.trim();

        // Handle hex colors
        if (trimmedColor.startsWith('#')) {
            return trimmedColor.replace('#', '');
        }

        // Handle rgb colors
        if (trimmedColor.startsWith('rgb')) {
            const rgbMatch = trimmedColor.match(
                /rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
            );
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
                return `${r}${g}${b}`;
            }
        }

        // Handle named colors (basic set)
        const namedColors: { [key: string]: string } = {
            red: 'FF0000',
            green: '008000',
            blue: '0000FF',
            black: '000000',
            white: 'FFFFFF',
            yellow: 'FFFF00',
            orange: 'FFA500',
            purple: '800080',
            pink: 'FFC0CB',
            gray: '808080',
            grey: '808080',
        };

        const namedColor = namedColors[trimmedColor.toLowerCase()];
        if (namedColor) {
            return namedColor;
        }

        // Default to black for unknown colors
        console.warn(`Unknown color format: ${color}, defaulting to black`);
        return '000000';
    }

    private decodeHtmlEntities(text: string): string {
        return text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
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
