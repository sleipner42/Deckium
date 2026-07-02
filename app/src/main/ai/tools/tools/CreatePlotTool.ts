import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createPlot } from '../../../../common/domain/entities/element-factory';
import type { PlotData } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import {
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export const plotSeriesSchema = z.object({
    name: z
        .string()
        .optional()
        .describe('Series name shown in the legend (needed for multi-series)'),
    x: z
        .array(z.union([z.string(), z.number()]))
        .describe('X values (numbers or category labels)'),
    y: z.array(z.number()).describe('Y values, same length as x'),
});

export function validatePlotData(
    plotType: 'line' | 'pie',
    series: unknown,
    labels: unknown,
    values: unknown,
): { data?: PlotData; error?: string } {
    if (plotType === 'pie') {
        if (!Array.isArray(labels) || !Array.isArray(values)) {
            return {
                error: "Pie plots require 'labels' (string array) and 'values' (number array).",
            };
        }
        if (labels.length !== values.length) {
            return {
                error: `Pie 'labels' (${labels.length} items) and 'values' (${values.length} items) must have the same length.`,
            };
        }
        if (labels.length === 0) {
            return { error: "Pie 'labels' and 'values' must not be empty." };
        }
        return { data: { labels, values } };
    }

    if (!Array.isArray(series) || series.length === 0) {
        return {
            error: "Line plots require 'series': an array of {name?, x, y} objects (one per line).",
        };
    }
    for (const [index, entry] of series.entries()) {
        if (
            !entry ||
            !Array.isArray(entry.x) ||
            !Array.isArray(entry.y) ||
            entry.x.length !== entry.y.length
        ) {
            return {
                error: `Series ${index}${entry?.name ? ` ('${entry.name}')` : ''} must have x and y arrays of the same length (got x: ${entry?.x?.length ?? 'missing'}, y: ${entry?.y?.length ?? 'missing'}).`,
            };
        }
    }
    return { data: { series } };
}

export class CreatePlotTool extends BaseTool {
    name = 'createPlot';

    description =
        'Create a line or pie chart on a slide. Line plots support multiple series. For bar charts, use the createBarChart tool instead.';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the plot to'),
        plotType: z
            .enum(['line', 'pie'])
            .describe(
                "Type of plot: 'line' (one or more series over x) or 'pie' (labels + values). For bar charts use createBarChart.",
            ),
        series: z
            .array(plotSeriesSchema)
            .optional()
            .describe(
                "For line plots: array of series, each {name?, x: [...], y: [...]}. Example: [{name: 'Revenue', x: [2021, 2022, 2023], y: [10, 25, 40]}]",
            ),
        labels: z
            .array(z.string())
            .optional()
            .describe("For pie plots: slice labels, e.g. ['A', 'B', 'C']"),
        values: z
            .array(z.number())
            .optional()
            .describe('For pie plots: slice values, same length as labels'),
        title: z.string().optional().describe('Chart title'),
        xAxisLabel: z
            .string()
            .optional()
            .describe('X axis label (line plots only)'),
        yAxisLabel: z
            .string()
            .optional()
            .describe('Y axis label (line plots only)'),
        x: xSchema(' (defaults to 640)').optional(),
        y: ySchema(' (defaults to 160)').optional(),
        width: widthSchema(' (defaults to 500)').optional(),
        height: heightSchema(' (defaults to 400)').optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            plotType,
            series,
            labels,
            values,
            title,
            xAxisLabel,
            yAxisLabel,
            zIndex,
        } = params;

        if (!slideId || !plotType) {
            return {
                success: false,
                error: 'slideId and plotType are required',
            };
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            return {
                success: false,
                error: slideNotFound(slideId, presentation),
            };
        }

        const validated = validatePlotData(plotType, series, labels, values);
        if (validated.error || !validated.data) {
            return { success: false, error: validated.error };
        }

        const width = params.width !== undefined ? Number(params.width) : 500;
        const height =
            params.height !== undefined ? Number(params.height) : 400;
        const xPos = params.x !== undefined ? Number(params.x) : 640;
        const yPos = params.y !== undefined ? Number(params.y) : 160;

        const element = createPlot({
            plotType,
            data: validated.data,
            position: { x: xPos, y: yPos },
            size: { width, height },
            title,
            xAxisLabel,
            yAxisLabel,
            zIndex: zIndex !== undefined ? Number(zIndex) : undefined,
        });

        const updatedSlide = presentationService.addElement(slideId, element);
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add plot to slide with ID ${slideId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId,
                plotType,
                position: element.position,
                size: element.size,
                message: `${plotType} plot created at (${xPos}, ${yPos}) with size ${width}x${height}px.`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
