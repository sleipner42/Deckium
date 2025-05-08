import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BarChart } from '../../../../common/domain/entities/types';

export class UpdateBarChartTool extends BaseTool {
  name = 'updateBarChart';
  description = 'Update an existing bar chart on a slide';
  requiredParams = {
    elementId: 'The ID of the bar chart element to update',
    title: 'The new title of the chart (optional)',
    xAxisLabel: 'The new label for the X axis (optional)',
    yAxisLabel: 'The new label for the Y axis (optional)',
    xData: 'New array of x-axis values as comma-separated string (optional)',
    yData: 'New array of y-axis values as comma-separated string (optional)',
    x: 'New X position (optional)',
    y: 'New Y position (optional)',
    width: 'New width (optional)',
    height: 'New height (optional)',
    barColor: 'New color for the bars (optional)',
    zIndex: 'The new z-index value (optional) - controls stacking order with higher values appearing on top',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const {
      elementId,
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

    if (!elementId) {
      return {
        success: false,
        error: 'elementId is required',
      };
    }

    // Find the element to ensure it's a bar chart
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

    if (foundElement.type !== 'barchart') {
      return {
        success: false,
        error: `Element with ID ${elementId} is not a bar chart`,
      };
    }

    const barChart = foundElement as BarChart;
    const updates: Partial<BarChart> = {};

    // Process position updates
    if (x !== undefined || y !== undefined) {
      updates.position = {
        x: x !== undefined ? Number(x) : barChart.position.x,
        y: y !== undefined ? Number(y) : barChart.position.y,
      };
    }

    // Process size updates
    if (width !== undefined || height !== undefined) {
      updates.size = {
        width: width !== undefined ? Number(width) : barChart.size.width,
        height: height !== undefined ? Number(height) : barChart.size.height,
      };
    }

    // Process bar color updates
    if (barColor !== undefined) {
      updates.barColor = barColor;
    }
    
    if (zIndex !== undefined) {
      updates.zIndex = Number(zIndex);
    }

    // Process data updates
    if (xData || yData) {
      const currentData = barChart.data;
      
      let newXData = currentData.x;
      let newYData = currentData.y;

      if (xData) {
        newXData = xData.split(',').map((item: string) => item.trim());
      }

      if (yData) {
        newYData = yData.split(',').map((item: string) => Number(item.trim()));
      }

      // Verify data arrays have the same length
      if (newXData.length !== newYData.length) {
        return {
          success: false,
          error: 'xData and yData arrays must have the same length',
        };
      }

      updates.data = {
        x: newXData,
        y: newYData,
      };
    }

    // Process other property updates
    if (title !== undefined) {
      updates.title = title;
    }

    if (xAxisLabel !== undefined) {
      updates.xAxisLabel = xAxisLabel;
    }

    if (yAxisLabel !== undefined) {
      updates.yAxisLabel = yAxisLabel;
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
        error: `Failed to update bar chart with ID ${elementId}`,
      };
    }

    return {
      success: true,
      data: {
        elementId,
        message: 'Bar chart updated successfully',
        updates,
      },
    };
  }
} 