import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';
import { TextBox } from '../../../../common/domain/entities/types';
import { ElementValidator } from '../../../presentation/element-validator';
import { estimateTextDimensions } from '../utils/text-dimensions';
import { textMeasurementService } from '../../../text-measurement/service';

export class AddTextElementTool extends BaseTool {
  name = 'addTextElement';

  description = 'Add a text element to a slide';

  requiredParams = {
    slideId: 'The ID of the slide to add the element to',
    content:
      'The text content to display (supports rich text formatting with HTML though the Quill editor)',
    x: 'X position of the element (optional, defaults to 100)',
    y: 'Y position of the element (optional, defaults to 100)',
    // positionReference: 'The reference position of the element (optional, defaults to top left), choose from top left or center',
    width: 'The width of the element (optional, defaults to 400)',
    height: 'The height of the element (optional, defaults to 200)',
    fontSize: 'The font size of the element (optional, defaults to 12)',
    fontFamily: 'The font family of the element (optional, defaults to Arial)',
    color: 'The color of the element (optional, defaults to black)',
    borderRadius: 'The border radius of the element (optional, defaults to 0)',
    backgroundColor:
      'The background color of the element (optional, defaults to transparent)',
    backgroundOpacity:
      'The background opacity of the element (optional, defaults to 1)',
    align:
      'The alignment of the element (optional, defaults to left), choose from left, center, right',
    verticalAlign:
      'The vertical alignment of the element (optional, defaults to top), choose from top, middle, bottom',
    zIndex:
      'The z-index of the element (optional, defaults to 1) - controls stacking order with higher values appearing on top',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const {
      slideId,
      content,
      x,
      y,
      // positionReference,
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

    // Use consistent default positioning - center the element if no position provided
    const xPos = x !== undefined ? Number(x) : 1280 / 2 - width / 2;
    const yPos = y !== undefined ? Number(y) : 720 / 2 - height / 2;

    // if (positionReference === 'center') {
    //   xPos = xPos - (width / 2);
    //   yPos = yPos - (height / 2);
    // }

    // Get the current slide to check for overlaps
    const presentation = presentationService.getPresentation();
    const slide = presentation.slides.find((s) => s.id === slideId);

    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }

    // Use the provided z-index or default to 1
    const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;

    // Create element first
    const element = ElementFactory.createTextBox({
      content,
      position: { x: xPos, y: yPos },
      size: { width, height },
      fontSize: Number(fontSize) || 12,
      fontFamily: fontFamily || 'Arial',
      color: color || '#000000',
      borderRadius: Number(borderRadius) || 0,
      backgroundColor: backgroundColor || 'transparent',
      backgroundOpacity: Number(backgroundOpacity) || 1,
      align: align || 'left',
      verticalAlign: verticalAlign || 'top',
      zIndex,
    });

    // Add element to slide
    const updatedSlide = presentationService.addElement(slideId, element);

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to add element to slide with ID ${slideId}`,
      };
    }

    // Run DOM-based measurement and overlap detection on the actual rendered element
    let textDimensions = null;
    let overlapCheck = null;
    let actualDimensions = null;

    try {
      // Longer delay to ensure DOM updates, React rendering, and lazy-loaded components
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get actual text dimensions from the Quill editor
      textDimensions = await textMeasurementService.measureQuillText(element.id);

      // Get the actual DOM element dimensions and text layout
      actualDimensions =
        await textMeasurementService.getActualElementDimensions(element.id);

      // Check for overlaps using the actual rendered element ID
      overlapCheck = await ElementValidator.checkElementOverlap(
        element.id,
        0, // no padding
      );
    } catch (error) {
      console.warn(
        'Post-creation measurement and overlap detection failed:',
        error,
      );
      // Create fallback results
      textDimensions = { height, width, lineBreakInfo: null };
      overlapCheck = {
        hasOverlap: false,
        overlappingElements: [],
        isOutsideSlide: false,
      };
    }

    // Create message with text layout feedback
    let message = `Text element added successfully.\n${ElementFactory.calculateBoxAroundTextElement(
      element as TextBox,
    )}`;

    // Add actual DOM dimensions if available
    if (actualDimensions && actualDimensions.elementFound) {
      const { containerBounds, textBounds, textOverflow } = actualDimensions;

      message += `\n\nActual rendered dimensions:`;
      message += `\n  Container: x: ${containerBounds.x}, y: ${containerBounds.y}, width: ${containerBounds.width}, height: ${containerBounds.height}`;

      if (textBounds) {
        message += `\n  Text content: x: ${textBounds.x}, y: ${textBounds.y}, width: ${textBounds.width}, height: ${textBounds.height}`;
      }

      if (textOverflow) {
        if (textOverflow.overflowsContainer) {
          message += `\n\n⚠️ TEXT OVERFLOW DETECTED: Text extends outside its container.`;
          message += `\n  Text size: ${textOverflow.actualTextWidth}x${textOverflow.actualTextHeight}px`;
          message += `\n  Container size: ${textOverflow.containerWidth}x${textOverflow.containerHeight}px`;
          message += `\n  Lines: ${textOverflow.lineCount}`;

          if (textOverflow.actualTextHeight > textOverflow.containerHeight) {
            message += `\n  Text is ${(textOverflow.actualTextHeight - textOverflow.containerHeight).toFixed(1)}px taller than container.`;
          }
          if (textOverflow.actualTextWidth > textOverflow.containerWidth) {
            message += `\n  Text is ${(textOverflow.actualTextWidth - textOverflow.containerWidth).toFixed(1)}px wider than container.`;
          }
          message += `\n  Consider increasing container size or reducing font size.`;
        } else if (textOverflow.lineCount > 1) {
          message += `\n\nℹ️ TEXT WRAPPING: Text spans ${textOverflow.lineCount} lines within container. This is normal multi-line behavior.`;
        }

        if (textOverflow.overflowsSlide) {
          message += `\n\n⚠️ SLIDE OVERFLOW: Text extends outside slide boundaries (1280x720).`;
        }
      }
    }

    // Add line break information with specific guidance (fallback if DOM measurement failed)
    if (
      textDimensions &&
      textDimensions.lineBreakInfo &&
      (!actualDimensions || !actualDimensions.elementFound)
    ) {
      message += `\n\n${textDimensions.lineBreakInfo}`;

      // Add specific guidance based on the type of text layout
      if (textDimensions.lineBreakInfo.includes('TEXT OVERFLOW')) {
        message += ` Use the updateTextElement tool to increase the width if single-line text is desired.`;
      } else if (textDimensions.lineBreakInfo.includes('TEXT WRAPPING')) {
        message += ` This is expected behavior for multi-line text content.`;
      }
    }

    // Add DOM-based overlap and boundary feedback
    if (overlapCheck.isOutsideSlide) {
      message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). Consider adjusting the position to ensure visibility.`;
    }

    if (overlapCheck.hasOverlap) {
      message += `\n\nWARNING: OVERLAP DETECTED. This text element visually overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;

      if (overlapCheck.suggestedPosition) {
        message += `Closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}).`;
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
      editedSlidesIds: [updatedSlide.id],
    };
  }
}
