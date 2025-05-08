import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { TextBox } from '../../../../common/domain/entities/types';
import { ElementValidator } from '../../../presentation/element-validator';

export class UpdateTextElementTool extends BaseTool {
  name = 'updateTextElement';

  description = 'Update an existing text element on a slide';

  /**
   * Estimates the actual height of text content based on line count, font size, and content width
   * This is more accurate than using the element's declared height
   */
  private estimateTextHeight(
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

  requiredParams = {
    elementId: 'The ID of the text element to update',
    content: 'The new text content (optional)',
    fontSize: 'The new font size (optional)',
    fontFamily: 'The new font family (optional)',
    color: 'The new text color (optional)',
    x: 'New X position (optional)',
    y: 'New Y position (optional)',
    positionReference:
      'The reference position of the element (optional, defaults to top left), choose from top left or center',
    width: 'New width (optional)',
    height: 'New height (optional)',
    borderRadius: 'The new border radius (optional)',
    backgroundColor: 'The new background color (optional)',
    backgroundOpacity: 'The new background opacity (optional)',
    align: 'The new alignment of the element (optional)',
    verticalAlign: 'The new vertical alignment of the element (optional)',
    zIndex:
      'The new z-index value (optional) - controls stacking order with higher values appearing on top',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
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
      const element = slide.elements.find((e) => e.id === elementId) as TextBox;
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
    if (borderRadius !== undefined) updates.borderRadius = Number(borderRadius);
    if (backgroundColor !== undefined)
      updates.backgroundColor = backgroundColor;
    if (backgroundOpacity !== undefined)
      updates.backgroundOpacity = Number(backgroundOpacity);
    if (align !== undefined) updates.align = align;
    if (verticalAlign !== undefined) updates.verticalAlign = verticalAlign;
    if (params.zIndex !== undefined) updates.zIndex = Number(params.zIndex);

    if (x !== undefined || y !== undefined) {
      let xPos = x !== undefined ? Number(x) : targetElement.position.x;
      let yPos = y !== undefined ? Number(y) : targetElement.position.y;

      const widthValue =
        width !== undefined ? Number(width) : targetElement.size.width;
      const heightValue =
        height !== undefined ? Number(height) : targetElement.size.height;

      if (positionReference === 'center') {
        xPos -= widthValue / 2;
        yPos -= heightValue / 2;
      }

      updates.position = { x: xPos, y: yPos };
    }

    if (width !== undefined || height !== undefined) {
      updates.size = {
        width: width !== undefined ? Number(width) : targetElement.size.width,
        height:
          height !== undefined ? Number(height) : targetElement.size.height,
      };
    }

    // Check for potential overlaps if position or size is updated
    let overlapCheck = null;
    if (updates.position || updates.size) {
      const slide = currentPresentation.slides.find((s) => s.id === slideId);
      if (slide) {
        const newPosition = updates.position || targetElement.position;
        const newSize = updates.size || targetElement.size;

        // If we're updating content and font size, estimate a more accurate height
        let estimatedHeight = newSize.height;
        if (updates.content || updates.fontSize) {
          const contentToCheck =
            updates.content !== undefined
              ? updates.content
              : targetElement.content;
          const fontSizeToCheck =
            updates.fontSize !== undefined
              ? Number(updates.fontSize)
              : targetElement.fontSize;
          estimatedHeight = this.estimateTextHeight(
            contentToCheck,
            fontSizeToCheck,
            newSize.width,
          );
        }

        // For collision detection, use a more precise estimation of text bounding box
        const elementSize = {
          width: newSize.width + 10, // Add slight padding to width
          height:
            estimatedHeight +
            (updates.fontSize || targetElement.fontSize) * 0.5, // Add a bit of extra height for partial overlaps
        };

        // Check for overlaps with the new position/size
        // Pass the element ID to exclude the current element from overlap detection
        overlapCheck = ElementValidator.checkOverlap(
          slide,
          newPosition,
          elementSize,
          0, // Default padding
          elementId, // Exclude this element ID from overlap detection
        );
      }
    }

    const updatedSlide = presentationService.updateElement(elementId, updates);

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to update element with ID ${elementId}`,
      };
    }

    // Create appropriate message based on whether there was an overlap
    let message = 'Text element updated successfully';

    if (overlapCheck) {
      // Warn about elements outside slide boundaries
      if (overlapCheck.isOutsideSlide) {
        message += `\n\nWARNING: This text element is now positioned outside the slide boundaries (1280x720). `;

        if (overlapCheck.suggestedPosition) {
          message += `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to ensure visibility.`;
        }
      }

      // Warn about text overlaps
      if (overlapCheck.hasOverlap) {
        message += `\n\nWARNING: OVERLAP DETECTED. This text element now overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;

        if (overlapCheck.suggestedPosition) {
          message += `The closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}). Alternatively, you can increase the z-index of this element using the changeElementZIndex tool to make it appear on top.`;
        } else {
          message += `Please check the text placement to ensure readability. You can also use the changeElementZIndex tool to increase this element's z-index and make it appear on top of other elements. Elements with higher z-index values appear on top of elements with lower z-index values.`;
        }
      }
    }

    return {
      success: true,
      data: {
        elementId,
        slideId: updatedSlide.id,
        message,
        updates: Object.keys(updates),
      },
    };
  }
}
