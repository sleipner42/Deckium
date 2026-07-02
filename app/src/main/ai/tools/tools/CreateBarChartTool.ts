import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createBarChart } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    COLOR_DESCRIPTION,
    colorSchema,
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class CreateBarChartTool extends BaseTool {
    name = 'createBarChart';

    description = 'Create a bar chart element on a slide';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to add the bar chart to'),
        title: z.string().describe('The title of the chart'),
        xAxisLabel: z.string().describe('The label for the X axis'),
        yAxisLabel: z.string().describe('The label for the Y axis'),
        xData: z
            .array(z.union([z.string(), z.number()]))
            .describe(
                'Array of x-axis values (category labels or numbers), e.g. ["Jan", "Feb", "Mar"]. Parallel to yData: must have the same length, where xData[i] labels the bar whose value is yData[i].',
            ),
        yData: z
            .array(z.number())
            .describe(
                'Array of y-axis values (numbers), e.g. [10, 24, 30]. Parallel to xData: must have the same length, where yData[i] is the value for the bar labeled xData[i].',
            ),
        x: xSchema(' (defaults to 100)').optional(),
        y: ySchema(' (defaults to 100)').optional(),
        width: widthSchema(' (defaults to 400)').optional(),
        height: heightSchema(' (defaults to 300)').optional(),
        barColor: colorSchema
            .describe(
                `The color of the bars (defaults to #000000). ${COLOR_DESCRIPTION}`,
            )
            .optional(),
        zIndex: zIndexSchema.optional(),
    });

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

        // Runtime tolerance: accept comma-separated strings from older
        // callers/tests, but prefer clean arrays as declared in the schema.
        const xDataArray: (string | number)[] =
            typeof xData === 'string'
                ? xData.split(',').map((item: string) => item.trim())
                : xData;
        const yDataArray: number[] =
            typeof yData === 'string'
                ? yData.split(',').map((item: string) => Number(item.trim()))
                : yData.map((item: string | number) => Number(item));

        if (xDataArray.length !== yDataArray.length) {
            return {
                success: false,
                error: `xData and yData must be parallel arrays of the same length, but xData has ${xDataArray.length} item(s) and yData has ${yDataArray.length} item(s)`,
            };
        }

        const element = createBarChart({
            position: {
                x: x !== undefined ? Number(x) : 100,
                y: y !== undefined ? Number(y) : 100,
            },
            size: {
                width: width !== undefined ? Number(width) : 400,
                height: height !== undefined ? Number(height) : 300,
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
                position: element.position,
                size: element.size,
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
