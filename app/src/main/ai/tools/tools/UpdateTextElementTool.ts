import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { TextBox } from '../../../../common/domain/entities/types';

export class UpdateTextElementTool extends BaseTool {
  name = 'updateTextElement';
  description = 'Update an existing text element on a slide';
  requiredParams = {
    elementId: 'The ID of the text element to update',
    content: 'The new text content (optional)',
    fontSize: 'The new font size (optional)',
    fontFamily: 'The new font family (optional)',
    color: 'The new text color (optional)',
    x: 'New X position (optional)',
    y: 'New Y position (optional)',
    positionReference: 'The reference position of the element (optional, defaults to top left), choose from top left or center',
    width: 'New width (optional)',
    height: 'New height (optional)',
    borderRadius: 'The new border radius (optional)',
    backgroundColor: 'The new background color (optional)',
    backgroundOpacity: 'The new background opacity (optional)',
    align: 'The new alignment of the element (optional)',
    verticalAlign: 'The new vertical alignment of the element (optional)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const {
      elementId,
      content,
      fontSize,
      fontFamily,
      color,
      x,
      y,
      positionReference,
      width,
      height,
      borderRadius,
      backgroundColor,
      backgroundOpacity,
      align,
      verticalAlign,
    } = params;

    if (!elementId) {
      return {
        success: false,
        error: 'elementId is required',
      };
    }

    if (
      !content &&
      !fontSize &&
      !fontFamily &&
      !color &&
      x === undefined &&
      y === undefined &&
      width === undefined &&
      height === undefined
    ) {
      return {
        success: false,
        error: 'At least one property to update must be provided',
      };
    }

    let targetElement: TextBox | null = null;
    let slideId: string | null = null;

    const currentPresentation = presentationService.getPresentation();

    for (const slide of currentPresentation.slides) {
      const element = slide.elements.find(
        (e) => e.id === elementId,
      ) as TextBox;
      if (element && element.type === 'textbox') {
        targetElement = element;
        slideId = slide.id;
        break;
      }
    }

    if (!targetElement || !slideId) {
      return {
        success: false,
        error: `Text element with ID ${elementId} not found, or element is not a text element`,
      };
    }

    const updates: Partial<TextBox> = {};

    if (content !== undefined) updates.content = content;
    if (fontSize !== undefined) updates.fontSize = Number(fontSize);
    if (fontFamily !== undefined) updates.fontFamily = fontFamily;
    if (color !== undefined) updates.color = color;
    if (borderRadius !== undefined)
      updates.borderRadius = Number(borderRadius);
    if (backgroundColor !== undefined)
      updates.backgroundColor = backgroundColor;
    if (backgroundOpacity !== undefined)
      updates.backgroundOpacity = Number(backgroundOpacity);
    if (align !== undefined) updates.align = align;
    if (verticalAlign !== undefined) updates.verticalAlign = verticalAlign;

    if (x !== undefined || y !== undefined) {
      let xPos = x !== undefined ? Number(x) : targetElement.position.x;
      let yPos = y !== undefined ? Number(y) : targetElement.position.y;
      
      const widthValue = width !== undefined ? Number(width) : targetElement.size.width;
      const heightValue = height !== undefined ? Number(height) : targetElement.size.height;
      
      if (positionReference === 'center') {
        xPos = xPos - (widthValue / 2);
        yPos = yPos - (heightValue / 2);
      }
      
      updates.position = { x: xPos, y: yPos };
    }

    if (width !== undefined || height !== undefined) {
      updates.size = {
        width:
          width !== undefined
            ? Number(width)
            : targetElement.size.width,
        height:
          height !== undefined
            ? Number(height)
            : targetElement.size.height,
      };
    }

    const updatedSlide = presentationService.updateElement(
      elementId,
      updates,
    );

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to update element with ID ${elementId}`,
      };
    }

    return {
      success: true,
      data: {
        elementId,
        slideId: updatedSlide.id,
        message: 'Text element updated successfully',
        updates: Object.keys(updates),
      },
    };
  }
} 