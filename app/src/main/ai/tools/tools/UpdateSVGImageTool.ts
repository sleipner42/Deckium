import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementNotFoundInPresentation } from '../utils/errors';
import { heightSchema, widthSchema } from '../utils/schemas';

const SVG_DATA_URI_PREFIX = 'data:image/svg+xml';

export class UpdateSVGImageTool extends BaseTool {
    name = 'updateSVGImage';

    description =
        'Replace the SVG markup of an existing SVG image element (created with createSVGImage). For raster images use updateImageElement; for moving/resizing only, use moveElement.';

    inputSchema = z.object({
        elementId: z
            .string()
            .describe('The ID of the SVG image element to update'),
        svgContent: z
            .string()
            .describe(
                'The new complete SVG markup, starting with <svg and ending with </svg>. Replaces the existing SVG entirely.',
            ),
        width: widthSchema().optional(),
        height: heightSchema().optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId, svgContent, width, height } = params;

        if (!elementId || !svgContent) {
            return {
                success: false,
                error: 'elementId and svgContent are required',
            };
        }

        const trimmed = String(svgContent).trim();
        if (!trimmed.startsWith('<svg') || !trimmed.endsWith('</svg>')) {
            return {
                success: false,
                error: 'svgContent must be complete SVG markup starting with <svg and ending with </svg>',
            };
        }

        const presentation = presentationService.getPresentation();
        let element = null;
        let slideId = null;
        for (const slide of presentation.slides) {
            const found = slide.elements.find((e) => e.id === elementId);
            if (found) {
                element = found;
                slideId = slide.id;
                break;
            }
        }

        if (!element || !slideId) {
            return {
                success: false,
                error: elementNotFoundInPresentation(elementId, presentation),
            };
        }

        if (element.type !== 'image') {
            return {
                success: false,
                error: `Element '${elementId}' is a ${element.type}, not an SVG image. Use the appropriate update tool for its type.`,
            };
        }

        if (!element.content.startsWith(SVG_DATA_URI_PREFIX)) {
            return {
                success: false,
                error: `Element '${elementId}' is a raster image, not an SVG. Use updateImageElement to change it, or deleteElement + createSVGImage to replace it with an SVG.`,
            };
        }

        const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
        const updates: {
            content: string;
            size?: { width: number; height: number };
        } = { content: svgDataUri };

        if (width !== undefined || height !== undefined) {
            updates.size = {
                width: width !== undefined ? Number(width) : element.size.width,
                height:
                    height !== undefined ? Number(height) : element.size.height,
            };
        }

        const updatedSlide = presentationService.updateElement(
            elementId,
            updates,
        );
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to update SVG image with ID ${elementId}`,
            };
        }

        const finalSize = updates.size ?? element.size;
        return {
            success: true,
            data: {
                elementId,
                slideId,
                size: finalSize,
                message: `SVG image updated (${finalSize.width}x${finalSize.height}px).`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
