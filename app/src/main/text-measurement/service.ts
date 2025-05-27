import { BrowserWindow } from 'electron';
import { TextMeasurementRequest, TextMeasurementResult } from './ipc-handler';
import { estimateTextDimensions, TextDimensionResult } from '../ai/tools/utils/text-dimensions';

export class TextMeasurementService {
  private static instance: TextMeasurementService;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  static getInstance(): TextMeasurementService {
    if (!TextMeasurementService.instance) {
      TextMeasurementService.instance = new TextMeasurementService();
    }
    return TextMeasurementService.instance;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  async measureText(
    content: string,
    fontSize: number,
    fontFamily: string = 'Arial',
    width: number,
    lineHeight?: number
  ): Promise<TextDimensionResult> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('Main window not available for precise text measurement, falling back to estimation');
      return estimateTextDimensions(content, fontSize, width);
    }

    try {
      // Execute JavaScript in the renderer process for precise measurement
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const measureText = (content, fontSize, fontFamily, width, lineHeight) => {
            // Create a temporary div for measurement
            const testDiv = document.createElement('div');
            testDiv.style.position = 'absolute';
            testDiv.style.visibility = 'hidden';
            testDiv.style.top = '-9999px';
            testDiv.style.left = '-9999px';
            testDiv.style.whiteSpace = 'pre-wrap';
            testDiv.style.wordWrap = 'break-word';
            testDiv.style.fontSize = fontSize + 'px';
            testDiv.style.fontFamily = fontFamily;
            testDiv.style.lineHeight = lineHeight ? lineHeight.toString() : '1.2';
            testDiv.style.padding = '0';
            testDiv.style.margin = '0';
            testDiv.style.border = 'none';
            testDiv.style.width = width + 'px';
            testDiv.style.boxSizing = 'border-box';
            testDiv.textContent = content || '';
            
            document.body.appendChild(testDiv);
            
            try {
              const actualHeight = testDiv.offsetHeight;
              const actualWidth = testDiv.offsetWidth;
              
              // Measure natural width without constraints
              testDiv.style.width = 'auto';
              testDiv.style.whiteSpace = 'nowrap';
              const naturalWidth = testDiv.offsetWidth;
              
              // Reset for line counting
              testDiv.style.width = width + 'px';
              testDiv.style.whiteSpace = 'pre-wrap';
              
              // Count lines by measuring height of single line vs total height
              const singleLineDiv = testDiv.cloneNode(true);
              singleLineDiv.style.whiteSpace = 'nowrap';
              singleLineDiv.style.width = 'auto';
              singleLineDiv.textContent = 'Mg'; // Use tall characters
              document.body.appendChild(singleLineDiv);
              const singleLineHeight = singleLineDiv.offsetHeight;
              document.body.removeChild(singleLineDiv);
              
              const lineCount = Math.max(1, Math.round(actualHeight / singleLineHeight));
              
              return {
                actualHeight,
                actualWidth,
                lineCount,
                naturalWidth,
                hasOverflow: naturalWidth > width,
                singleLineHeight
              };
            } finally {
              document.body.removeChild(testDiv);
            }
          };
          
          return measureText(
            ${JSON.stringify(content)}, 
            ${fontSize}, 
            ${JSON.stringify(fontFamily)}, 
            ${width}, 
            ${lineHeight || 1.2}
          );
        })()
      `);

      // Convert to our expected format
      return {
        height: result.actualHeight,
        width: Math.min(result.naturalWidth, width), // Use natural width if it fits
        lineBreakInfo: result.lineCount > 1
          ? `Text spans ${result.lineCount} lines. ${result.hasOverflow ? `Overflows container (Natural: ${result.naturalWidth}px, Container: ${width}px)` : `Fits within container width.`}`
          : null
      };
    } catch (error) {
      console.error('Error measuring text with renderer:', error);
      console.log('Falling back to estimation for text measurement');
      
      // Fallback to estimation if renderer measurement fails
      return estimateTextDimensions(content, fontSize, width);
    }
  }

  /**
   * Enhanced measurement that also returns positioning information
   */
  async measureTextWithPosition(
    content: string,
    fontSize: number,
    fontFamily: string = 'Arial',
    width: number,
    height: number,
    align: 'left' | 'center' | 'right' = 'left',
    verticalAlign: 'top' | 'middle' | 'bottom' = 'top'
  ): Promise<TextDimensionResult & { suggestedHeight?: number }> {
    const measurement = await this.measureText(content, fontSize, fontFamily, width);
    
    // Suggest height adjustment if current height is too small
    let suggestedHeight: number | undefined;
    if (measurement.height > height) {
      suggestedHeight = Math.ceil(measurement.height);
    }

    return {
      ...measurement,
      suggestedHeight
    };
  }

  /**
   * Checks for overlaps using actual DOM bounding boxes from the frontend
   * This is more accurate than calculation-based methods as it uses real rendered elements
   */
  async checkOverlapWithDOM(
    newElementPosition: { x: number; y: number },
    newElementSize: { width: number; height: number },
    excludeElementId?: string
  ): Promise<{
    hasOverlap: boolean;
    overlappingElements: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      bounds: { left: number; top: number; right: number; bottom: number };
    }>;
    isOutsideSlide: boolean;
  }> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('Main window not available for DOM-based overlap detection');
      return {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide: false
      };
    }

    try {
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const SLIDE_WIDTH = 1280;
          const SLIDE_HEIGHT = 720;
          
          const newElementBounds = {
            left: ${newElementPosition.x},
            top: ${newElementPosition.y},
            right: ${newElementPosition.x + newElementSize.width},
            bottom: ${newElementPosition.y + newElementSize.height}
          };
          
          // Check if new element is outside slide boundaries
          const isOutsideSlide = 
            newElementBounds.left < 0 || 
            newElementBounds.top < 0 || 
            newElementBounds.right > SLIDE_WIDTH || 
            newElementBounds.bottom > SLIDE_HEIGHT;
          
          const overlappingElements = [];
          
          // Find all rendered elements in the slide
          // Look for elements with data-element-id attribute (or similar identifier)
          const slideElements = document.querySelectorAll('[data-element-id]');
          
          slideElements.forEach(element => {
            const elementId = element.getAttribute('data-element-id');
            const elementType = element.getAttribute('data-element-type') || 'unknown';
            
            // Skip the element being excluded (e.g., the one being updated)
            if (${excludeElementId ? `elementId === '${excludeElementId}'` : 'false'}) {
              return;
            }
            
            // Get actual bounding box from DOM
            const rect = element.getBoundingClientRect();
            
            // Convert to slide coordinates (assuming slide container is at 0,0)
            // You may need to adjust this based on your slide container's position
            const slideContainer = document.querySelector('[data-slide-container]') || document.body;
            const containerRect = slideContainer.getBoundingClientRect();
            
            const elementBounds = {
              left: rect.left - containerRect.left,
              top: rect.top - containerRect.top,
              right: rect.right - containerRect.left,
              bottom: rect.bottom - containerRect.top
            };
            
            // Check for overlap using actual bounding boxes
            const hasOverlap = !(
              newElementBounds.right <= elementBounds.left ||
              newElementBounds.left >= elementBounds.right ||
              newElementBounds.bottom <= elementBounds.top ||
              newElementBounds.top >= elementBounds.bottom
            );
            
            if (hasOverlap) {
              console.log('DOM overlap detected:', {
                newElement: newElementBounds,
                existingElement: { id: elementId, type: elementType, bounds: elementBounds }
              });
              
              overlappingElements.push({
                id: elementId,
                type: elementType,
                position: {
                  x: elementBounds.left,
                  y: elementBounds.top
                },
                bounds: elementBounds
              });
            }
          });
          
          return {
            hasOverlap: overlappingElements.length > 0,
            overlappingElements,
            isOutsideSlide
          };
        })()
      `);

      return result;
    } catch (error) {
      console.error('Error checking overlap with DOM:', error);
      return {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide: false
      };
    }
  }
}

export const textMeasurementService = TextMeasurementService.getInstance();