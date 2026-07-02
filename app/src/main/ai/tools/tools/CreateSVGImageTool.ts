import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import {
    heightSchema,
    positionReferenceSchema,
    SLIDE_HEIGHT,
    SLIDE_WIDTH,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

export class CreateSVGImageTool extends BaseTool {
    name = 'createSVGImage';

    description =
        'Create an SVG image element on a slide by providing SVG markup';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to add the SVG image to'),
        svgContent: z
            .string()
            .describe('The SVG markup content to render as an image'),
        x: xSchema(' (defaults to 100)').optional(),
        y: ySchema(' (defaults to 100)').optional(),
        positionReference: positionReferenceSchema.optional(),
        width: widthSchema(' (defaults to 200)').optional(),
        height: heightSchema(' (defaults to 200)').optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            svgContent,
            x,
            y,
            positionReference,
            width,
            height,
            zIndex,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!svgContent) {
            return {
                success: false,
                error: 'svgContent is required',
            };
        }

        // Validate SVG content
        if (
            !svgContent.trim().startsWith('<svg') ||
            !svgContent.trim().endsWith('</svg>')
        ) {
            return {
                success: false,
                error: 'svgContent must be valid SVG markup starting with <svg> and ending with </svg>',
            };
        }

        const widthValue = width !== undefined ? Number(width) : 200;
        const heightValue = height !== undefined ? Number(height) : 200;

        let xPos = x !== undefined ? Number(x) : 100;
        let yPos = y !== undefined ? Number(y) : 100;

        if (positionReference === 'center') {
            xPos -= widthValue / 2;
            yPos -= heightValue / 2;
        }

        // Get the current slide to check for overlaps
        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        // Check if element is outside slide boundaries
        const _elementPosition = { x: xPos, y: yPos };
        const _elementSize = { width: widthValue, height: heightValue };
        const _isOutsideSlide =
            xPos < 0 ||
            yPos < 0 ||
            xPos + widthValue > SLIDE_WIDTH ||
            yPos + heightValue > SLIDE_HEIGHT;

        // Convert SVG to data URI for the image content
        const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

        const element = createImage({
            content: svgDataUri,
            position: { x: xPos, y: yPos },
            size: {
                width: widthValue,
                height: heightValue,
            },
            zIndex: zIndex !== undefined ? Number(zIndex) : 1,
        });

        const updatedSlide = presentationService.addElement(slideId, element);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add SVG image to slide with ID ${slideId}`,
            };
        }

        // Create appropriate message based on whether there was an overlap
        const message = 'SVG image added successfully';

        return {
            success: true,
            data: {
                elementId: element.id,
                message,
                svgInfo: {
                    position: { x: xPos, y: yPos },
                    size: {
                        width: widthValue,
                        height: heightValue,
                    },
                    svgContentLength: svgContent.length,
                },
            },
            editedSlidesIds: [slideId],
        };
    }
}
