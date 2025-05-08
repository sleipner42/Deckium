import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { Shape } from '../../../../common/domain/entities/types';
import { ElementValidator } from '../../../presentation/element-validator';

export class UpdateShapeTool extends BaseTool {
  name = 'updateShape';
  description = 'Update an existing shape element on a slide';
  requiredParams = {
    elementId: 'The ID of the shape element to update',
    x: 'New X position (optional)',
    y: 'New Y position (optional)',
    width: 'New width (optional)',
    height: 'New height (optional)',
    fillColor: 'New fill color (optional)',
    strokeColor: 'New stroke/border color (optional)',
    strokeWidth: 'New stroke/border width (optional)',
    zIndex: 'The new z-index value (optional) - controls stacking order with higher values appearing on top',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const {
      elementId,
      x,
      y,
      width,
      height,
      fillColor,
      strokeColor,
      strokeWidth,
      zIndex,
    } = params;

    if (!elementId) {
      return {
        success: false,
        error: 'elementId is required',
      };
    }

    // Find the element to ensure it's a shape
    const currentPresentation = presentationService.getPresentation();
    let foundElement = null;
    let slideId = null;

    for (const slide of currentPresentation.slides) {
      const element = slide.elements.find((e) => e.id === elementId);
      if (element) {
        foundElement = element;
        slideId = slide.id;
        break;
      }
    }

    if (!foundElement) {
      return {
        success: false,
        error: `Element with ID ${elementId} not found`,
      };
    }

    if (!['rectangle', 'circle', 'triangle'].includes(foundElement.type)) {
      return {
        success: false,
        error: `Element with ID ${elementId} is not a shape`,
      };
    }

    const shape = foundElement as Shape;
    const updates: Partial<Shape> = {};

    // Process position updates
    if (x !== undefined || y !== undefined) {
      updates.position = {
        x: x !== undefined ? Number(x) : shape.position.x,
        y: y !== undefined ? Number(y) : shape.position.y,
      };
    }

    // Process size updates
    if (width !== undefined || height !== undefined) {
      updates.size = {
        width: width !== undefined ? Number(width) : shape.size.width,
        height: height !== undefined ? Number(height) : shape.size.height,
      };
    }

    // Process other property updates
    if (fillColor !== undefined) {
      updates.fillColor = fillColor;
    }

    if (strokeColor !== undefined) {
      updates.strokeColor = strokeColor;
    }

    if (strokeWidth !== undefined) {
      updates.strokeWidth = Number(strokeWidth);
    }
    
    if (zIndex !== undefined) {
      updates.zIndex = Number(zIndex);
    }

    // If no updates were requested, return success
    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        data: {
          message: 'No updates were requested',
        },
      };
    }

    // Check for potential overlaps if position or size is updated
    let overlapCheck = null;
    if (updates.position || updates.size) {
      const slide = currentPresentation.slides.find(s => s.id === slideId);
      if (slide) {
        const newPosition = updates.position || shape.position;
        const newSize = updates.size || shape.size;
        
        // Check for overlaps with the new position/size
        overlapCheck = ElementValidator.checkOverlap(
          slide,
          newPosition,
          newSize,
        );
      }
    }

    // Update the element
    const updatedElement = presentationService.updateElement(
      elementId,
      updates,
    );

    if (!updatedElement) {
      return {
        success: false,
        error: `Failed to update shape with ID ${elementId}`,
      };
    }

    // Create appropriate message based on whether there was an overlap
    let message = 'Shape updated successfully';
    
    if (overlapCheck) {
      // Only warn about elements outside slide boundaries
      if (overlapCheck.isOutsideSlide) {
        message += `\n\nWARNING: This shape is now positioned outside the slide boundaries (1280x720). `;
        
        if (overlapCheck.suggestedPosition) {
          message += `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to ensure visibility.`;
        }
      }
      
      // Warn about text overlaps
      if (overlapCheck.hasOverlap) {
        message += `\n\nWARNING: OVERLAP DETECTED. This shape now overlaps with text elements: ${overlapCheck.overlappingElements.join(', ')}. `;
        
        if (overlapCheck.suggestedPosition) {
          message += `The closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}). Alternatively, you can adjust the z-index to control which element appears on top.`;
        } else {
          message += `Consider adjusting the z-index using the changeElementZIndex tool to control which elements appear on top. Elements with higher z-index values appear on top of elements with lower z-index values.`;
        }
      }
    }

    return {
      success: true,
      data: {
        elementId,
        message,
        updates,
      },
    };
  }
} 