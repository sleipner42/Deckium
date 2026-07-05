import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import type { Plot } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import {
    elementNotFoundInPresentation,
    wrongElementType,
} from '../utils/errors';
import { findElement } from '../utils/find-element';
import {
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';
import { plotSeriesSchema, validatePlotData } from './CreatePlotTool';

export class UpdatePlotTool extends BaseTool {
    name = 'updatePlot';

    description =
        'Update an existing line or pie plot: data, title, axis labels, position, or size. For bar chart elements use updateBarChart.';

    inputSchema = z.object({
        elementId: z.string().describe('The ID of the plot element to update'),
        series: z
            .array(plotSeriesSchema)
            .optional()
            .describe(
                'New data for line plots: array of series {name?, x, y}. Replaces the existing data.',
            ),
        labels: z
            .array(z.string())
            .optional()
            .describe(
                'New slice labels for pie plots (provide together with values). Replaces the existing data.',
            ),
        values: z
            .array(z.number())
            .optional()
            .describe('New slice values for pie plots, same length as labels'),
        title: z.string().optional().describe('New chart title'),
        xAxisLabel: z
            .string()
            .optional()
            .describe('New X axis label (line plots only)'),
        yAxisLabel: z
            .string()
            .optional()
            .describe('New Y axis label (line plots only)'),
        x: xSchema().optional(),
        y: ySchema().optional(),
        width: widthSchema().optional(),
        height: heightSchema().optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            elementId,
            series,
            labels,
            values,
            title,
            xAxisLabel,
            yAxisLabel,
            x,
            y,
            width,
            height,
            zIndex,
        } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        const presentation = presentationService.getPresentation();
        const found = findElement(presentation, elementId);

        if (!found) {
            return {
                success: false,
                error: elementNotFoundInPresentation(elementId, presentation),
            };
        }

        const foundElement = found.element;
        const slideId = found.slideId;

        if (foundElement.type !== 'plot') {
            return {
                success: false,
                error: wrongElementType(foundElement, 'plot'),
            };
        }

        const plot = foundElement as Plot;
        const updates: Partial<Plot> = {};

        if (
            series !== undefined ||
            labels !== undefined ||
            values !== undefined
        ) {
            const validated = validatePlotData(
                plot.plotType === 'pie' ? 'pie' : 'line',
                series,
                labels,
                values,
            );
            if (validated.error || !validated.data) {
                return { success: false, error: validated.error };
            }
            updates.data = validated.data;
        }

        if (title !== undefined) updates.title = title;
        if (xAxisLabel !== undefined) updates.xAxisLabel = xAxisLabel;
        if (yAxisLabel !== undefined) updates.yAxisLabel = yAxisLabel;
        if (zIndex !== undefined) updates.zIndex = Number(zIndex);

        if (x !== undefined || y !== undefined) {
            updates.position = {
                x: x !== undefined ? Number(x) : plot.position.x,
                y: y !== undefined ? Number(y) : plot.position.y,
            };
        }

        if (width !== undefined || height !== undefined) {
            updates.size = {
                width: width !== undefined ? Number(width) : plot.size.width,
                height:
                    height !== undefined ? Number(height) : plot.size.height,
            };
        }

        if (Object.keys(updates).length === 0) {
            return {
                success: true,
                data: {
                    elementId,
                    message: 'No updates were requested',
                },
                editedSlidesIds: [slideId],
            };
        }

        const updatedSlide = presentationService.updateElement(
            elementId,
            updates,
        );
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to update plot with ID ${elementId}`,
            };
        }

        const finalPosition = updates.position ?? plot.position;
        const finalSize = updates.size ?? plot.size;

        return {
            success: true,
            data: {
                elementId,
                slideId,
                plotType: plot.plotType,
                position: finalPosition,
                size: finalSize,
                updatedFields: Object.keys(updates),
                message: `Plot updated: now at (${finalPosition.x}, ${finalPosition.y}) with size ${finalSize.width}x${finalSize.height}px.`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
