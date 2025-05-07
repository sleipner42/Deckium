import {
  ContentElement,
  Slide,
  Position,
  Size,
} from '../../common/domain/entities/types';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ElementValidator {
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
    };

    // Check if element is outside slide boundaries (1280x720)
    const isOutsideSlide =
      position.x < 0 ||
      position.y < 0 ||
      position.x + size.width > 1280 ||
      position.y + size.height > 720;

    const overlappingElements: string[] = [];
    let mostSignificantOverlap = 0;
    let conflictingElement: ContentElement | null = null;

    // Only check for overlaps with text elements
    for (const element of slide.elements) {
      // Skip non-text elements for overlap checking
      if (element.type !== 'textbox') {
        continue;
      }

      // Special case for common text arrangements:
      // 1. Title followed by content (vertical stacking)
      // 2. Bullet points or list items
      // 3. Adjacent columns of text
      
      // Vertical stacking (title + content, or list items)
      const isVerticalArrangement = 
           // New element is clearly below existing element with reasonable spacing
           (position.y >= element.position.y + Math.min(element.size.height, 50) && 
           // Horizontally aligned or with minimal offset (column-like)
           Math.abs(position.x - element.position.x) < Math.max(30, element.size.width * 0.2));
      
      // Adjacent columns
      const isAdjacentColumn = 
           // Horizontally separated with reasonable gap
           (position.x >= element.position.x + element.size.width + 10 || 
            element.position.x >= position.x + size.width + 10) &&
           // Some vertical overlap (same row)
           !(position.y >= element.position.y + element.size.height || 
             element.position.y >= position.y + size.height);
             
      // If it's a common, valid layout pattern, don't consider it an overlap
      const isValidLayout = isVerticalArrangement || isAdjacentColumn;
      
      // Use a reduced padding for known layout patterns
      const effectivePadding = isValidLayout ? 0 : padding;

      const elementBox: BoundingBox = {
        x: element.position.x - effectivePadding,
        y: element.position.y - effectivePadding,
        width: element.size.width + effectivePadding * 2,
        height: element.size.height + effectivePadding * 2,
      };

      // Check if boxes overlap
      if (this.doBoxesOverlap(newElementBox, elementBox)) {
        // For valid layout patterns, don't count as overlap
        if (isValidLayout) {
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
          conflictingElement = element;
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
    conflictingElement: ContentElement,
    newElementSize: Size,
    slide: Slide,
  ): Position {
    // Try positioning below the conflicting element first (for bullet points and other text that should appear below titles)
    let suggestedX = conflictingElement.position.x;
    let suggestedY =
      conflictingElement.position.y + conflictingElement.size.height + 15; // Reduced from 20 to 15

    // If that would place it off the slide, try to the right of the element
    if (suggestedY + newElementSize.height > 720) {
      // Slide height
      suggestedX =
        conflictingElement.position.x + conflictingElement.size.width + 15;
      suggestedY = conflictingElement.position.y;
    }

    // If that would place it off the slide, try a position relative to slide size
    if (suggestedY + newElementSize.height > 720) {
      // Slide height
      // Find a free spot by dividing the slide into a grid
      const gridPositions = this.generateGridPositions(
        1280,
        720,
        newElementSize,
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
          const elementBox = {
            x: element.position.x,
            y: element.position.y,
            width: element.size.width,
            height: element.size.height,
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

