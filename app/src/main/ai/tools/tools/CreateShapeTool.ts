import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';
import { ElementValidator } from '../../../presentation/element-validator';

export class CreateShapeTool extends BaseTool {
  name = 'createShape';
  description = 'Create a shape element (rectangle, circle, or triangle) on a slide';
  requiredParams = {
    slideId: 'The ID of the slide to add the shape to',
    shapeType: 'The type of shape to create (rectangle, circle, or triangle)',
    x: 'X position of the element (optional, defaults to 100)',
    y: 'Y position of the element (optional, defaults to 100)',
    positionReference: 'The reference position of the element (optional, defaults to top left), choose from top left or center',
    width: 'The width of the element (optional, defaults to 150)',
    height: 'The height of the element (optional, defaults to 150)',
    fillColor: 'The fill color of the shape (optional, defaults to white)',
    strokeColor: 'The stroke/border color of the shape (optional, defaults to black)',
    strokeWidth: 'The stroke/border width of the shape (optional, defaults to 2)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const {
      slideId,
      shapeType,
      x,
      y,
      positionReference,
      width,
      height,
      fillColor,
      strokeColor,
      strokeWidth,
    } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    if (!shapeType || !['rectangle', 'circle', 'triangle'].includes(shapeType)) {
      return {
        success: false,
        error: 'shapeType is required and must be one of: rectangle, circle, triangle',
      };
    }

    const widthValue = Number(width) || 150;
    const heightValue = Number(height) || 150;
    
    let xPos = Number(x) || 100;
    let yPos = Number(y) || 100;
    
    if (positionReference === 'center') {
      xPos = xPos - (widthValue / 2);
      yPos = yPos - (heightValue / 2);
    }

    // Get the current slide to check for overlaps
    const presentation = presentationService.getPresentation();
    const slide = presentation.slides.find(s => s.id === slideId);
    
    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }
    
    // Check for potential overlaps before adding the element
    const elementPosition = { x: xPos, y: yPos };
    const elementSize = { width: widthValue, height: heightValue };
    const overlapCheck = ElementValidator.checkOverlap(slide, elementPosition, elementSize);
    
    // We'll warn about overlap but not force repositioning to allow for intentional overlaps with shapes
    // if (overlapCheck.hasOverlap && overlapCheck.suggestedPosition) {
    //   xPos = overlapCheck.suggestedPosition.x;
    //   yPos = overlapCheck.suggestedPosition.y;
    // }

    const element = ElementFactory.createShape({
      shapeType: shapeType as 'rectangle' | 'circle' | 'triangle',
      position: { x: xPos, y: yPos },
      size: {
        width: widthValue,
        height: heightValue,
      },
      fillColor: fillColor || '#FFFFFF',
      strokeColor: strokeColor || '#000000',
      strokeWidth: Number(strokeWidth) || 2,
    });

    const updatedSlide = presentationService.addElement(
      slideId,
      element,
    );

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to add shape to slide with ID ${slideId}`,
      };
    }

    // Create appropriate message based on whether there was an overlap
    let message = `${shapeType} shape added successfully`;
    
    if (overlapCheck.hasOverlap) {
      message += `\n\nNOTE: This element overlaps with existing elements: ${overlapCheck.overlappingElements.join(', ')}. `;
      
      if (overlapCheck.suggestedPosition) {
        message += `If this overlap was not intentional, consider using position (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) instead.`;
      } else {
        message += `If this overlap was not intentional, please check the element placement and consider repositioning if needed.`;
      }
    }

    return {
      success: true,
      data: {
        elementId: element.id,
        message,
        shapeInfo: {
          type: shapeType,
          position: { x: xPos, y: yPos },
          size: {
            width: widthValue,
            height: heightValue,
          },
          fillColor: fillColor || '#FFFFFF',
          strokeColor: strokeColor || '#000000',
          strokeWidth: Number(strokeWidth) || 2,
        },
      },
    };
  }
} 