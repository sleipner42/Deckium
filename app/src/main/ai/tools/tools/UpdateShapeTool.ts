import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { Shape } from '../../../../common/domain/entities/types';

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

    // If no updates were requested, return success
    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        data: {
          message: 'No updates were requested',
        },
      };
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

    return {
      success: true,
      data: {
        elementId,
        message: 'Shape updated successfully',
        updates,
      },
    };
  }
} 