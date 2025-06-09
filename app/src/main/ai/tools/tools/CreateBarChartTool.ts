import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';

export class CreateBarChartTool extends BaseTool {
  name = 'createBarChart';

  description = 'Create a bar chart element on a slide';

  requiredParams = {
    slideId: 'The ID of the slide to add the bar chart to',
    title: 'The title of the chart',
    xAxisLabel: 'The label for the X axis',
    yAxisLabel: 'The label for the Y axis',
    xData:
      'Array of x-axis values (labels) as comma-separated string, e.g. "Jan,Feb,Mar"',
    yData:
      'Array of y-axis values (numbers) as comma-separated string, e.g. "10,24,30"',
    x: 'X position of the element (optional, defaults to 100)',
    y: 'Y position of the element (optional, defaults to 100)',
    width: 'The width of the element (optional, defaults to 400)',
    height: 'The height of the element (optional, defaults to 300)',
    barColor: 'The color of the bars (optional, defaults to #000000)',
    zIndex:
      'The z-index of the element (optional, defaults to 1) - controls stacking order with higher values appearing on top',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const {
      slideId,
      title,
      xAxisLabel,
      yAxisLabel,
      xData,
      yData,
      x,
      y,
      width,
      height,
      barColor,
      zIndex,
    } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    if (!title || !xAxisLabel || !yAxisLabel) {
      return {
        success: false,
        error: 'Title, xAxisLabel, and yAxisLabel are required',
      };
    }

    if (!xData || !yData) {
      return {
        success: false,
        error: 'xData and yData are required',
      };
    }

    // Parse data arrays
    const xDataArray = xData.split(',').map((item: string) => item.trim());
    const yDataArray = yData
      .split(',')
      .map((item: string) => Number(item.trim()));

    if (xDataArray.length !== yDataArray.length) {
      return {
        success: false,
        error: 'xData and yData arrays must have the same length',
      };
    }

    const element = ElementFactory.createBarChart({
      position: { x: x !== undefined ? Number(x) : 100, y: y !== undefined ? Number(y) : 100 },
      size: {
        width: Number(width) || 400,
        height: Number(height) || 300,
      },
      title,
      xAxisLabel,
      yAxisLabel,
      data: {
        x: xDataArray,
        y: yDataArray,
      },
      barColor: barColor || '#000000',
      zIndex: zIndex !== undefined ? Number(zIndex) : 1,
    });

    const updatedSlide = presentationService.addElement(slideId, element);

    if (!updatedSlide) {
      return {
        success: false,
        error: `Failed to add bar chart to slide with ID ${slideId}`,
      };
    }

    return {
      success: true,
      data: {
        elementId: element.id,
        message: 'Bar chart added successfully',
        chartInfo: {
          title,
          xAxisLabel,
          yAxisLabel,
          data: {
            x: xDataArray,
            y: yDataArray,
          },
        },
      },
      editedSlidesIds: [slideId],
    };
  }
}
