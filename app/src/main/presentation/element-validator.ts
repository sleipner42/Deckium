import {
  ContentElement,
  Slide,
  Position,
  Size,
  TextBox,
} from '../../common/domain/entities/types';
import { textMeasurementService } from '../text-measurement/service';

export class ElementValidator {
  /**
   * Checks if an element overlaps with other elements using DOM-based detection
   * This is more accurate than calculation-based methods as it uses actual rendered bounding boxes
   *
   * @deprecated Use checkElementOverlap() instead for cleaner API with element ID-based detection
   *
   * WHAT THIS CHECKS:
   * - Uses getBoundingClientRect() which returns the complete visual element area including:
   *   • Text content area
   *   • CSS padding (4px on all sides for TextElement)
   *   • Borders, margins, visual decorations
   *   • Any other styling that affects the visual footprint
   * - This is the correct approach because users see visual overlap of elements, not just text content
   *
   * @param slide The slide to check for overlaps
   * @param elementId The ID of the element to check for overlaps (preferred method)
   * @param position Optional position for fallback if elementId not found
   * @param size Optional size for fallback if elementId not found
   * @param padding Optional padding around elements to create some spacing
   * @param excludeElementId Optional element ID to exclude from overlap checks
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
    try {
      // Use DOM-based overlap detection for maximum accuracy
      const domResult = await textMeasurementService.checkOverlapWithDOM(
        { x: position.x, y: position.y },
        { width: size.width, height: size.height },
        excludeElementId,
      );

      // Convert DOM result to expected format
      const overlappingElements = domResult.overlappingElements.map(
        (element) =>
          `${element.type} with id "${element.id}" at position (${element.position.x}, ${element.position.y})`,
      );

      // Generate suggested position if there are overlaps
      let suggestedPosition: Position | undefined;
      if (domResult.hasOverlap && domResult.overlappingElements.length > 0) {
        suggestedPosition = this.suggestNewPositionFromDOMElements(
          domResult.overlappingElements,
          size,
          slide,
          excludeElementId,
          padding,
        );
      } else if (domResult.isOutsideSlide) {
        // Suggest position that ensures element is inside slide
        suggestedPosition = {
          x: Math.max(0, Math.min(position.x, 1280 - size.width)),
          y: Math.max(0, Math.min(position.y, 720 - size.height)),
        };
      }

      console.log('DOM-based overlap detection result:', {
        hasOverlap: domResult.hasOverlap,
        overlappingCount: domResult.overlappingElements.length,
        isOutsideSlide: domResult.isOutsideSlide,
        suggestedPosition,
      });

      return {
        hasOverlap: domResult.hasOverlap,
        overlappingElements,
        isOutsideSlide: domResult.isOutsideSlide,
        suggestedPosition,
      };
    } catch (error) {
      console.error(
        'DOM-based overlap detection failed, using fallback:',
        error,
      );

      // Fallback to basic boundary checking if DOM detection fails
      const isOutsideSlide =
        position.x < 0 ||
        position.y < 0 ||
        position.x + size.width > 1280 ||
        position.y + size.height > 720;

      let suggestedPosition: Position | undefined;
      if (isOutsideSlide) {
        suggestedPosition = {
          x: Math.max(0, Math.min(position.x, 1280 - size.width)),
          y: Math.max(0, Math.min(position.y, 720 - size.height)),
        };
      }

      return {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide,
        suggestedPosition,
      };
    }
  }

  /**
   * Checks if an element overlaps with other elements using its DOM element ID
   * This is the most accurate method as it uses the actual rendered element bounds
   *
   * @param elementId The ID of the element to check for overlaps
   * @param padding Optional padding around elements to create some spacing
   * @returns Object containing overlap status and details for feedback
   */
  static async checkElementOverlap(
    elementId: string,
    padding: number = 0,
  ): Promise<{
    hasOverlap: boolean;
    overlappingElements: string[];
    isOutsideSlide: boolean;
    suggestedPosition?: Position;
  }> {
    try {
      // Use DOM-based overlap detection with element ID
      const domResult = await textMeasurementService.checkOverlapWithElementId(
        elementId,
        padding,
      );

      // Convert DOM result to expected format
      const overlappingElements = domResult.overlappingElements.map(
        (element) =>
          `${element.type} with id "${element.id}" at position (${element.position.x}, ${element.position.y})`,
      );

      // Generate suggested position if there are overlaps
      let suggestedPosition: Position | undefined;
      if (domResult.hasOverlap && domResult.overlappingElements.length > 0) {
        suggestedPosition = this.suggestNewPositionFromDOMElements(
          domResult.overlappingElements,
          {
            width: domResult.elementBounds?.width || 100,
            height: domResult.elementBounds?.height || 100,
          },
          null as any, // slide not needed for position suggestion
          undefined,
          padding,
        );
      }

      console.log('DOM-based element overlap detection result:', {
        elementId,
        hasOverlap: domResult.hasOverlap,
        overlappingCount: domResult.overlappingElements.length,
        isOutsideSlide: domResult.isOutsideSlide,
        suggestedPosition,
      });

      return {
        hasOverlap: domResult.hasOverlap,
        overlappingElements,
        isOutsideSlide: domResult.isOutsideSlide,
        suggestedPosition,
      };
    } catch (error) {
      console.error('DOM-based element overlap detection failed:', error);

      return {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide: false,
      };
    }
  }

  /**
   * Suggests a new position based on DOM element bounds
   */
  private static suggestNewPositionFromDOMElements(
    overlappingElements: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      bounds: { left: number; top: number; right: number; bottom: number };
    }>,
    newElementSize: Size,
    slide: Slide,
    excludeElementId?: string,
    padding: number = 0,
  ): Position {
    // Use the first overlapping element as reference
    const conflictingElement = overlappingElements[0];

    // Try to place below the conflicting element
    let suggestedX = conflictingElement.bounds.left;
    let suggestedY = conflictingElement.bounds.bottom + padding;

    if (
      suggestedX + newElementSize.width <= 1280 &&
      suggestedY + newElementSize.height <= 720
    ) {
      console.log(
        'DOM-based: Found suitable position below conflicting element',
      );
      return { x: suggestedX, y: suggestedY };
    }

    // Try to place to the right of the conflicting element
    suggestedX = conflictingElement.bounds.right + padding;
    suggestedY = conflictingElement.bounds.top;

    if (
      suggestedX + newElementSize.width <= 1280 &&
      suggestedY + newElementSize.height <= 720
    ) {
      console.log(
        'DOM-based: Found suitable position to the right of conflicting element',
      );
      return { x: suggestedX, y: suggestedY };
    }

    console.log('DOM-based: Using grid-based position suggestion as fallback');

    // Fall back to grid-based positioning
    return this.generateGridPositionFallback(newElementSize);
  }

  /**
   * Generates grid-based positions as fallback when DOM-based positioning doesn't find space
   */
  private static generateGridPositionFallback(elementSize: Size): Position {
    const gridSize = 4;
    const cellWidth = 1280 / gridSize;
    const cellHeight = 720 / gridSize;

    // Try each grid position
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const margin = 10;
        const x = col * cellWidth + margin;
        const y = row * cellHeight + margin;

        // Ensure the element fits within slide bounds
        if (x + elementSize.width <= 1280 && y + elementSize.height <= 720) {
          return { x, y };
        }
      }
    }

    // If no grid position works, return center
    return {
      x: Math.max(0, (1280 - elementSize.width) / 2),
      y: Math.max(0, (720 - elementSize.height) / 2),
    };
  }
}
