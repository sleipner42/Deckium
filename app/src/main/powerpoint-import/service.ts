import * as fs from 'fs';
import JSZip from 'jszip';
import * as path from 'path';
import { parse } from 'pptxtojson';
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
import { PRESENTATION_DIMENSIONS } from '../../common/utils/constants';

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

export class PowerPointImportService {
    private progressCallback?: (progress: ImportProgress) => void;
    private scaleX: number = 1;
    private scaleY: number = 1;

    setProgressCallback(callback: (progress: ImportProgress) => void) {
        this.progressCallback = callback;
    }

    private reportProgress(stage: string, progress: number, message: string) {
        if (this.progressCallback) {
            this.progressCallback({ stage, progress, message });
        }
    }

    async importPowerPointFile(filePath: string): Promise<ImportResult> {
        try {
            this.reportProgress('validation', 0, 'Validating file...');

            // Validate file exists and is a PPTX file
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'File does not exist' };
            }

            const ext = path.extname(filePath).toLowerCase();
            if (ext !== '.pptx') {
                return { success: false, error: 'File must be a .pptx file' };
            }

            this.reportProgress('parsing', 10, 'Reading PowerPoint file...');

            // Read the file as buffer and convert to ArrayBuffer (as required by pptxtojson)
            const fileBuffer = fs.readFileSync(filePath);
            const arrayBuffer = fileBuffer.buffer.slice(
                fileBuffer.byteOffset,
                fileBuffer.byteOffset + fileBuffer.byteLength,
            );

            // Parse the PPTX file using ArrayBuffer
            const pptxData = await parse(arrayBuffer);

            // Debug: Log the structure to understand the data format
            console.log(
                'PPTX Data structure:',
                JSON.stringify(pptxData, null, 2).substring(0, 1000),
            );
            
            // Additional detailed logging for debugging
            console.log('='.repeat(60));
            console.log('DETAILED PPTX ANALYSIS:');
            console.log(`- Total slides: ${pptxData.slides ? pptxData.slides.length : 'None'}`);
            console.log(`- Theme colors: ${JSON.stringify(pptxData.themeColors)}`);
            console.log(`- Slide size: ${JSON.stringify(pptxData.size)}`);
            
            if (pptxData.slides && pptxData.slides.length > 0) {
                pptxData.slides.forEach((slide, slideIndex) => {
                    console.log(`\nSLIDE ${slideIndex + 1} ANALYSIS:`);
                    console.log(`  Background: ${JSON.stringify(slide.fill)}`);
                    console.log(`  Elements count: ${slide.elements ? slide.elements.length : 0}`);
                    
                    if (slide.elements && slide.elements.length > 0) {
                        slide.elements.forEach((element, elemIndex) => {
                            console.log(`\n  ELEMENT ${elemIndex + 1} DETAILED INFO:`);
                            console.log(`    Type: ${element.type}`);
                            console.log(`    Coordinates: left=${element.left}, top=${element.top}`);
                            console.log(`    Size: width=${element.width}, height=${element.height}`);
                            
                            // Check ALL properties
                            console.log(`    All properties:`, Object.keys(element));
                            
                            // Shape-specific analysis
                            if (element.type === 'shape') {
                                const shape = element as any;
                                console.log(`    Shape type: ${shape.shapeType || shape.shapType || 'MISSING'}`);
                                console.log(`    Fill object: ${JSON.stringify(shape.fill)}`);
                                console.log(`    Border: ${shape.borderColor} / ${shape.borderWidth}px`);
                                if (shape.path) {
                                    console.log(`    SVG Path: ${shape.path}`);
                                }
                            }
                            
                            // Text content analysis
                            if (element.content) {
                                console.log(`    Content length: ${element.content.length}`);
                                console.log(`    Content: ${element.content}`);
                            }
                            
                            // Name and order
                            if ((element as any).name) {
                                console.log(`    Name: ${(element as any).name}`);
                            }
                            if ((element as any).order) {
                                console.log(`    Order: ${(element as any).order}`);
                            }
                        });
                    }
                });
            }
            console.log('='.repeat(60));

            this.reportProgress('conversion', 30, 'Converting slides...');

            // Convert PPTX data to our presentation format
            const presentation = await this.convertPptxToPresentation(
                pptxData,
                filePath,
                fileBuffer,
            );

