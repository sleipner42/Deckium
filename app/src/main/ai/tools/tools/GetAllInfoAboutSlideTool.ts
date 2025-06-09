import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { textMeasurementService } from '../../../text-measurement/service';
import {
  TextBox,
  Shape,
  Image,
  Plot,
} from '../../../../common/domain/entities/types';

export class GetAllInfoAboutSlideTool extends BaseTool {
  name = 'getAllInfoAboutSlide';

  description =
    'Get detailed information about a slide and its elements in text. Use this tool to get information about a slide before you edit or add something to it.';

  requiredParams = {
    slideId: 'The ID of the slide to get information about',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const { slideId } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    const currentPresentation = presentationService.getPresentation();
    const slide = currentPresentation.slides.find((s) => s.id === slideId);

    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }

    const sortedElements = [...slide.elements].sort(
      (a, b) => a.position.y - b.position.y,
    );

    const processedElements = await Promise.all(sortedElements.map(async (element) => {
      const centerCordinatesOfElement = {
        x: element.position.x + element.size.width / 2,
        y: element.position.y + element.size.height / 2,
      };

      const baseInfo = {
        id: element.id,
        type: element.type,
        position: element.position,
        size: element.size,
        centerCordinates: centerCordinatesOfElement,
      };

      switch (element.type) {
        case 'textbox': {
          const textbox = element as TextBox;
          let quillInfo = null;
          try {
            // Get actual Quill measurements
            const quillDimensions = await textMeasurementService.getQuillTextDimensions(textbox.id);
            if (quillDimensions.elementFound) {
              const { containerBounds, textBounds, overflow, quillInstance } = quillDimensions;
              quillInfo = {
                containerBounds,
                textBounds,
                hasOverflow: overflow?.overflowsContainer || false,
                lineCount: overflow?.lineCount || 1,
                isScrollable: quillInstance?.isScrollable || false,
                textLength: quillInstance?.totalLength || 0,
              };
            }
          } catch (error) {
            console.warn(`Could not get Quill measurements for element ${textbox.id}:`, error);
          }

          return {
            id: textbox.id,
            type: textbox.type,
            content: textbox.content,
            color: textbox.color,
            position: textbox.position,
            size: textbox.size,
            quillMetrics: quillInfo,
            positionInfo: quillInfo?.containerBounds ? 
              `Element at (${quillInfo.containerBounds.x}, ${quillInfo.containerBounds.y}) to (${quillInfo.containerBounds.x + quillInfo.containerBounds.width}, ${quillInfo.containerBounds.y + quillInfo.containerBounds.height})` :
              `Element at (${textbox.position.x}, ${textbox.position.y}) to (${textbox.position.x + textbox.size.width}, ${textbox.position.y + textbox.size.height})`,
          };
        }
        case 'rectangle':
        case 'circle':
        case 'triangle': {
          const shape = element as Shape;
          return {
            ...baseInfo,
            fillColor: shape.fillColor,
            strokeColor: shape.strokeColor,
            strokeWidth: shape.strokeWidth,
          };
        }
        case 'image': {
          const image = element as Image;
          return {
            ...baseInfo,
            content: image.content.startsWith('data:')
              ? '[Base64 encoded image]'
              : image.content,
          };
        }
        case 'plot': {
          const plot = element as Plot;
          return {
            ...baseInfo,
            plotType: plot.plotType,
            data: plot.data,
          };
        }
        default:
          return baseInfo;
      }
    }));

    const slideInfo = {
      id: slide.id,
      background: slide.background,
      elementsCount: slide.elements.length,
      elements: processedElements,
    };

    return {
      success: true,
      data: slideInfo,
      editedSlidesIds: [],
    };
  }
}
