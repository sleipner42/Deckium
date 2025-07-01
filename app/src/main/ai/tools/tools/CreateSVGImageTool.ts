import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import { ElementValidator } from '../../../presentation/element-validator';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class CreateSVGImageTool extends BaseTool {
    name = 'createSVGImage';

    description =
        'Create an SVG image element on a slide by providing SVG markup';

    requiredParams = {
        slideId: 'The ID of the slide to add the SVG image to',
        svgContent: 'The SVG markup content to render as an image',
        x: 'X position of the element (optional, defaults to 100)',
        y: 'Y position of the element (optional, defaults to 100)',
        positionReference:
            'The reference position of the element (optional, defaults to top left), choose from top left or center',
        width: 'The width of the element (optional, defaults to 200)',
        height: 'The height of the element (optional, defaults to 200)',
        zIndex: 'The z-index of the element for stacking order (optional, defaults to 1)',
    };

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

        const widthValue = Number(width) || 200;
        const heightValue = Number(height) || 200;

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
                error: `Slide with ID ${slideId} not found`,
            };
        }

        // Check if element is outside slide boundaries
        const _elementPosition = { x: xPos, y: yPos };
        const _elementSize = { width: widthValue, height: heightValue };
        const _isOutsideSlide =
            xPos < 0 ||
            yPos < 0 ||
            xPos + widthValue > 1280 ||
            yPos + heightValue > 720;

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

        // Run DOM-based overlap detection after element creation for accuracy
        let overlapCheck = null;
        try {
            // Small delay to ensure DOM updates
            await new Promise((resolve) => setTimeout(resolve, 100));
            overlapCheck = await ElementValidator.checkElementOverlap(
                element.id,
                0,
            );
        } catch (error) {
            console.warn('Post-creation overlap detection failed:', error);
            // Create a fallback empty result
            overlapCheck = {
                hasOverlap: false,
                overlappingElements: [],
                isOutsideSlide: false,
            };
        }

        // Create appropriate message based on whether there was an overlap
        let message = 'SVG image added successfully';

        // Add DOM-based overlap and boundary feedback
        if (overlapCheck.isOutsideSlide) {
            message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). Consider adjusting the position to ensure visibility.`;
        }

        if (overlapCheck.hasOverlap) {
            message += `\n\nWARNING: OVERLAP DETECTED. This SVG image visually overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;

            if (overlapCheck.suggestedPosition) {
                message += `Closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}). You could also change the zIndex.`;
            } else {
                message += `Please check the SVG placement and zIndex to avoid visual conflicts.`;
            }
        }

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
