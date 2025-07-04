import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'pptxtojson';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import {
    ContentElement,
    Presentation,
    Shape,
    Slide,
    TextBox,
    Image as ImageElement,
    BarChart,
} from '../../common/domain/entities/types';

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
                fileBuffer.byteOffset + fileBuffer.byteLength
            );
            
            // Parse the PPTX file using ArrayBuffer
            const pptxData = await parse(arrayBuffer);
            
            // Debug: Log the structure to understand the data format
            console.log('PPTX Data structure:', JSON.stringify(pptxData, null, 2).substring(0, 1000));

            this.reportProgress('conversion', 30, 'Converting slides...');

            // Convert PPTX data to our presentation format
            const presentation = await this.convertPptxToPresentation(
                pptxData,
                filePath,
                fileBuffer,
            );

            this.reportProgress('complete', 100, 'Import completed successfully');

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
            console.warn('No slides found in PPTX data. Available keys:', Object.keys(pptxData));
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

    private async extractImages(fileBuffer: Buffer): Promise<Map<string, string>> {
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
        console.log(`Slide ${slideIndex} data:`, JSON.stringify(slideData, null, 2).substring(0, 500));

        const slide: Slide = {
            id: uuidv4(),
            elements: [],
            background: slideData.background || slideData.backgroundFill || '#ffffff',
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
                console.log('Processing element:', JSON.stringify(elementData, null, 2).substring(0, 300));
                const element = this.convertElement(elementData, imageMap);
                if (element) {
                    slide.elements.push(element);
                }
            }
        } else {
            console.warn(`No elements found in slide ${slideIndex}. Available keys:`, Object.keys(slideData));
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

        // Determine element type from various possible properties
        const elementType = (
            elementData.type ||
            elementData.elementType ||
            elementData.kind ||
            elementData.objectType ||
            'shape' // Default fallback
        ).toLowerCase();

        console.log('Element type detected:', elementType, 'from element:', Object.keys(elementData));

        // Check for text content to determine if it's a text element
        const hasText = elementData.text || 
                       elementData.content || 
                       elementData.textContent || 
                       elementData.value || 
                       elementData.innerText || 
                       elementData.paragraphs;

        if (hasText || elementType.includes('text')) {
            return this.convertTextElement(elementData, baseProps);
        }

        // Check for image content
        const hasImage = elementData.src || 
                        elementData.image || 
                        elementData.imageSrc ||
                        elementType.includes('image') ||
                        elementType.includes('picture');

        if (hasImage) {
            return this.convertImageElement(elementData, baseProps, imageMap);
        }

        // Check for chart
        if (elementType.includes('chart') || elementData.chartType) {
            return this.convertChartElement(elementData, baseProps);
        }

        // Default to shape element
        return this.convertShapeElement(elementData, baseProps);
    }

    private convertPosition(elementData: any): { x: number; y: number } {
        // Try different possible position properties
        let x = 0, y = 0;
        
        if (elementData.x !== undefined) {
            x = this.parseCoordinate(elementData.x);
        } else if (elementData.left !== undefined) {
            x = this.parseCoordinate(elementData.left);
        } else if (elementData.position && elementData.position.x !== undefined) {
            x = this.parseCoordinate(elementData.position.x);
        }
        
        if (elementData.y !== undefined) {
            y = this.parseCoordinate(elementData.y);
        } else if (elementData.top !== undefined) {
            y = this.parseCoordinate(elementData.top);
        } else if (elementData.position && elementData.position.y !== undefined) {
            y = this.parseCoordinate(elementData.position.y);
        }
        
        return { x, y };
    }

    private convertSize(elementData: any): { width: number; height: number } {
        // Try different possible size properties
        let width = 100, height = 50;
        
        if (elementData.width !== undefined) {
            width = this.parseCoordinate(elementData.width);
        } else if (elementData.w !== undefined) {
            width = this.parseCoordinate(elementData.w);
        } else if (elementData.size && elementData.size.width !== undefined) {
            width = this.parseCoordinate(elementData.size.width);
        }
        
        if (elementData.height !== undefined) {
            height = this.parseCoordinate(elementData.height);
        } else if (elementData.h !== undefined) {
            height = this.parseCoordinate(elementData.h);
        } else if (elementData.size && elementData.size.height !== undefined) {
            height = this.parseCoordinate(elementData.size.height);
        }
        
        return { width, height };
    }

    private parseCoordinate(value: any): number {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            // Handle various units and convert to pixels
            // Remove non-numeric characters except decimal point and minus
            const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
            return isNaN(numValue) ? 0 : Math.abs(numValue); // Convert to positive pixels
        }
        return 0;
    }

    private convertTextElement(
        elementData: any,
        baseProps: any,
    ): TextBox | null {
        let content = '';

        // Extract text content from various possible properties
        if (elementData.text) {
            content = this.convertTextContent(elementData.text);
        } else if (elementData.content) {
            content = this.convertTextContent(elementData.content);
        } else if (elementData.textContent) {
            content = this.convertTextContent(elementData.textContent);
        } else if (elementData.value) {
            content = this.convertTextContent(elementData.value);
        } else if (elementData.innerText) {
            content = this.convertTextContent(elementData.innerText);
        } else if (elementData.paragraphs) {
            content = this.convertTextContent(elementData.paragraphs);
        }

        if (!content) {
            content = '<p>Text</p>'; // Fallback for empty text
        }

        return {
            ...baseProps,
            type: 'textbox',
            content,
            backgroundColor: elementData.fill || elementData.backgroundColor || undefined,
            borderRadius: 0,
            verticalAlign: 'top',
        } as TextBox;
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
                        if (item.color) html = `<span style="color: ${item.color}">${html}</span>`;
                        if (item.fontSize) html = `<span style="font-size: ${item.fontSize}px">${html}</span>`;
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

    private convertShapeElement(
        elementData: any,
        baseProps: any,
    ): Shape | null {
        let shapeType: 'rectangle' | 'circle' | 'triangle';

        // Check various possible shape type properties
        const typeToCheck = (
            elementData.type ||
            elementData.shape ||
            elementData.shapeType ||
            elementData.geom ||
            elementData.geometry ||
            'rectangle'
        ).toLowerCase();

        console.log('Shape type detected:', typeToCheck);

        // Map PPTX shape types to our shape types
        switch (typeToCheck) {
            case 'rectangle':
            case 'rect':
            case 'roundrect':
            case 'rectangle2':
                shapeType = 'rectangle';
                break;
            case 'circle':
            case 'oval':
            case 'ellipse':
            case 'ellipse2':
                shapeType = 'circle';
                break;
            case 'triangle':
            case 'rightTriangle':
            case 'triangle2':
                shapeType = 'triangle';
                break;
            default:
                console.warn(`Unknown shape type: ${typeToCheck}, defaulting to rectangle`);
                shapeType = 'rectangle'; // Default fallback
        }

        return {
            ...baseProps,
            type: shapeType,
            fillColor: elementData.fill || elementData.fillColor || elementData.backgroundColor || '#ffffff',
            strokeColor: elementData.stroke || elementData.strokeColor || elementData.border || elementData.borderColor || '#000000',
            strokeWidth: elementData.strokeWidth || elementData.borderWidth || 1,
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