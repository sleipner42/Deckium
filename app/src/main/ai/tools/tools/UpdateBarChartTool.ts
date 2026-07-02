import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { BarChart } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    elementNotFoundInPresentation,
    wrongElementType,
} from '../utils/errors';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class UpdateBarChartTool extends BaseTool {
    name = 'updateBarChart';

    description = 'Update an existing bar chart on a slide';

    inputSchema = z.object({
        elementId: z
            .string()
            .describe('The ID of the bar chart element to update'),
        title: z.string().describe('The new title of the chart').optional(),
        xAxisLabel: z
            .string()
            .describe('The new label for the X axis')
            .optional(),
        yAxisLabel: z
            .string()
            .describe('The new label for the Y axis')
            .optional(),
        xData: z
            .array(z.union([z.string(), z.number()]))
            .describe(
                'New array of x-axis values (category labels or numbers), e.g. ["Jan", "Feb", "Mar"]. Parallel to yData: the resulting x and y arrays must have the same length.',
            )
            .optional(),
        yData: z
            .array(z.number())
            .describe(
                'New array of y-axis values (numbers), e.g. [10, 24, 30]. Parallel to xData: the resulting x and y arrays must have the same length.',
            )
            .optional(),
        x: xSchema(' (new value)').optional(),
        y: ySchema(' (new value)').optional(),
        width: widthSchema(' (new value)').optional(),
        height: heightSchema(' (new value)').optional(),
        barColor: colorSchema
            .describe(`New color for the bars. ${COLOR_DESCRIPTION}`)
            .optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
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
                error: elementNotFoundInPresentation(
                    elementId,
                    currentPresentation,
                ),
            };
        }

        if (foundElement.type !== 'barchart') {
            return {
                success: false,
                error: wrongElementType(foundElement, 'barchart'),
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
                width:
                    width !== undefined ? Number(width) : barChart.size.width,
                height:
                    height !== undefined
                        ? Number(height)
                        : barChart.size.height,
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

            // Runtime tolerance: accept comma-separated strings from older
            // callers/tests, but prefer clean arrays as declared in the schema.
            if (xData) {
                newXData =
                    typeof xData === 'string'
                        ? xData.split(',').map((item: string) => item.trim())
                        : xData;
            }

            if (yData) {
                newYData =
                    typeof yData === 'string'
                        ? yData
                              .split(',')
                              .map((item: string) => Number(item.trim()))
                        : yData.map((item: string | number) => Number(item));
            }

            // Verify data arrays have the same length
            if (newXData.length !== newYData.length) {
                return {
                    success: false,
                    error: `xData and yData must be parallel arrays of the same length, but the resulting x data has ${newXData.length} item(s) and y data has ${newYData.length} item(s)`,
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
                editedSlidesIds: slideId ? [slideId] : [],
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
            editedSlidesIds: slideId ? [slideId] : [],
        };
    }
}
