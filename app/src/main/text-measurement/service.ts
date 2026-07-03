import { BrowserWindow } from 'electron';
import { PRESENTATION_DIMENSIONS } from '../../common/utils/constants';

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

    async getQuillTextDimensions(elementId: string): Promise<{
        elementFound: boolean;
        quillInstance?: {
            totalLength: number;
            hasContent: boolean;
            scrollHeight: number;
            clientHeight: number;
            scrollWidth: number;
            clientWidth: number;
            isScrollable: boolean;
            contentOverflows: boolean;
        };
        containerBounds?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        textBounds?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        overflow?: {
            overflowsContainer: boolean;
            overflowsSlide: boolean;
            needsVerticalScroll: boolean;
            needsHorizontalScroll: boolean;
            lineCount: number;
        };
    }> {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.warn('Main window not available for Quill measurement');
            return { elementFound: false };
        }

        try {
            const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const SLIDE_WIDTH = ${PRESENTATION_DIMENSIONS.WIDTH};
          const SLIDE_HEIGHT = ${PRESENTATION_DIMENSIONS.HEIGHT};

          // Find the target element by its data-element-id
          const targetElement = document.querySelector('[data-element-id="${elementId}"]');
          if (!targetElement) {
            return { elementFound: false };
          }

          // Find the Quill editor instance within this element
          const quillContainer = targetElement.querySelector('.ql-editor');
          if (!quillContainer) {
            console.warn('No Quill editor found in element ${elementId}');
            return { elementFound: false };
          }

          // Try to access the Quill instance (stored on the parent container)
          let quillInstance = null;
          let quillData = null;

          // Look for Quill instance in the DOM node's __quill property
          let parentNode = targetElement;
          while (parentNode && !quillInstance) {
            if (parentNode.__quill) {
              quillInstance = parentNode.__quill;
              break;
            }
            parentNode = parentNode.firstElementChild;
          }

          if (quillInstance) {
            quillData = {
              totalLength: quillInstance.getLength(),
              hasContent: quillInstance.getLength() > 1, // Quill always has 1 for empty (newline)
              scrollHeight: quillContainer.scrollHeight,
              clientHeight: quillContainer.clientHeight,
              scrollWidth: quillContainer.scrollWidth,
              clientWidth: quillContainer.clientWidth,
              isScrollable: quillContainer.scrollHeight > quillContainer.clientHeight ||
                           quillContainer.scrollWidth > quillContainer.clientWidth,
              contentOverflows: quillContainer.scrollHeight > quillContainer.clientHeight
            };
          }

          // Get slide container for coordinate conversion
          const slideContainer = document.querySelector('[data-slide-container]') || document.body;
          const containerRect = slideContainer.getBoundingClientRect();

          // Get element's bounding box
          const elementRect = targetElement.getBoundingClientRect();
          const quillRect = quillContainer.getBoundingClientRect();

          // Convert to slide coordinates
          const containerBounds = {
            x: elementRect.left - containerRect.left,
            y: elementRect.top - containerRect.top,
            width: elementRect.width,
            height: elementRect.height
          };

          const textBounds = {
            x: quillRect.left - containerRect.left,
            y: quillRect.top - containerRect.top,
            width: quillRect.width,
            height: quillRect.height
          };

          // Calculate overflow
          const overflowsContainer = (
            quillRect.width > elementRect.width ||
            quillRect.height > elementRect.height
          );

          const overflowsSlide = (
            textBounds.x < 0 ||
            textBounds.y < 0 ||
            textBounds.x + textBounds.width > SLIDE_WIDTH ||
            textBounds.y + textBounds.height > SLIDE_HEIGHT
          );

          // Estimate line count from Quill content
          let lineCount = 1;
          if (quillData && quillData.hasContent) {
            const computedStyle = window.getComputedStyle(quillContainer);
            const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
            lineCount = Math.ceil(quillData.scrollHeight / lineHeight);
          }

          return {
            elementFound: true,
            quillInstance: quillData,
            containerBounds,
            textBounds,
            overflow: {
              overflowsContainer,
              overflowsSlide,
              needsVerticalScroll: quillData ? quillData.scrollHeight > quillData.clientHeight : false,
              needsHorizontalScroll: quillData ? quillData.scrollWidth > quillData.clientWidth : false,
              lineCount
            }
          };
        })()
      `);

            return result;
        } catch (error) {
            console.error('Error getting Quill text dimensions:', error);
            return { elementFound: false };
        }
    }

    async getActualTextSizeAndPosition(elementId: string): Promise<{
        elementFound: boolean;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }> {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.warn('Main window not available for textbox measurement');
            return { elementFound: false };
        }

        try {
            const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const slideNavigation = document.querySelector(".slide-navigation");
          if (!slideNavigation) {
            return { elementFound: false };
          }

          const targetElement = slideNavigation.querySelector('[data-element-id="${elementId}"]');
          if (!targetElement) {
            return { elementFound: false };
          }

          const qlEditor = targetElement.querySelector('.ql-editor');
          if (!qlEditor) {
            return { elementFound: false };
          }

          const slideContainer = targetElement.closest('.slide-container');
          if (!slideContainer) {
            return { elementFound: false };
          }

          const SLIDE_WIDTH = ${PRESENTATION_DIMENSIONS.WIDTH};
          const SLIDE_HEIGHT = ${PRESENTATION_DIMENSIONS.HEIGHT};

          const containerRect = slideContainer.getBoundingClientRect();

          const scaleX = SLIDE_WIDTH / containerRect.width;
          const scaleY = SLIDE_HEIGHT / containerRect.height;

          const childElements = qlEditor.children;

          if (childElements.length === 0) {
            return { elementFound: false };
          }

          let minX = Number.MAX_VALUE;
          let minY = Number.MAX_VALUE;
          let maxRight = Number.MIN_VALUE;
          let maxBottom = Number.MIN_VALUE;

          for (let i = 0; i < childElements.length; i++) {
            const element = childElements[i];
            const rect = element.getBoundingClientRect();

            if (rect.width > 0 && rect.height > 0) {
              const scaledX = (rect.left - containerRect.left) * scaleX;
              const scaledY = (rect.top - containerRect.top) * scaleY;
              const scaledWidth = rect.width * scaleX;
              const scaledHeight = rect.height * scaleY;
              const scaledRight = scaledX + scaledWidth;
              const scaledBottom = scaledY + scaledHeight;

              minX = Math.min(minX, scaledX);
              minY = Math.min(minY, scaledY);
              maxRight = Math.max(maxRight, scaledRight);
              maxBottom = Math.max(maxBottom, scaledBottom);
            }
          }

          return {
            elementFound: true,
            x: Math.round(minX),
            y: Math.round(minY),
            width: Math.round(maxRight - minX),
            height: Math.round(maxBottom - minY)
          };
        })()
      `);

            return result;
        } catch (error) {
            console.error('Error getting textbox size and position:', error);
            return { elementFound: false };
        }
    }

    async isElementInFrontOf(
        elementIdA: string,
        elementIdB: string,
    ): Promise<{
        elementAFound: boolean;
        elementBFound: boolean;
        isAInFrontOfB: boolean;
        zIndexA?: number;
        zIndexB?: number;
    }> {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.warn('Main window not available for z-index comparison');
            return {
                elementAFound: false,
                elementBFound: false,
                isAInFrontOfB: false,
            };
        }

        try {
            const result = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          const elementA = document.querySelector('[data-element-id="${elementIdA}"]');
          const elementB = document.querySelector('[data-element-id="${elementIdB}"]');

          if (!elementA || !elementB) {
            return {
              elementAFound: !!elementA,
              elementBFound: !!elementB,
              isAInFrontOfB: false
            };
          }

          // Get computed z-index values
          const computedStyleA = window.getComputedStyle(elementA);
          const computedStyleB = window.getComputedStyle(elementB);

          let zIndexA = parseInt(computedStyleA.zIndex);
          let zIndexB = parseInt(computedStyleB.zIndex);

          // Handle 'auto' z-index values (default to 0)
          if (isNaN(zIndexA)) zIndexA = 0;
          if (isNaN(zIndexB)) zIndexB = 0;

          return {
            elementAFound: true,
            elementBFound: true,
            isAInFrontOfB: zIndexA > zIndexB,
            zIndexA,
            zIndexB
          };
        })()
      `);

            return result;
        } catch (error) {
            console.error('Error comparing element z-index values:', error);
            return {
                elementAFound: false,
                elementBFound: false,
                isAInFrontOfB: false,
            };
        }
    }
}

export const textMeasurementService = TextMeasurementService.getInstance();
