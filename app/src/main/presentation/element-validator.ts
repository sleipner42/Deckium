import {
  ContentElement,
  Slide,
  Position,
  Size,
  TextBox,
} from '../../common/domain/entities/types';
import { estimateTextDimensions } from '../ai/tools/utils/text-dimensions';
import { textMeasurementService } from '../text-measurement/service';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

export class ElementValidator {
  /**
   * Gets precise text dimensions using frontend measurement service
   * Falls back to estimation if precise measurement fails
   * @returns An object with precise width and height
   */
  private static async measureTextDimensions(
    content: string,
    fontSize: number,
    fontFamily: string,
    width: number,
  ): Promise<{ width: number; height: number }> {
    try {
      const dimensions = await textMeasurementService.measureText(
        content,
        fontSize,
        fontFamily,
        width
      );
      return {
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      console.warn('Failed to get precise text measurements in ElementValidator, falling back to estimation:', error);
      // Fallback to estimation if precise measurement fails
      const dimensions = estimateTextDimensions(content, fontSize, width);
      return {
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  }

  /**
   * Legacy method for backward compatibility - now uses precise measurements
   * @deprecated Use measureTextDimensions instead for better accuracy
   */
  private static estimateTextDimensions(
    content: string,
    fontSize: number,
    width: number,
    fontFamily: string = 'Arial',
  ): { width: number; height: number } {
    // For synchronous calls, we still need to use estimation
    // But we'll log a warning to encourage migration to async version
    console.warn('Using legacy estimateTextDimensions - consider migrating to measureTextDimensions for better accuracy');
    const dimensions = estimateTextDimensions(content, fontSize, width);
    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  /**
   * Gets precise text height using frontend measurement service
   * @returns The actual height the text will occupy
   */
  private static async measureTextHeight(
    content: string,
    fontSize: number,
    fontFamily: string,
    width: number,
  ): Promise<number> {
    const dimensions = await this.measureTextDimensions(content, fontSize, fontFamily, width);
    return dimensions.height;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use measureTextHeight instead for better accuracy
   */
  private static estimateTextHeight(
    content: string,
    fontSize: number,
    width: number,
    fontFamily: string = 'Arial',
  ): number {
    return this.estimateTextDimensions(content, fontSize, width, fontFamily).height;
  }

  /**
   * Checks if a new element would overlap with text elements on a slide with precise measurements
   * or if it would be outside the slide boundaries
   * @param slide The slide to check for overlaps
   * @param position The position of the new element
   * @param size The size of the new element
   * @param padding Optional padding around elements to create some spacing
   * @returns Object containing overlap status and details for feedback
   */
  static async checkOverlapPrecise(
    slide: Slide,
    position: Position,
    size: Size,
    padding: number = 0,
    excludeElementId?: string,
  ): Promise<{
    hasOverlap: boolean;
    overlappingElements: string[];
    isOutsideSlide: boolean;
    suggestedPosition?: Position;
  }> {
    // Extract z-index from the position parameter if available
    const fallbackZIndex = 1;
    const zIndex =
      (position as any).hasOwnProperty('zIndex') && (position as any).zIndex !== undefined
        ? (position as any).zIndex
        : fallbackZIndex;

    // Check if we're dealing with a text element and can get more accurate dimensions
    let elementHeight = size.height;
    let elementWidth = size.width;

    // If the position parameter is actually a ContentElement and it's a textbox
    if ((position as any).hasOwnProperty('type') && (position as any).type === 'textbox') {
      const textElement = position as unknown as TextBox;
      if (textElement.content && textElement.fontSize) {
        // Account for TextElement component's 4px padding on all sides
        const TEXT_ELEMENT_PADDING = 4;
        const availableContentWidth = size.width - (TEXT_ELEMENT_PADDING * 2);
        
        const preciseDimensions = await this.measureTextDimensions(
          textElement.content,
          textElement.fontSize,
          textElement.fontFamily || 'Arial',
          availableContentWidth,
        );
        // Add padding to get total element dimensions
        elementHeight = preciseDimensions.height + (TEXT_ELEMENT_PADDING * 2);
        elementWidth = Math.min(preciseDimensions.width + (TEXT_ELEMENT_PADDING * 2), size.width);
        console.log(
          'Precise dimensions for new textbox (with padding):',
          elementWidth,
          'x',
          elementHeight,
        );
      }
    }

    return this.performOverlapCheck(
      slide,
      position,
      { width: elementWidth, height: elementHeight },
      padding,
      zIndex,
      excludeElementId,
      true // usePreciseMeasurements
    );
  }

  /**
   * Checks if a new element would overlap with text elements on a slide
   * or if it would be outside the slide boundaries
   * @param slide The slide to check for overlaps
   * @param position The position of the new element
   * @param size The size of the new element
   * @param padding Optional padding around elements to create some spacing
   * @returns Object containing overlap status and details for feedback
   * @deprecated Use checkOverlapPrecise for better accuracy with text elements
   */
  static checkOverlap(
    slide: Slide,
    position: Position,
    size: Size,
    padding: number = 0,
    excludeElementId?: string,
  ): {
    hasOverlap: boolean;
    overlappingElements: string[];
    isOutsideSlide: boolean;
    suggestedPosition?: Position;
  } {
    // Extract z-index from the position parameter if available
    const fallbackZIndex = 1;
    const zIndex =
      (position as any).hasOwnProperty('zIndex') && (position as any).zIndex !== undefined
        ? (position as any).zIndex
        : fallbackZIndex;

    // Check if we're dealing with a text element and can get more accurate dimensions
    let elementHeight = size.height;
    let elementWidth = size.width;

    // If the position parameter is actually a ContentElement and it's a textbox
    if ((position as any).hasOwnProperty('type') && (position as any).type === 'textbox') {
      const textElement = position as unknown as TextBox;
      if (textElement.content && textElement.fontSize) {
        // Account for TextElement component's 4px padding on all sides
        const TEXT_ELEMENT_PADDING = 4;
        const availableContentWidth = size.width - (TEXT_ELEMENT_PADDING * 2);
        
        const estimatedDimensions = this.estimateTextDimensions(
          textElement.content,
          textElement.fontSize,
          availableContentWidth,
          textElement.fontFamily || 'Arial',
        );
        // Add padding to get total element dimensions
        elementHeight = estimatedDimensions.height + (TEXT_ELEMENT_PADDING * 2);
        elementWidth = Math.min(estimatedDimensions.width + (TEXT_ELEMENT_PADDING * 2), size.width);
        console.log(
          'Estimated dimensions for new textbox (with padding):',
          elementWidth,
          'x',
          elementHeight,
        );
      }
    }

    // For sync version, call performOverlapCheck synchronously
    // This creates a Promise but we need to handle it synchronously for backward compatibility
    const result = this.performOverlapCheckSync(
      slide,
      position,
      { width: elementWidth, height: elementHeight },
      padding,
      zIndex,
      excludeElementId,
      false // usePreciseMeasurements
    );
    return result;
  }

  /**
   * Synchronous version of overlap checking for backward compatibility
   */
  private static performOverlapCheckSync(
    slide: Slide,
    position: Position,
    size: Size,
    padding: number,
    zIndex: number,
    excludeElementId?: string,
    usePreciseMeasurements: boolean = false
  ): {
    hasOverlap: boolean;
    overlappingElements: string[];
    isOutsideSlide: boolean;
    suggestedPosition?: Position;
  } {
    const newElementBox: BoundingBox = {
      x: position.x - padding,
      y: position.y - padding,
      width: size.width + padding * 2,
      height: size.height + padding * 2,
      zIndex,
    };

    // Check if element is outside slide boundaries (1280x720)
    const isOutsideSlide =
      position.x < 0 ||
      position.y < 0 ||
      position.x + size.width > 1280 ||
      position.y + size.height > 720;

    const overlappingElements: string[] = [];
    let mostSignificantOverlap = 0;
    let conflictingElement: BoundingBox | null = null;

    // Only check for overlaps with text elements
    for (const element of slide.elements) {
      // Skip the element being updated (if ID is provided) or non-text elements
      if (excludeElementId && element.id === excludeElementId) {
        continue;
      }

      // Skip non-text and image elements for overlap checking
      if (element.type !== 'textbox' && element.type !== 'image') {
        continue;
      }

      // Simple non-overlap check - elements are clearly separate if:
      const noOverlap =
        // Horizontally separated (no overlap)
        position.x >= element.position.x + element.size.width ||
        element.position.x >= position.x + size.width ||
        // Vertically separated (no overlap)
        position.y >= element.position.y + element.size.height ||
        element.position.y >= position.y + size.height;

      // If elements are clearly separate, consider it a valid layout
      const isValidLayout = noOverlap;
      const effectivePadding = isValidLayout ? 0 : padding;

      let elementHeight = element.size.height;
      let elementWidth = element.size.width;

      // For textbox elements, use only estimation in sync mode
      if (element.type === 'textbox') {
        const textElement = element as TextBox;
        
        // Account for TextElement component's 4px padding on all sides
        const TEXT_ELEMENT_PADDING = 4;
        const availableContentWidth = textElement.size.width - (TEXT_ELEMENT_PADDING * 2);
        
        const estimatedDimensions = this.estimateTextDimensions(
          textElement.content,
          textElement.fontSize,
          availableContentWidth,
          textElement.fontFamily || 'Arial',
        );
        // Add padding to get total element dimensions
        elementHeight = estimatedDimensions.height + (TEXT_ELEMENT_PADDING * 2);
        elementWidth = Math.min(estimatedDimensions.width + (TEXT_ELEMENT_PADDING * 2), element.size.width);
      }

      const elementBox: BoundingBox = {
        x: element.position.x - effectivePadding,
        y: element.position.y - effectivePadding,
        width: elementWidth + effectivePadding * 2,
        height: elementHeight + effectivePadding * 2,
        zIndex: element.zIndex || 1,
      };

      // Check if boxes overlap
      if (this.doBoxesOverlap(newElementBox, elementBox)) {
        // For valid layout patterns, don't count as overlap
        if (isValidLayout) {
          continue;
        }

        // Check z-index if both elements have it defined
        const newElementZIndex = newElementBox.zIndex !== undefined ? newElementBox.zIndex : 1;
        const existingElementZIndex = element.zIndex !== undefined ? element.zIndex : 1;

        // If new element is above existing one, don't consider it an overlap issue
        if (newElementZIndex > existingElementZIndex) {
          continue;
        }

        overlappingElements.push(
          `${element.type} at position (${element.position.x}, ${element.position.y})`,
        );

        // Calculate overlap area to find most significant overlap
        const overlapArea = this.calculateOverlapArea(newElementBox, elementBox);
        if (overlapArea > mostSignificantOverlap) {
          mostSignificantOverlap = overlapArea;
          conflictingElement = elementBox;
        }
      }
    }

    // If there are overlaps or outside boundaries, suggest a new position
    let suggestedPosition: Position | undefined;

    if (isOutsideSlide) {
      // Suggest position that ensures element is inside slide
      suggestedPosition = {
        x: Math.max(0, Math.min(position.x, 1280 - size.width)),
        y: Math.max(0, Math.min(position.y, 720 - size.height)),
      };
    } else if (overlappingElements.length > 0 && conflictingElement) {
      suggestedPosition = this.suggestNewPosition(
        conflictingElement,
        size,
        slide,
        excludeElementId,
      );
    }

    return {
      hasOverlap: overlappingElements.length > 0,
      overlappingElements,
      isOutsideSlide,
      suggestedPosition,
    };
  }

  /**
   * Shared method for performing overlap checking logic
   */
  private static async performOverlapCheck(
    slide: Slide,
    position: Position,
    size: Size,
    padding: number,
    zIndex: number,
    excludeElementId?: string,
    usePreciseMeasurements: boolean = false
  ): Promise<{
    hasOverlap: boolean;
    overlappingElements: string[];
    isOutsideSlide: boolean;
    suggestedPosition?: Position;
  }> {
    const newElementBox: BoundingBox = {
      x: position.x - padding,
      y: position.y - padding,
      width: size.width + padding * 2,
      height: size.height + padding * 2,
      zIndex,
    };

    // Check if element is outside slide boundaries (1280x720)
    const isOutsideSlide =
      position.x < 0 ||
      position.y < 0 ||
      position.x + size.width > 1280 ||
      position.y + size.height > 720;

    const overlappingElements: string[] = [];
    let mostSignificantOverlap = 0;
    let conflictingElement: BoundingBox | null = null;

    // Only check for overlaps with text elements
    for (const element of slide.elements) {
      // Skip the element being updated (if ID is provided) or non-text elements
      if (excludeElementId && element.id === excludeElementId) {
        continue;
      }

      // Skip non-text and image elements for overlap checking
      if (element.type !== 'textbox' && element.type !== 'image') {
        continue;
      }

      // Simple non-overlap check - elements are clearly separate if:
      const noOverlap =
        // Horizontally separated (no overlap)
        position.x >= element.position.x + element.size.width ||
        element.position.x >= position.x + size.width ||
        // Vertically separated (no overlap)
        position.y >= element.position.y + element.size.height ||
        element.position.y >= position.y + size.height;

      // If elements are clearly separate, consider it a valid layout
      const isValidLayout = noOverlap;
      const effectivePadding = isValidLayout ? 0 : padding;

      let elementHeight = element.size.height;
      let elementWidth = element.size.width;

      // For textbox elements, use precise or estimated dimensions
      if (element.type === 'textbox') {
        const textElement = element as TextBox;
        
        // Account for TextElement component's 4px padding on all sides
        const TEXT_ELEMENT_PADDING = 4;
        const availableContentWidth = textElement.size.width - (TEXT_ELEMENT_PADDING * 2);
        
        if (usePreciseMeasurements) {
          try {
            const preciseDimensions = await this.measureTextDimensions(
              textElement.content,
              textElement.fontSize,
              textElement.fontFamily || 'Arial',
              availableContentWidth,
            );
            // Add padding to get total element dimensions
            elementHeight = preciseDimensions.height + (TEXT_ELEMENT_PADDING * 2);
            elementWidth = Math.min(preciseDimensions.width + (TEXT_ELEMENT_PADDING * 2), element.size.width);
            console.log('Precise dimensions for existing textbox (with padding):', elementWidth, 'x', elementHeight);
          } catch (error) {
            // Fallback to estimation if precise measurement fails
            const estimatedDimensions = this.estimateTextDimensions(
              textElement.content,
              textElement.fontSize,
              availableContentWidth,
              textElement.fontFamily || 'Arial',
            );
            elementHeight = estimatedDimensions.height + (TEXT_ELEMENT_PADDING * 2);
            elementWidth = Math.min(estimatedDimensions.width + (TEXT_ELEMENT_PADDING * 2), element.size.width);
            console.log('Estimated dimensions for existing textbox (with padding, fallback):', elementWidth, 'x', elementHeight);
          }
        } else {
          const estimatedDimensions = this.estimateTextDimensions(
            textElement.content,
            textElement.fontSize,
            availableContentWidth,
            textElement.fontFamily || 'Arial',
          );
          elementHeight = estimatedDimensions.height + (TEXT_ELEMENT_PADDING * 2);
          elementWidth = Math.min(estimatedDimensions.width + (TEXT_ELEMENT_PADDING * 2), element.size.width);
          console.log('Estimated dimensions for existing textbox (with padding):', elementWidth, 'x', elementHeight);
        }
      }

      const elementBox: BoundingBox = {
        x: element.position.x - effectivePadding,
        y: element.position.y - effectivePadding,
        width: elementWidth + effectivePadding * 2,
        height: elementHeight + effectivePadding * 2,
        zIndex: element.zIndex || 1,
      };

      // Check if boxes overlap
      if (this.doBoxesOverlap(newElementBox, elementBox)) {
        // For valid layout patterns, don't count as overlap
        if (isValidLayout) {
          continue;
        }

        // Check z-index if both elements have it defined
        const newElementZIndex = newElementBox.zIndex !== undefined ? newElementBox.zIndex : 1;
        const existingElementZIndex = element.zIndex !== undefined ? element.zIndex : 1;

        // If new element is above existing one, don't consider it an overlap issue
        if (newElementZIndex > existingElementZIndex) {
          continue;
        }

        overlappingElements.push(
          `${element.type} at position (${element.position.x}, ${element.position.y})`,
        );

        // Calculate overlap area to find most significant overlap
        const overlapArea = this.calculateOverlapArea(newElementBox, elementBox);
        if (overlapArea > mostSignificantOverlap) {
          mostSignificantOverlap = overlapArea;
          conflictingElement = elementBox;
        }
      }
    }

    // If there are overlaps or outside boundaries, suggest a new position
    let suggestedPosition: Position | undefined;

    if (isOutsideSlide) {
      // Suggest position that ensures element is inside slide
      suggestedPosition = {
        x: Math.max(0, Math.min(position.x, 1280 - size.width)),
        y: Math.max(0, Math.min(position.y, 720 - size.height)),
      };
    } else if (overlappingElements.length > 0 && conflictingElement) {
      suggestedPosition = this.suggestNewPosition(
        conflictingElement,
        size,
        slide,
        excludeElementId,
      );
    }

    return {
      hasOverlap: overlappingElements.length > 0,
      overlappingElements,
      isOutsideSlide,
      suggestedPosition,
    };
  }

  /**
   * Determines if two bounding boxes overlap
   */
  private static doBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }

  /**
   * Calculates the area of overlap between two boxes
   */
  private static calculateOverlapArea(
    box1: BoundingBox,
    box2: BoundingBox,
  ): number {
    const xOverlap = Math.max(
      0,
      Math.min(box1.x + box1.width, box2.x + box2.width) -
        Math.max(box1.x, box2.x),
    );

    const yOverlap = Math.max(
      0,
      Math.min(box1.y + box1.height, box2.y + box2.height) -
        Math.max(box1.y, box2.y),
    );

    return xOverlap * yOverlap;
  }

  /**
   * Suggests a new position for an element to avoid overlaps
   */
  private static suggestNewPosition(
    conflictingElement: BoundingBox,
    newElementSize: Size,
    slide: Slide,
    excludeElementId?: string, // Add optional element ID to exclude from overlap checks
    padding = 0, // Add optional element ID to exclude from overlap checks
  ): Position {
    // Move down
    let suggestedX = conflictingElement.x;
    let suggestedY = conflictingElement.y + conflictingElement.height + padding;

    if (
      suggestedX + newElementSize.width <= 1280 &&
      suggestedY + newElementSize.height <= 720
    ) {
      console.log(
        'Found a suitable new position by looking down',
        suggestedX,
        suggestedY,
        conflictingElement.y,
        conflictingElement.height,
        padding,
      );

      return { x: suggestedX, y: suggestedY };
    }

    // Move right
    suggestedX = conflictingElement.x + conflictingElement.width + padding;
    suggestedY = conflictingElement.y;

    if (
      suggestedX + newElementSize.width <= 1280 &&
      suggestedY + newElementSize.height <= 720
    ) {
      return { x: suggestedX, y: suggestedY };
    }

    console.log(
      'Could not find a suitable new position by looking down and right. Trying grid method',
    );

    // Slide height
    // Find a free spot by dividing the slide into a grid
    const gridPositions = this.generateGridPositions(
      1280,
      720,
      newElementSize,
      4, // Default grid size
      excludeElementId, // Pass excluded element ID
    );

    for (const pos of gridPositions) {
      const testBox = {
        x: pos.x,
        y: pos.y,
        width: newElementSize.width,
        height: newElementSize.height,
      };

      // Check if this position overlaps with any existing element
      let hasOverlap = false;
      for (const element of slide.elements) {
        // Skip the element being updated (if ID is provided)
        if (excludeElementId && element.id === excludeElementId) {
          continue;
        }

        let elementHeight = element.size.height;
        let elementWidth = element.size.width;

        // For textbox elements, use the estimated dimensions for more accurate overlap detection
        if (element.type === 'textbox') {
          const textElement = element as TextBox;
          
          // Account for TextElement component's 4px padding on all sides
          const TEXT_ELEMENT_PADDING = 4;
          const availableContentWidth = textElement.size.width - (TEXT_ELEMENT_PADDING * 2);
          
          const estimatedDimensions = this.estimateTextDimensions(
            textElement.content,
            textElement.fontSize,
            availableContentWidth,
          );
          // Add padding to get total element dimensions
          elementHeight = estimatedDimensions.height + (TEXT_ELEMENT_PADDING * 2);
          elementWidth = Math.min(estimatedDimensions.width + (TEXT_ELEMENT_PADDING * 2), element.size.width);
          console.log(
            'Sug new pos. Estimated dimensions for textbox (with padding):',
            elementWidth,
            'x',
            elementHeight,
          );
        } else {
          console.log(
            'Sug new pos. Dimensions for non-textbox element:',
            elementWidth,
            'x',
            elementHeight,
          );
        }

        const elementBox = {
          x: element.position.x,
          y: element.position.y,
          width: elementWidth,
          height: elementHeight,
        };

        if (this.doBoxesOverlap(testBox, elementBox)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return pos;
      }
    }

    return { x: suggestedX, y: suggestedY };
  }

  /**
   * Generates a grid of potential positions for new elements
   */
  private static generateGridPositions(
    slideWidth: number,
    slideHeight: number,
    elementSize: Size,
    gridSize: number = 4,
    excludeElementId?: string, // Add optional element ID to exclude
  ): Position[] {
    const positions: Position[] = [];
    const cellWidth = slideWidth / gridSize;
    const cellHeight = slideHeight / gridSize;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Center in the cell with margins
        const margin = 10;
        const x = col * cellWidth + margin;
        const y = row * cellHeight + margin;

        // Ensure the element fits within slide bounds
        if (
          x + elementSize.width <= slideWidth &&
          y + elementSize.height <= slideHeight
        ) {
          positions.push({ x, y });
        }
      }
    }

    return positions;
  }
}
