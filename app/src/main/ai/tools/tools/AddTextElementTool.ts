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
    zIndex: 'The z-index of the element (optional, defaults to 1) - controls stacking order with higher values appearing on top',
  };
  
  /**
   * Estimates the actual height of text content based on line count, font size, and content width
   * This is more accurate than using the element's declared height
   */
  private estimateTextHeight(content: string, fontSize: number, width: number): number {
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
    const totalHeight = (totalLines * lineHeight) + 24; // 24px for padding
    
    // For titles or very short content, ensure minimum height based on font size
    const minHeight = fontSize * 2;
    
    return Math.max(totalHeight, minHeight);
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
    const fontSizeValue = Number(fontSize) || 12;
    const estimatedContentHeight = this.estimateTextHeight(content, fontSizeValue, width);
    
    // Check for potential overlaps using a more realistic height estimate
    const elementPosition = { x: xPos, y: yPos };
    // For collision detection, use a more precise estimation of text bounding box
    // Include a small margin around the text for better readability detection
    const elementSize = { 
      width: width + 10, // Add slight padding to width
      height: estimatedContentHeight + (fontSizeValue * 0.5) // Add a bit of extra height to catch partial overlaps
    };
    const overlapCheck = ElementValidator.checkOverlap(slide, elementPosition, elementSize);
    
    // We'll warn about overlap but not force repositioning to allow for intentional overlaps
    // if (overlapCheck.hasOverlap && overlapCheck.suggestedPosition) {
    //   xPos = overlapCheck.suggestedPosition.x;
    //   yPos = overlapCheck.suggestedPosition.y;
    // }
    
    // Use a standard z-index for text elements
    const zIndex = 1;
    
    const element = ElementFactory.createTextBox({
      content,
      position: { x: xPos, y: yPos },
      size: {
        width,
        height: Math.max(height, estimatedContentHeight), // Use estimated height if larger
      },
      fontSize: Number(fontSize) || 12,
      fontFamily: fontFamily || 'Arial',
      color: color || '#000000',
      borderRadius: Number(borderRadius) || 0,
      backgroundColor: backgroundColor || 'transparent',
      backgroundOpacity: Number(backgroundOpacity) || 1,
      align: align || 'left',
      verticalAlign: verticalAlign || 'top',
      zIndex: zIndex,
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
      message += `\n\nWARNING: OVERLAP DETECTED. This text element visually overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;
      
      if (overlapCheck.suggestedPosition) {
        message += `To avoid overlap, consider using position (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) or increase the z-index of this element to make it appear on top.`;
      } else {
        message += `Please check the text placement to ensure readability. You can also use the changeElementZIndex tool to adjust which elements appear on top of others. Elements with higher z-index values appear on top of elements with lower z-index values.`;
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