import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class GridAlignTool extends BaseTool {
  name = 'gridAlign';

  description =
    'Snap elements to an invisible grid for clean, organized layouts';

  requiredParams = {
    slideId: 'The ID of the slide containing the elements',
    elementIds: 'Comma-separated list of element IDs to align to grid',
    gridSize:
      'Grid cell size in pixels (e.g., 20 for 20px grid cells). Common values: 10, 20, 25, 40, 50',
    snapMode:
      'How to snap elements: "top-left" (snap top-left corner), "center" (snap center point), "nearest-corner" (snap to nearest grid intersection)',
    gridOrigin:
      'Optional grid origin point as "x,y" (defaults to "0,0"). Use this to offset the entire grid.',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const {
      slideId,
      elementIds,
      gridSize,
      snapMode,
      gridOrigin = '0,0',
    } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    if (!elementIds) {
      return {
        success: false,
        error: 'elementIds is required',
      };
    }

    if (!gridSize || isNaN(Number(gridSize))) {
      return {
        success: false,
        error: 'gridSize is required and must be a number',
      };
    }

    const validSnapModes = ['top-left', 'center', 'nearest-corner'];
    if (!snapMode || !validSnapModes.includes(snapMode)) {
      return {
        success: false,
        error: `snapMode must be one of: ${validSnapModes.join(', ')}`,
      };
    }

    // Parse grid origin
    const originParts = gridOrigin.split(',').map((s: string) => s.trim());
    if (
      originParts.length !== 2 ||
      originParts.some((p: string) => isNaN(Number(p)))
    ) {
      return {
        success: false,
        error: 'gridOrigin must be in format "x,y" (e.g., "0,0" or "10,20")',
      };
    }

    const originX = Number(originParts[0]);
    const originY = Number(originParts[1]);
    const cellSize = Number(gridSize);

    // Parse element IDs
    const elementIdList = elementIds
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);

    if (elementIdList.length === 0) {
      return {
        success: false,
        error: 'At least one element is required',
      };
    }

    // Find the slide
    const currentPresentation = presentationService.getPresentation();
    const slide = currentPresentation.slides.find((s) => s.id === slideId);

    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }

    // Find all elements to align
    const elementsToAlign = slide.elements.filter((element) =>
      elementIdList.includes(element.id),
    );

    if (elementsToAlign.length !== elementIdList.length) {
      const missingIds = elementIdList.filter(
        (id: string) => !slide.elements.some((el) => el.id === id),
      );
      return {
        success: false,
        error: `Some elements were not found: ${missingIds.join(', ')}`,
      };
    }

    const updates: Array<{
      id: string;
      updates: any;
      originalPos: { x: number; y: number };
      newPos: { x: number; y: number };
    }> = [];

    // Snap each element to the grid
    elementsToAlign.forEach((element) => {
      let snapX: number;
      let snapY: number;

      switch (snapMode) {
        case 'top-left':
          // Snap the top-left corner to the nearest grid intersection
          snapX = this.snapToGrid(element.position.x, cellSize, originX);
          snapY = this.snapToGrid(element.position.y, cellSize, originY);
          break;

        case 'center':
          // Snap the center point to the nearest grid intersection
          const centerX = element.position.x + element.size.width / 2;
          const centerY = element.position.y + element.size.height / 2;
          const snappedCenterX = this.snapToGrid(centerX, cellSize, originX);
          const snappedCenterY = this.snapToGrid(centerY, cellSize, originY);
          snapX = snappedCenterX - element.size.width / 2;
          snapY = snappedCenterY - element.size.height / 2;
          break;

        case 'nearest-corner':
          // Find the corner that's closest to a grid intersection and snap that
          const corners = [
            { x: element.position.x, y: element.position.y }, // top-left
            {
              x: element.position.x + element.size.width,
              y: element.position.y,
            }, // top-right
            {
              x: element.position.x,
              y: element.position.y + element.size.height,
            }, // bottom-left
            {
              x: element.position.x + element.size.width,
              y: element.position.y + element.size.height,
            }, // bottom-right
          ];

          let minDistance = Infinity;
          let bestSnap = { x: element.position.x, y: element.position.y };

          corners.forEach((corner, index) => {
            const snappedX = this.snapToGrid(corner.x, cellSize, originX);
            const snappedY = this.snapToGrid(corner.y, cellSize, originY);
            const distance = Math.sqrt(
              (corner.x - snappedX) ** 2 + (corner.y - snappedY) ** 2,
            );

            if (distance < minDistance) {
              minDistance = distance;
              // Calculate element position based on which corner was snapped
              switch (index) {
                case 0: // top-left
                  bestSnap = { x: snappedX, y: snappedY };
                  break;
                case 1: // top-right
                  bestSnap = { x: snappedX - element.size.width, y: snappedY };
                  break;
                case 2: // bottom-left
                  bestSnap = { x: snappedX, y: snappedY - element.size.height };
                  break;
                case 3: // bottom-right
                  bestSnap = {
                    x: snappedX - element.size.width,
                    y: snappedY - element.size.height,
                  };
                  break;
              }
            }
          });

          snapX = bestSnap.x;
          snapY = bestSnap.y;
          break;

        default:
          snapX = element.position.x;
          snapY = element.position.y;
      }

      // Ensure the element stays within slide bounds
      snapX = Math.max(0, Math.min(snapX, 1280 - element.size.width));
      snapY = Math.max(0, Math.min(snapY, 720 - element.size.height));

      // Only add update if position actually changes
      const positionChanged =
        Math.abs(snapX - element.position.x) > 0.5 ||
        Math.abs(snapY - element.position.y) > 0.5;

      if (positionChanged) {
        updates.push({
          id: element.id,
          updates: {
            position: { x: Math.round(snapX), y: Math.round(snapY) },
          },
          originalPos: { x: element.position.x, y: element.position.y },
          newPos: { x: Math.round(snapX), y: Math.round(snapY) },
        });
      }
    });

    if (updates.length === 0) {
      return {
        success: true,
        data: {
          message: 'Elements are already aligned to the grid',
          gridInfo: {
            cellSize,
            origin: { x: originX, y: originY },
            snapMode,
          },
        },
      };
    }

    // Apply all updates
    for (const update of updates) {
      presentationService.updateElement(update.id, update.updates);
    }

    // Create detailed feedback about the grid alignment
    const movementSummary = updates.map(
      (update) =>
        `${update.id.substring(0, 8)}... moved from (${update.originalPos.x}, ${update.originalPos.y}) to (${update.newPos.x}, ${update.newPos.y})`,
    );

    return {
      success: true,
      data: {
        message: `Successfully aligned ${updates.length} elements to ${cellSize}px grid using "${snapMode}" snap mode`,
        gridInfo: {
          cellSize,
          origin: { x: originX, y: originY },
          snapMode,
          elementsAligned: updates.length,
        },
        movements: movementSummary,
        updates,
      },
      editedSlidesIds: [slideId],
    };
  }

  /**
   * Snaps a coordinate to the nearest grid line
   */
  private snapToGrid(
    coordinate: number,
    gridSize: number,
    origin: number,
  ): number {
    const relativeCoord = coordinate - origin;
    const snappedRelative = Math.round(relativeCoord / gridSize) * gridSize;
    return snappedRelative + origin;
  }
}
