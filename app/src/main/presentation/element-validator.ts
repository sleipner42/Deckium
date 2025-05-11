import {
  ContentElement,
  Slide,
  Position,
  Size,
  TextBox,
} from '../../common/domain/entities/types';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

export class ElementValidator {
  /**
   * Estimates the actual height of text content based on line count, font size, and content width
   * This is more accurate than using the element's declared height
   */
  private static estimateTextHeight(
    content: string,
    fontSize: number,
    width: number,
  ): number {
    // If there's no content, return a minimal height
    if (!content || content.trim() === '') {
      return fontSize * 1.5;
    }

    // Get all lines from explicit line breaks
    const lines = content.split('\n');
    let totalLines = 0;

    // Average character width for the given font size (approximation)
    const averageCharWidth = fontSize * 0.6;

    // Maximum characters per line at the given width
    const maxCharsPerLine = Math.floor((width - 20) / averageCharWidth); // 20px for padding

    // Calculate total lines accounting for wrapping
    for (const line of lines) {
      if (line.trim() === '') {
        totalLines += 1; // Count empty lines
      } else if (maxCharsPerLine > 0) {
        // Estimate wrapped lines based on character count
        totalLines += Math.max(1, Math.ceil(line.length / maxCharsPerLine));
      } else {
        totalLines += 1;
      }
    }

    // Approximate line height based on font size
    const lineHeight = fontSize * 1.4; // Slightly more space for readability

    // Calculate total height with padding
    const totalHeight = totalLines * lineHeight + 24; // 24px for padding

    // For titles or very short content, ensure minimum height based on font size
    const minHeight = fontSize * 2;

    return Math.max(totalHeight, minHeight);
  }

  /**
   * Checks if a new element would overlap with text elements on a slide
   * or if it would be outside the slide boundaries
   * @param slide The slide to check for overlaps
   * @param position The position of the new element
   * @param size The size of the new element
   * @param padding Optional padding around elements to create some spacing
   * @returns Object containing overlap status and details for feedback
   */
  static checkOverlap(
    slide: Slide,
    position: Position,
    size: Size,
    padding: number = 0,
    excludeElementId?: string, // Add optional parameter to exclude an element by ID (for updates)
  ): {
    hasOverlap: boolean;
    overlappingElements: string[];
    isOutsideSlide: boolean;
    suggestedPosition?: Position;
  } {
    // Extract z-index from the position parameter if available
    // The position parameter might actually be a ContentElement
    const fallbackZIndex = 1; // NOTE: Should this be 0?
    const zIndex =
      position.hasOwnProperty('zIndex') && position.zIndex !== undefined
        ? position.zIndex
        : fallbackZIndex;

    // Check if we're dealing with a text element and can get more accurate height
    let elementHeight = size.height;

    // If the position parameter is actually a ContentElement and it's a textbox
    if (position.hasOwnProperty('type') && position.type === 'textbox') {
      const textElement = position as unknown as TextBox;
      if (textElement.content && textElement.fontSize) {
        elementHeight = this.estimateTextHeight(
          textElement.content,
          textElement.fontSize,
          size.width,
        );
        // Add a small buffer for UI elements
        elementHeight += textElement.fontSize * 0.5;
      }
    }

    const newElementBox: BoundingBox = {
      x: position.x - padding,
      y: position.y - padding,
      width: size.width + padding * 2,
      height: elementHeight + padding * 2,
      zIndex,
    };

    // Check if element is outside slide boundaries (1280x720)
    const isOutsideSlide =
      position.x < 0 ||
      position.y < 0 ||
      position.x + size.width > 1280 ||
      position.y + elementHeight > 720;

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

      // Special case for common text arrangements:
      // 1. Title followed by content (vertical stacking)
      // 2. Bullet points or list items
      // 3. Adjacent columns of text

      // Simple non-overlap check - elements are clearly separate if:
      // 1. One is entirely to the right of the other
      // 2. One is entirely below the other
      const noOverlap =
        // Horizontally separated (no overlap)
        position.x >= element.position.x + element.size.width ||
        element.position.x >= position.x + size.width ||
        // Vertically separated (no overlap)
        position.y >= element.position.y + element.size.height ||
        element.position.y >= position.y + size.height;

      // If elements are clearly separate, consider it a valid layout
      const isValidLayout = noOverlap;

      // Use a reduced padding for known layout patterns
      const effectivePadding = isValidLayout ? 0 : padding;

      let elementHeight = element.size.height;
      // For textbox elements, use the estimated height for more accurate overlap detection
      if (element.type === 'textbox') {
        const textElement = element as TextBox;
        elementHeight = this.estimateTextHeight(
          textElement.content,
          textElement.fontSize,
          textElement.size.width,
        );
        // Add a small buffer to account for UI elements, padding, etc.
        // elementHeight += textElement.fontSize * 0.5;
        console.log('Other elem. Estimated height for textbox:', elementHeight);
      } else {
        console.log(
          'Other elem. Height for non-textbox element:',
          elementHeight,
        );
      }

      const elementBox: BoundingBox = {
        x: element.position.x - effectivePadding,
        y: element.position.y - effectivePadding,
        width: element.size.width + effectivePadding * 2,
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
        // Safely extract z-index from the elements
        const newElementZIndex =
          newElementBox.zIndex !== undefined
            ? newElementBox.zIndex
            : fallbackZIndex;

        const existingElementZIndex =
          element.zIndex !== undefined ? element.zIndex : fallbackZIndex;

        // If new element is above existing one, don't consider it an overlap issue
        // The higher z-index element will be rendered on top
        // NOTE: Is this correct?
        if (newElementZIndex > existingElementZIndex) {
          continue;
        }

        overlappingElements.push(
          `${element.type} at position (${element.position.x}, ${element.position.y})`,
        );

        // Calculate overlap area to find most significant overlap
        const overlapArea = this.calculateOverlapArea(
          newElementBox,
          elementBox,
        );
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

        // For textbox elements, use the estimated height for more accurate overlap detection
        if (element.type === 'textbox') {
          const textElement = element as TextBox;
          elementHeight = this.estimateTextHeight(
            textElement.content,
            textElement.fontSize,
            textElement.size.width,
          );
          // Add a small buffer to account for UI elements, padding, etc.
          elementHeight += textElement.fontSize * 0.5;
          console.log(
            'Sug new pos. Estimated height for textbox:',
            elementHeight,
          );
        } else {
          console.log(
            'Sug new pos. Height for non-textbox element:',
            elementHeight,
          );
        }

        const elementBox = {
          x: element.position.x,
          y: element.position.y,
          width: element.size.width,
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