            this.reportProgress(
                'complete',
                100,
                'Import completed successfully',
            );

            return { success: true, presentation };
        } catch (error) {
            console.error('PowerPoint import error:', error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred',
            };
        }
    }

    private async convertPptxToPresentation(
        pptxData: any,
        filePath: string,
    ): Promise<Presentation> {
        // Extract PowerPoint slide dimensions for proper scaling
        const pptSlideWidth = pptxData.size?.width || 720; // Default PowerPoint width
        const pptSlideHeight = pptxData.size?.height || 540; // Default PowerPoint height
        
        // Our application's slide dimensions from constants
        const appSlideWidth = PRESENTATION_DIMENSIONS.WIDTH;
        const appSlideHeight = PRESENTATION_DIMENSIONS.HEIGHT;
        
        // Calculate scaling factors
        const scaleX = appSlideWidth / pptSlideWidth;
        const scaleY = appSlideHeight / pptSlideHeight;
        
        console.log(`Scaling factors: PowerPoint(${pptSlideWidth}x${pptSlideHeight}) -> App(${appSlideWidth}x${appSlideHeight})`);
        console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
        
        // Store scaling factors for use in coordinate conversion
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        const presentation: Presentation = {
            id: uuidv4(),
            title: this.extractPresentationTitle(pptxData, filePath),
            slides: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Extract images from the PPTX file for later use
        const fileBuffer = fs.readFileSync(filePath);
        const imageMap = await this.extractImages(fileBuffer);

        // The pptxtojson library structure might be different
        // Check for common slide array properties
        let slidesArray = null;
        if (pptxData.slides && Array.isArray(pptxData.slides)) {
            slidesArray = pptxData.slides;
        } else if (pptxData.slideList && Array.isArray(pptxData.slideList)) {
            slidesArray = pptxData.slideList;
        } else if (Array.isArray(pptxData)) {
            slidesArray = pptxData;
        }

        if (slidesArray) {
            let slideIndex = 0;
            for (const slideData of slidesArray) {
                this.reportProgress(
                    'conversion',
                    30 + (slideIndex / slidesArray.length) * 60,
                    `Converting slide ${slideIndex + 1}...`,
                );

                const slide = await this.convertSlide(
                    slideData,
                    slideIndex,
                    imageMap,
                );
                presentation.slides.push(slide);
                slideIndex++;
            }
        } else {
            console.warn(
                'No slides found in PPTX data. Available keys:',
                Object.keys(pptxData),
            );
        }

        return presentation;
    }

    private extractPresentationTitle(pptxData: any, filePath: string): string {
        // Try to extract title from PPTX metadata
        if (pptxData.core?.title) {
            return pptxData.core.title;
        }

        // Fallback to filename without extension
        const fileName = path.basename(filePath, path.extname(filePath));
        return fileName || 'Imported Presentation';
    }

    private async extractImages(
        fileBuffer: Buffer,
    ): Promise<Map<string, string>> {
        const imageMap = new Map<string, string>();

        try {
            const zip = await JSZip.loadAsync(fileBuffer);

            // Look for images in media folder
            const mediaFiles = Object.keys(zip.files).filter((fileName) =>
                fileName.startsWith('ppt/media/'),
            );

            for (const fileName of mediaFiles) {
                const file = zip.files[fileName];
                if (file && !file.dir) {
                    const imageData = await file.async('uint8array');
                    const base64 = Buffer.from(imageData).toString('base64');
                    const mimeType = this.getMimeTypeFromExtension(fileName);
                    const dataUrl = `data:${mimeType};base64,${base64}`;

                    // Extract just the filename for the key
                    const imageKey = path.basename(fileName);
                    imageMap.set(imageKey, dataUrl);
                }
            }
        } catch (error) {
            console.warn('Failed to extract images:', error);
        }

        return imageMap;
    }

    private getMimeTypeFromExtension(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
        };
        return mimeTypes[ext] || 'image/png';
    }

    private async convertSlide(
        slideData: any,
        slideIndex: number,
        imageMap: Map<string, string>,
    ): Promise<Slide> {
        console.log(
            `Slide ${slideIndex} data:`,
            JSON.stringify(slideData, null, 2).substring(0, 500),
        );

        const slide: Slide = {
            id: uuidv4(),
            elements: [],
            background:
                slideData.background || slideData.backgroundFill || '#ffffff',
        };

        // Check different possible element array properties
        let elementsArray = null;
        if (slideData.elements && Array.isArray(slideData.elements)) {
            elementsArray = slideData.elements;
        } else if (slideData.shapes && Array.isArray(slideData.shapes)) {
            elementsArray = slideData.shapes;
        } else if (slideData.objects && Array.isArray(slideData.objects)) {
            elementsArray = slideData.objects;
        }

        if (elementsArray) {
            for (const elementData of elementsArray) {
                console.log(
                    'Processing element:',
                    JSON.stringify(elementData, null, 2).substring(0, 300),
                );
                const element = this.convertElement(elementData, imageMap);
                if (element) {
                    slide.elements.push(element);
                }
            }
        } else {
            console.warn(
                `No elements found in slide ${slideIndex}. Available keys:`,
                Object.keys(slideData),
            );
        }

        return slide;
    }

    private convertElement(
        elementData: any,
        imageMap: Map<string, string>,
    ): ContentElement | null {
        if (!elementData) {
            return null;
        }

        const baseProps = {
            id: uuidv4(),
            position: this.convertPosition(elementData),
            size: this.convertSize(elementData),
            zIndex: elementData.zIndex || 1,
        };

        // Based on the actual pptxtojson data structure
        console.log(
            'Element data:',
            JSON.stringify(elementData, null, 2).substring(0, 200),
        );

        // Check if element is a text element or has text content
        const isTextElement = elementData.type === 'text';
        const hasTextContent =
            elementData.content && elementData.content.trim() !== '';

        if (isTextElement || hasTextContent) {
            return this.convertTextElement(elementData, baseProps);
        }

        // Check for image content (would have image source)
        if (elementData.src || elementData.imageSrc) {
            return this.convertImageElement(elementData, baseProps, imageMap);
        }

        // Check for chart (would have chart-specific properties)
        if (elementData.chartType || elementData.chart) {
            return this.convertChartElement(elementData, baseProps);
        }

        // Default to shape element (pptxtojson elements are primarily shapes)
        return this.convertShapeElement(elementData, baseProps);
    }

    private convertPosition(elementData: any): { x: number; y: number } {
        // Based on the actual data structure from pptxtojson
        const originalX = elementData.left || elementData.x || 0;
        const originalY = elementData.top || elementData.y || 0;
        const x = this.parseXCoordinate(originalX);
        const y = this.parseYCoordinate(originalY);

        console.log(`Position conversion: (${originalX}, ${originalY}) -> (${x}, ${y}) with scale (${this.scaleX}, ${this.scaleY})`);

        return { x, y };
    }

    private convertSize(elementData: any): { width: number; height: number } {
        // Based on the actual data structure from pptxtojson
        const width = this.parseXCoordinate(elementData.width || 100);
        const height = this.parseYCoordinate(elementData.height || 50);

        return { width, height };
    }

    private parseXCoordinate(value: any): number {
        if (typeof value === 'number') {
            // Scale X coordinate based on PowerPoint to app width ratio
            return value * this.scaleX;
        }
        if (typeof value === 'string') {
            const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
            return isNaN(numValue) ? 0 : Math.abs(numValue) * this.scaleX;
        }
        return 0;
    }

    private parseYCoordinate(value: any): number {
        if (typeof value === 'number') {
            // Scale Y coordinate based on PowerPoint to app height ratio
            return value * this.scaleY;
        }
        if (typeof value === 'string') {
            const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
            return isNaN(numValue) ? 0 : Math.abs(numValue) * this.scaleY;
        }
        return 0;
    }

    private convertTextElement(
        elementData: any,
        baseProps: any,
    ): TextBox | null {
        console.log('Converting text element:', {
            type: elementData.type,
            hasContent: !!elementData.content,
            contentLength: elementData.content?.length || 0,
            originalVAlign: elementData.vAlign,
            mappedVAlign: elementData.vAlign === 'middle' || elementData.vAlign === 'mid'
                ? 'middle'
                : elementData.vAlign === 'bottom' || elementData.vAlign === 'down'
                  ? 'bottom'
                  : 'top'
        });

        // Extract text content directly from the content property (already HTML formatted)
        let content = elementData.content || '<p>Text</p>';

        // If content is empty or just whitespace, use fallback
        if (!content || content.trim() === '') {
            content = '<p>Text</p>';
        }

        console.log('Original content:', content);

        // Convert PowerPoint HTML to Quill-compatible format
        content = this.convertPowerPointHtmlToQuill(content);

        console.log('Content after font conversion:', content);
        console.log('FINAL CONTENT BEING PASSED TO TEXTBOX:', JSON.stringify(content));

        // Extract background color from fill object - based on actual data structure
        let backgroundColor;
        if (elementData.fill) {
            if (typeof elementData.fill === 'string' && elementData.fill !== '') {
                backgroundColor = elementData.fill;
            } else if (elementData.fill.value) {
                backgroundColor = elementData.fill.value;
            } else if (elementData.fill.color) {
                backgroundColor = elementData.fill.color;
            }
        }

        const textBox = {
            ...baseProps,
            type: 'textbox',
            content,
            backgroundColor: backgroundColor,
            borderRadius: 0,
            verticalAlign:
                elementData.vAlign === 'middle' || elementData.vAlign === 'mid'
                    ? 'middle'
                    : elementData.vAlign === 'bottom' || elementData.vAlign === 'down'
                      ? 'bottom'
                      : 'top',
        } as TextBox;

        console.log('Created text box:', {
            type: textBox.type,
            contentPreview: textBox.content.substring(0, 100),
            position: textBox.position,
            size: textBox.size,
            verticalAlign: textBox.verticalAlign
        });

        return textBox;
    }

    private convertTextContent(textData: any): string {
        if (typeof textData === 'string') {
            return `<p>${textData}</p>`;
        }

        if (Array.isArray(textData)) {
            return textData
                .map((item) => {
                    if (typeof item === 'string') {
                        return `<p>${item}</p>`;
                    }
                    if (item.text) {
                        let html = item.text;
                        if (item.bold) html = `<strong>${html}</strong>`;
                        if (item.italic) html = `<em>${html}</em>`;
                        if (item.underline) html = `<u>${html}</u>`;
                        if (item.color)
                            html = `<span style="color: ${item.color}">${html}</span>`;
                        if (item.fontSize)
                            html = `<span style="font-size: ${item.fontSize}px">${html}</span>`;
                        return `<p>${html}</p>`;
                    }
                    return '';
                })
                .join('');
        }

        if (textData.text) {
            return `<p>${textData.text}</p>`;
        }

        return '<p></p>';
    }

    private convertFontSizesToPixels(htmlContent: string): string {
        // Convert point sizes to pixel sizes in HTML content
        // PowerPoint exports our pixel sizes as points, but the conversion should be 1:1
        // because our original sizes were already in pixels
        const converted = htmlContent.replace(/font-size:\s*(\d+(?:\.\d+)?)pt/g, (match, size) => {
            // Use 1:1 conversion instead of 1.333 to maintain original sizes
            const pixelSize = Math.round(parseFloat(size));
            console.log(`Converting font size: ${match} -> font-size: ${pixelSize}px`);
            return `font-size: ${pixelSize}px`;
        });
        
        // Log the conversion for debugging
        if (converted !== htmlContent) {
            console.log('Font size conversion applied:');
            console.log('Before:', htmlContent.substring(0, 200));
            console.log('After:', converted.substring(0, 200));
        }
        
        return converted;
    }

    private convertTextAlignment(htmlContent: string): string {
        // Convert PowerPoint inline text-align styles to Quill alignment classes
        let converted = htmlContent;
        
        // Convert text-align: center
        converted = converted.replace(
            /(<[^>]+)style="([^"]*?)text-align:\s*center;?([^"]*?)"/g,
            '$1class="ql-align-center" style="$2$3"'
        );
        
        // Convert text-align: right
        converted = converted.replace(
            /(<[^>]+)style="([^"]*?)text-align:\s*right;?([^"]*?)"/g,
            '$1class="ql-align-right" style="$2$3"'
        );
        
        // Remove text-align: left as it's default and clean up empty style attributes
        converted = converted.replace(/text-align:\s*left;?/g, '');
        converted = converted.replace(/style=""/g, '');
        converted = converted.replace(/style="\s*"/g, '');
        
        console.log('Text alignment conversion:', {
            before: htmlContent.substring(0, 100),
            after: converted.substring(0, 100)
        });
        
        return converted;
    }

    private convertPowerPointHtmlToQuill(htmlContent: string): string {
        let converted = htmlContent;
        
        // Step 1: Convert font sizes from points to pixels
        converted = this.convertFontSizesToPixels(converted);
        
        // Step 2: Convert text alignment to Quill classes
        converted = this.convertTextAlignment(converted);
        
        // Step 3: Handle font-family and convert to Quill format
        converted = this.convertFontFamilyToQuillFormat(converted);
        
        // Step 4: Handle font-weight: bold -> <strong> tags for Quill compatibility
        converted = converted.replace(
            /<span([^>]*?)style="([^"]*?)font-weight:\s*bold;?([^"]*?)"([^>]*?)>(.*?)<\/span>/g,
            '<span$1style="$2$3"$4><strong>$5</strong></span>'
        );
        
        // Step 5: Handle text-decoration-line: line-through -> <s> tags
        converted = converted.replace(
            /<span([^>]*?)style="([^"]*?)text-decoration-line:\s*line-through;?([^"]*?)"([^>]*?)>(.*?)<\/span>/g,
            '<span$1style="$2$3"$4><s>$5</s></span>'
        );
        
        // Step 6: Ensure font-size is properly formatted for Quill compatibility
        // Sometimes Quill has issues with style attribute order - ensure font-size comes first
        converted = converted.replace(
            /style="([^"]*?)font-size:\s*(\d+px);?([^"]*?)"/g,
            'style="font-size: $2; $1$3"'
        );
        
        // Clean up formatting issues that might prevent Quill from parsing correctly
        converted = converted.replace(/style=""/g, '');
        converted = converted.replace(/style="\s*"/g, '');
        converted = converted.replace(/style=";\s*"/g, '');
        
        // Clean up class attributes - remove trailing spaces
        converted = converted.replace(/class="([^"]*?)\s+"/g, 'class="$1"');
        
        // Clean up XML-style self-closing tags with spaces
        converted = converted.replace(/\s+>/g, '>');
        
        // Ensure proper spacing in HTML and clean up double semicolons
        converted = converted.replace(/>\s*</g, '><');
        converted = converted.replace(/;\s*;/g, ';');
        converted = converted.replace(/;\s*"/g, '"');
        
        console.log('PowerPoint to Quill conversion completed:', {
            originalLength: htmlContent.length,
            convertedLength: converted.length,
            original: htmlContent,
            converted: converted,
            hasFontSize: /font-size:\s*\d+px/.test(converted),
            hasQuillClasses: /ql-font-/.test(converted)
        });
        
        return converted;
    }

    private convertFontFamilyToQuillFormat(htmlContent: string): string {
        // Convert PowerPoint font families to Quill class format
        let converted = htmlContent;
        
        // Map common PowerPoint fonts to Quill classes
        const fontMappings = {
            'Calibri': 'ql-font-sans',
            'Arial': 'ql-font-sans', 
            'Times New Roman': 'ql-font-serif',
            'EB Garamond': 'ql-font-serif',
            'Georgia': 'ql-font-serif',
            'Courier New': 'ql-font-monospace',
            'Consolas': 'ql-font-monospace'
        };
        
        // Convert font-family styles to Quill classes more precisely
        for (const [fontName, quillClass] of Object.entries(fontMappings)) {
            // Match spans with font-family declarations
            const fontFamilyRegex = new RegExp(
                `(<span[^>]*?)style="([^"]*?)font-family:\\s*["']?${fontName.replace(/\s+/g, '\\s+')}["']?;?([^"]*?)"([^>]*?)>`,
                'gi'
            );
            
            converted = converted.replace(fontFamilyRegex, (match, spanStart, stylePrefix, styleSuffix, spanEnd) => {
                // Check if there's already a class attribute
                const hasClass = spanStart.includes('class=');
                
                if (hasClass) {
                    // Add to existing class
                    const classRegex = /class\s*=\s*["']([^"']*?)["']/i;
                    const updatedSpanStart = spanStart.replace(classRegex, `class="$1 ${quillClass}"`);
                    return `${updatedSpanStart}style="${stylePrefix}${styleSuffix}"${spanEnd}>`;
                } else {
                    // Add new class attribute
                    return `${spanStart}class="${quillClass}" style="${stylePrefix}${styleSuffix}"${spanEnd}>`;
                }
            });
        }
        
        // Remove any remaining font-family declarations
        converted = converted.replace(/font-family:[^;]*;?/gi, '');
        
        // Clean up empty style attributes
        converted = converted.replace(/style=""/g, '');
        converted = converted.replace(/style="\s*"/g, '');
        
        console.log('Font family conversion:', {
            originalHasFont: /font-family:/i.test(htmlContent),
            convertedHasFont: /font-family:/i.test(converted),
            preview: converted.substring(0, 200)
        });
        
        return converted;
    }

    private convertShapeElement(
        elementData: any,
        baseProps: any,
    ): Shape | null {
        let shapeType: 'rectangle' | 'circle' | 'triangle';

        // Check for shapeType property first (API has typo: "shapType" instead of "shapeType")
        const shapeTypeFromData = elementData.shapeType || elementData.shapType;
        const elementType = elementData.type || '';
        const name = elementData.name || '';
        
        console.log('Shape type detected:', shapeTypeFromData, 'type:', elementType, 'name:', name);

        // Use the actual shapeType if available
        if (shapeTypeFromData) {
            switch (shapeTypeFromData.toLowerCase()) {
                case 'ellipse':
                case 'circle':
                case 'oval':
                    shapeType = 'circle';
                    break;
                case 'triangle':
                case 'righttriangle':
                    shapeType = 'triangle';
                    break;
                case 'rect':
                case 'rectangle':
                case 'roundrect':
                default:
                    shapeType = 'rectangle';
                    break;
            }
        } else {
            // Fallback to name-based detection
            if (name.toLowerCase().includes('triangle') || elementType.toLowerCase().includes('triangle')) {
                shapeType = 'triangle';
            } else if (name.toLowerCase().includes('circle') || name.toLowerCase().includes('oval') || 
                       elementType.toLowerCase().includes('circle') || elementType.toLowerCase().includes('oval')) {
                shapeType = 'circle';
            } else {
                shapeType = 'rectangle';
            }
        }

        // Extract fill color - based on the actual data structure from logs
        let fillColor = '#ffffff';
        if (elementData.fill) {
            if (typeof elementData.fill === 'string') {
                fillColor = elementData.fill;
            } else if (elementData.fill.value) {
                // From logs: "fill": { "type": "color", "value": "#FF0000" }
                fillColor = elementData.fill.value;
            } else if (elementData.fill.color) {
                fillColor = elementData.fill.color;
            }
        }

        return {
            ...baseProps,
            type: shapeType,
            fillColor: fillColor,
            strokeColor: elementData.borderColor || '#000000',
            strokeWidth: elementData.borderWidth || 0,
        } as Shape;
    }

    private convertImageElement(
        elementData: any,
        baseProps: any,
        imageMap: Map<string, string>,
    ): ImageElement | null {
        let imageContent = '';

        // Try to find the image in our extracted images
        if (elementData.src) {
            const imageName = path.basename(elementData.src);
            imageContent = imageMap.get(imageName) || elementData.src;
        } else if (elementData.image) {
            const imageName = path.basename(elementData.image);
            imageContent = imageMap.get(imageName) || elementData.image;
        }

        if (!imageContent) {
            console.warn('Could not find image content for element');
            return null;
        }

        return {
            ...baseProps,
            type: 'image',
            content: imageContent,
        } as ImageElement;
    }

    private convertChartElement(
        elementData: any,
        baseProps: any,
    ): BarChart | null {
        // Basic chart conversion - this could be enhanced based on the actual chart data structure
        const chartData = {
            x: ['Category 1', 'Category 2', 'Category 3'],
            y: [10, 20, 15],
        };

        // Try to extract real chart data if available
        if (elementData.data) {
            if (elementData.data.categories && elementData.data.values) {
                chartData.x = elementData.data.categories;
                chartData.y = elementData.data.values;
            }
        }

        return {
            ...baseProps,
            type: 'barchart',
            data: chartData,
            title: elementData.title || 'Imported Chart',
            xAxisLabel: elementData.xAxisLabel || 'X Axis',
            yAxisLabel: elementData.yAxisLabel || 'Y Axis',
            barColor: elementData.color || '#0066ff',
        } as BarChart;
    }
}
