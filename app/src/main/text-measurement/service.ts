import { BrowserWindow } from 'electron';
import { TextMeasurementRequest, TextMeasurementResult } from './ipc-handler';
import {
  estimateTextDimensions,
  TextDimensionResult,
} from '../ai/tools/utils/text-dimensions';

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
    lineHeight?: number,
  ): Promise<TextDimensionResult> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn(
        'Main window not available for precise text measurement, falling back to estimation',
      );
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

          // Simulate markdown processing to match TextElement rendering
          let processedContent = ${JSON.stringify(content)};

          // Remove markdown headers (# ## ### etc.) as they get processed by ReactMarkdown
          processedContent = processedContent.replace(/^#+\\s+/gm, '');

          // Remove bold/italic markdown that gets processed
          processedContent = processedContent.replace(/\\*\\*(.*?)\\*\\*/g, '$1');
          processedContent = processedContent.replace(/\\*(.*?)\\*/g, '$1');

          return measureText(
            processedContent,
            ${fontSize},
            ${JSON.stringify(fontFamily)},
            ${width},
            ${lineHeight || 1.2}
          );
        })()
      `);

      // Convert to our expected format and provide specific feedback
      let lineBreakInfo = null;

      if (result.lineCount > 1) {
        if (result.hasOverflow) {
          // Text overflows AND wraps - needs wider container
          // Account for TextElement's 4px padding on each side (8px total) plus 10px margin
          const recommendedWidth = Math.ceil(result.naturalWidth + 18);
          lineBreakInfo = `⚠️ TEXT OVERFLOW: Text spans ${result.lineCount} lines and overflows container. Natural text width: ${result.naturalWidth}px (current container: ${width}px). Consider increasing container width to ${recommendedWidth}px to fit on one line.`;
        } else {
          // Text wraps but fits - just informational
          lineBreakInfo = `ℹ️ TEXT WRAPPING: Text naturally spans ${result.lineCount} lines within the ${width}px container. This is normal text wrapping behavior.`;
        }
      }

      return {
        height: result.actualHeight,
        width: Math.min(result.naturalWidth, width), // Use natural width if it fits
        lineBreakInfo,
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
    verticalAlign: 'top' | 'middle' | 'bottom' = 'top',
  ): Promise<TextDimensionResult & { suggestedHeight?: number }> {
    const measurement = await this.measureText(
      content,
      fontSize,
      fontFamily,
      width,
    );

    // Suggest height adjustment if current height is too small
    let suggestedHeight: number | undefined;
    if (measurement.height > height) {
      suggestedHeight = Math.ceil(measurement.height);
    }

    return {
      ...measurement,
      suggestedHeight,
    };
  }

  /**
   * Checks for overlaps using an element ID to find the actual DOM element
   * This is the most accurate method as it uses the real rendered element bounds
   */
  async checkOverlapWithElementId(
    elementId: string,
    padding: number = 0,
  ): Promise<{
    hasOverlap: boolean;
    overlappingElements: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      bounds: { left: number; top: number; right: number; bottom: number };
    }>;
    isOutsideSlide: boolean;
    elementBounds?: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
  }> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn(
        'Main window not available for DOM-based element overlap detection',
      );
      return {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide: false,
      };
    }

    try {
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const SLIDE_WIDTH = 1280;
          const SLIDE_HEIGHT = 720;

          // Find the target element by its data-element-id
          const targetElement = document.querySelector('[data-element-id="${elementId}"]');
          if (!targetElement) {
            console.warn('Element with ID ${elementId} not found in DOM');
            return {
              hasOverlap: false,
              overlappingElements: [],
              isOutsideSlide: false,
              elementBounds: null
            };
          }

          // Get actual bounding box of the target element
          const targetRect = targetElement.getBoundingClientRect();

          // Convert to slide coordinates
          const slideContainer = document.querySelector('[data-slide-container]') || document.body;
          const containerRect = slideContainer.getBoundingClientRect();

          // TODO: Is this correct??
          const targetBounds = {
            left: targetRect.left - containerRect.left - ${padding},
            top: targetRect.top - containerRect.top - ${padding},
            right: targetRect.right - containerRect.left + ${padding},
            bottom: targetRect.bottom - containerRect.top + ${padding},
            width: targetRect.width + ${padding * 2},
            height: targetRect.height + ${padding * 2}
          };

          // Check if target element is outside slide boundaries
          const isOutsideSlide =
            targetBounds.left < 0 ||
            targetBounds.top < 0 ||
            targetBounds.right > SLIDE_WIDTH ||
            targetBounds.bottom > SLIDE_HEIGHT;

          const overlappingElements = [];

          // Find all other rendered elements in the slide
          const slideElements = document.querySelectorAll('[data-element-id]');
          const target_z_index = targetElement.getAttribute('z-index') || 'unknown';

          slideElements.forEach(element => {
            const elementId = element.getAttribute('data-element-id');
            const elementType = element.getAttribute('data-element-type') || 'unknown';
            const z_index = element.getAttribute('z-index') || 'unknown';

            // Skip the target element itself
            if (elementId === '${elementId}') {
              return;
            }

            // If the new elemnt is behind the other element, skip
            if (z_index !== 'unknown' && target_z_index !== 'unknown' && z_index > target_z_index) {
              return;
            }

            // Get actual bounding box from DOM
            const rect = element.getBoundingClientRect();

            const elementBounds = {
              left: rect.left - containerRect.left,
              top: rect.top - containerRect.top,
              right: rect.right - containerRect.left,
              bottom: rect.bottom - containerRect.top
            };

            // Check for overlap using actual bounding boxes
            const hasOverlap = !(
              targetBounds.right <= elementBounds.left ||
              targetBounds.left >= elementBounds.right ||
              targetBounds.bottom <= elementBounds.top ||
              targetBounds.top >= elementBounds.bottom
            );

            if (hasOverlap) {
              console.log('DOM element overlap detected:', {
                targetElement: '${elementId}',
                overlappingElement: { id: elementId, type: elementType, bounds: elementBounds }
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
            isOutsideSlide,
            elementBounds: targetBounds
          };
        })()
      `);

      return result;
    } catch (error) {
      console.error('Error checking element overlap with DOM:', error);
      return {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide: false,
      };
    }
  }

  /**
   * Checks for overlaps using actual DOM bounding boxes from the frontend
   * This is more accurate than calculation-based methods as it uses real rendered elements
   */
  async checkOverlapWithDOM(
    newElementPosition: { x: number; y: number },
    newElementSize: { width: number; height: number },
    excludeElementId?: string,
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
        isOutsideSlide: false,
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
        isOutsideSlide: false,
      };
    }
  }

  /**
   * Gets the actual rendered dimensions and text layout from DOM
   * This provides the most accurate information including all CSS effects
   */
  async getActualElementDimensions(elementId: string): Promise<{
    elementFound: boolean;
    containerBounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    textBounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    textOverflow?: {
      overflowsContainer: boolean;
      overflowsSlide: boolean;
      actualTextHeight: number;
      actualTextWidth: number;
      containerHeight: number;
      containerWidth: number;
      lineCount: number;
    };
    positioning?: {
      isOutsideSlide: boolean;
      slideCoordinates: { x: number; y: number; width: number; height: number };
    };
  }> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('Main window not available for DOM element dimension check');
      return { elementFound: false };
    }

    try {
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const SLIDE_WIDTH = 1280;
          const SLIDE_HEIGHT = 720;

          // Find the target element by its data-element-id
          const targetElement = document.querySelector('[data-element-id="${elementId}"]');
          if (!targetElement) {
            console.warn('Element with ID ${elementId} not found in DOM');
            return { elementFound: false };
          }

          // Get the slide container for coordinate conversion
          const slideContainer = document.querySelector('[data-slide-container]') || document.body;
          const containerRect = slideContainer.getBoundingClientRect();

          // Get element's bounding box (includes padding, borders, etc.)
          const elementRect = targetElement.getBoundingClientRect();

          // Convert to slide coordinates
          const containerBounds = {
            left: elementRect.left - containerRect.left,
            top: elementRect.top - containerRect.top,
            right: elementRect.right - containerRect.left,
            bottom: elementRect.bottom - containerRect.top,
            width: elementRect.width,
            height: elementRect.height,
            x: elementRect.left - containerRect.left,
            y: elementRect.top - containerRect.top
          };

          // Now get the actual text content bounds (excluding padding)
          let textBounds = null;
          let textOverflow = null;

          try {
            // Create a range to measure the actual text content
            const range = document.createRange();

            // Try to select all text content within the element
            // Handle both direct text nodes and nested React components
            const textNodes = [];
            const walker = document.createTreeWalker(
              targetElement,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );

            let node;
            while (node = walker.nextNode()) {
              if (node.textContent.trim()) {
                textNodes.push(node);
              }
            }

            if (textNodes.length > 0) {
              // Select from first to last text node to get the full text bounds
              range.setStartBefore(textNodes[0]);
              range.setEndAfter(textNodes[textNodes.length - 1]);

              const textRect = range.getBoundingClientRect();

              textBounds = {
                left: textRect.left - containerRect.left,
                top: textRect.top - containerRect.top,
                right: textRect.right - containerRect.left,
                bottom: textRect.bottom - containerRect.top,
                width: textRect.width,
                height: textRect.height,
                x: textRect.left - containerRect.left,
                y: textRect.top - containerRect.top
              };

              // Check for text overflow
              const overflowsContainer = (
                textRect.width > elementRect.width ||
                textRect.height > elementRect.height ||
                textRect.left < elementRect.left ||
                textRect.top < elementRect.top ||
                textRect.right > elementRect.right ||
                textRect.bottom > elementRect.bottom
              );

              const overflowsSlide = (
                textBounds.left < 0 ||
                textBounds.top < 0 ||
                textBounds.right > SLIDE_WIDTH ||
                textBounds.bottom > SLIDE_HEIGHT
              );

              // Count lines by checking line breaks in the rendered text
              const computedStyle = window.getComputedStyle(targetElement);
              const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
              const estimatedLines = Math.ceil(textRect.height / lineHeight);

              textOverflow = {
                overflowsContainer,
                overflowsSlide,
                actualTextHeight: textRect.height,
                actualTextWidth: textRect.width,
                containerHeight: elementRect.height,
                containerWidth: elementRect.width,
                lineCount: estimatedLines
              };
            }
          } catch (rangeError) {
            console.warn('Could not measure text content with range:', rangeError);
            // Fallback: use element bounds as text bounds
            textBounds = containerBounds;
            textOverflow = {
              overflowsContainer: false,
              overflowsSlide: containerBounds.right > SLIDE_WIDTH || containerBounds.bottom > SLIDE_HEIGHT,
              actualTextHeight: containerBounds.height,
              actualTextWidth: containerBounds.width,
              containerHeight: containerBounds.height,
              containerWidth: containerBounds.width,
              lineCount: 1
            };
          }

          // Check if element is outside slide boundaries
          const isOutsideSlide = (
            containerBounds.left < 0 ||
            containerBounds.top < 0 ||
            containerBounds.right > SLIDE_WIDTH ||
            containerBounds.bottom > SLIDE_HEIGHT
          );

          return {
            elementFound: true,
            containerBounds,
            textBounds,
            textOverflow,
            positioning: {
              isOutsideSlide,
              slideCoordinates: {
                x: containerBounds.x,
                y: containerBounds.y,
                width: containerBounds.width,
                height: containerBounds.height
              }
            }
          };
        })()
      `);

      return result;
    } catch (error) {
      console.error('Error getting actual element dimensions:', error);
      return { elementFound: false };
    }
  }
}

export const textMeasurementService = TextMeasurementService.getInstance();
