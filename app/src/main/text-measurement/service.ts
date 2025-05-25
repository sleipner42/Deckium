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
        lineBreakInfo: result.hasOverflow 
          ? `Text overflows container. Natural width: ${result.naturalWidth}px, Container width: ${width}px, Lines: ${result.lineCount}`
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
}

export const textMeasurementService = TextMeasurementService.getInstance();