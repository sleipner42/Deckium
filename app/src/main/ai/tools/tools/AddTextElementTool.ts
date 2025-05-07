import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';
import { TextBox } from '../../../../common/domain/entities/types';
import { ElementValidator } from '../../../presentation/element-validator';

export class AddTextElementTool extends BaseTool {
  name = 'addTextElement';
  description = 'Add a text element to a slide';
  requiredParams = {
    slideId: 'The ID of the slide to add the element to',
    content: 'The text content to display',
    x: 'X position of the element (optional, defaults to 100)',
    y: 'Y position of the element (optional, defaults to 100)',
    //positionReference: 'The reference position of the element (optional, defaults to top left), choose from top left or center',
    width: 'The width of the element (optional, defaults to 400)',
    fontSize: 'The font size of the element (optional, defaults to 12)',
    fontFamily: 'The font family of the element (optional, defaults to Arial)',
    color: 'The color of the element (optional, defaults to black)',
    borderRadius: 'The border radius of the element (optional, defaults to 0)',
    backgroundColor: 'The background color of the element (optional, defaults to transparent)',
    backgroundOpacity: 'The background opacity of the element (optional, defaults to 1)',
    align: 'The alignment of the element (optional, defaults to left), choose from left, center, right',
    verticalAlign: 'The vertical alignment of the element (optional, defaults to top), choose from top, middle, bottom',
  };
  
  /**
   * Estimates the actual height of text content based on line count and font size
   * This is more accurate than using the element's declared height
   */
  private estimateTextHeight(content: string, fontSize: number): number {
    // Count the number of lines in the text
    const lineCount = content.split('\n').length;
    
    // Approximate line height based on font size (typically 1.2-1.5× the font size)
    const lineHeight = fontSize * 1.3;
    
    // Calculate total height with a small margin
    const totalHeight = (lineCount * lineHeight) + 20; // 20px extra for padding
    
    // For very short content (like titles), use a minimum height
    return Math.max(totalHeight, fontSize * 2);
  }

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const {
      slideId,
      content,
      x,
      y,
      //positionReference,
      fontSize,
      fontFamily,
      color,
      borderRadius,
      backgroundColor,
      backgroundOpacity,
      align,
      verticalAlign,
    } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    if (!content) {
      return {
        success: false,
        error: 'Content is required for text element',
      };
    }

    const width = Number(params.width) || 400;
    const height = Number(params.height) || 200;
    
    let xPos = Number(x) || 100;
    let yPos = Number(y) || 100;
    
    // if (positionReference === 'center') {
    //   xPos = xPos - (width / 2);
    //   yPos = yPos - (height / 2);
    // }

    // Get the current slide to check for overlaps
    const presentation = presentationService.getPresentation();
    const slide = presentation.slides.find(s => s.id === slideId);
    
    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }
    
    // Calculate a more realistic height based on content for overlap checking
    // Text height is often overestimated in the element size
    const estimatedContentHeight = this.estimateTextHeight(content, Number(fontSize) || 12);
    
    // Check for potential overlaps using a more realistic height estimate
    const elementPosition = { x: xPos, y: yPos };
    const elementSize = { 
      width, 
      height: Math.min(height, estimatedContentHeight) // Use the smaller of specified height or estimated
    };
    const overlapCheck = ElementValidator.checkOverlap(slide, elementPosition, elementSize);
    
    // We'll warn about overlap but not force repositioning to allow for intentional overlaps
    // if (overlapCheck.hasOverlap && overlapCheck.suggestedPosition) {
    //   xPos = overlapCheck.suggestedPosition.x;
    //   yPos = overlapCheck.suggestedPosition.y;
    // }
    
    const element = ElementFactory.createTextBox({
      content,
      position: { x: xPos, y: yPos },
      size: {
        width,
        height,
      },
      fontSize: Number(fontSize) || 12,
      fontFamily: fontFamily || 'Arial',
      color: color || '#000000',
      borderRadius: Number(borderRadius) || 0,
      backgroundColor: backgroundColor || 'transparent',
      backgroundOpacity: Number(backgroundOpacity) || 1,
      align: align || 'left',
      verticalAlign: verticalAlign || 'top',
    });

    const updatedSlide = presentationService.addElement(
      slideId,
      element,
    );

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to add element to slide with ID ${slideId}`,
      };
    }

    // Create appropriate message based on whether there was an overlap
    let message = `Text element added successfully.\n` +
      ElementFactory.calculateBoxAroundTextElement(element as TextBox);
      
    if (overlapCheck.isOutsideSlide) {
      message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). `;
      
      if (overlapCheck.suggestedPosition) {
        message += `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to ensure visibility.`;
      }
    }
    
    if (overlapCheck.hasOverlap) {
      message += `\n\nNOTE: This text element overlaps with other text elements: ${overlapCheck.overlappingElements.join(', ')}. `;
      
      if (overlapCheck.suggestedPosition) {
        message += `Consider using position (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to make text more readable.`;
      } else {
        message += `Please check the text placement to ensure readability.`;
      }
    }

    return {
      success: true,
      data: {
        elementId: element.id,
        slideId: updatedSlide.id,
        message,
      },
    };
  }
} 