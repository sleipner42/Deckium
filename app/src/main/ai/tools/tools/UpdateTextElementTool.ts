import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { TextBox } from '../../../../common/domain/entities/types';
import { ElementValidator } from '../../../presentation/element-validator';
import { PresentationService } from '../../../presentation/service';
import { textMeasurementService } from '../../../text-measurement/service';
import { BaseTool } from '../BaseTool';
import { estimateTextDimensions } from '../utils/text-dimensions';

export class UpdateTextElementTool extends BaseTool {
    name = 'updateTextElement';

    description = 'Update an existing text element on a slide';

    requiredParams = {
        elementId: 'The ID of the text element to update',
        content:
            'The text content to display. Use HTML formatting: <p>paragraph</p>, <h1>header</h1>, <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <ul><li>bullet list</li></ul>, <ol><li>numbered list</li></ol>, <a href="url">link</a>. Font size/family can be specified with inline styles: <span style="font-size: 20px; font-family: Times">text</span>',
        color: 'The new text color (optional)',
        x: 'New X position (optional)',
        y: 'New Y position (optional)',
        positionReference:
            'The reference position of the element (optional, defaults to top left), choose from top left or center',
        width: 'New width (optional)',
        height: 'New height (optional)',
        borderRadius: 'The new border radius (optional)',
        backgroundColor:
            'The new background color (optional). Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla formats to include opacity/transparency.',
        align: 'The new alignment of the element (optional)',
        verticalAlign: 'The new vertical alignment of the element (optional)',
        zIndex: 'The new z-index value (optional) - controls stacking order with higher values appearing on top',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            elementId,
            content,
            color,
            x,
            y,
            positionReference,
            width,
            height,
            borderRadius,
            backgroundColor,
            align,
            verticalAlign,
        } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        if (
            !content &&
            !color &&
            x === undefined &&
            y === undefined &&
            width === undefined &&
            height === undefined &&
            borderRadius === undefined &&
            backgroundColor === undefined &&
            align === undefined &&
            verticalAlign === undefined &&
            params.zIndex === undefined
        ) {
            return {
                success: false,
                error: 'At least one property to update must be provided',
            };
        }

        let targetElement: TextBox | null = null;
        let slideId: string | null = null;

        const currentPresentation = presentationService.getPresentation();

        for (const slide of currentPresentation.slides) {
            const element = slide.elements.find(
                (e) => e.id === elementId,
            ) as TextBox;
            if (element && element.type === 'textbox') {
                targetElement = element;
                slideId = slide.id;
                break;
            }
        }

        if (!targetElement || !slideId) {
            return {
                success: false,
                error: `Text element with ID ${elementId} not found, or element is not a text element`,
            };
        }

        const updates: Partial<TextBox> = {};

        if (content !== undefined) updates.content = content;
        if (color !== undefined) updates.color = color;
        if (borderRadius !== undefined)
            updates.borderRadius = Number(borderRadius);
        if (backgroundColor !== undefined)
            updates.backgroundColor = backgroundColor;
        if (align !== undefined) updates.align = align;
        if (verticalAlign !== undefined) updates.verticalAlign = verticalAlign;
        if (params.zIndex !== undefined) updates.zIndex = Number(params.zIndex);

        if (x !== undefined || y !== undefined) {
            let xPos = x !== undefined ? Number(x) : targetElement.position.x;
            let yPos = y !== undefined ? Number(y) : targetElement.position.y;

            const widthValue =
                width !== undefined ? Number(width) : targetElement.size.width;
            const heightValue =
                height !== undefined
                    ? Number(height)
                    : targetElement.size.height;

            // Handle positioning based on positionReference (legacy parameter)
            if (positionReference === 'center') {
                xPos -= widthValue / 2;
                yPos -= heightValue / 2;
            } else {
                // Handle positioning based on alignment parameters for consistency with AddTextElementTool
                const currentAlign =
                    align !== undefined ? align : targetElement.align;
                const currentVerticalAlign =
                    verticalAlign !== undefined
                        ? verticalAlign
                        : targetElement.verticalAlign;

                if (currentAlign === 'center') {
                    xPos -= widthValue / 2;
                } else if (currentAlign === 'right') {
                    xPos -= widthValue;
                }

                if (currentVerticalAlign === 'middle') {
                    yPos -= heightValue / 2;
                } else if (currentVerticalAlign === 'bottom') {
                    yPos -= heightValue;
                }
            }

            updates.position = { x: xPos, y: yPos };
        }

        if (width !== undefined || height !== undefined) {
            updates.size = {
                width:
                    width !== undefined
                        ? Number(width)
                        : targetElement.size.width,
                height:
                    height !== undefined
                        ? Number(height)
                        : targetElement.size.height,
            };
        }

        // Update the element first
        const updatedSlide = presentationService.updateElement(
            elementId,
            updates,
        );

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to update element with ID ${elementId}`,
            };
        }

        // Run post-update overlap detection and text measurement on the actual rendered element
        let overlapCheck = null;
        let lineBreakInfo = null;
        let actualDimensions = null;

        try {
            // Longer delay to ensure DOM updates, React rendering, and lazy-loaded components
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Get text dimensions if content or size was updated
            if (updates.content || updates.size) {
                const textDimensions =
                    await textMeasurementService.measureQuillText(elementId);
                lineBreakInfo = textDimensions.lineBreakInfo;
            }

            // Get the actual DOM element dimensions and text layout
            actualDimensions =
                await textMeasurementService.getActualElementDimensions(
                    elementId,
                );

            // Check for overlaps using the actual rendered element ID
            overlapCheck = await ElementValidator.checkElementOverlap(
                elementId,
                0, // no padding
            );
        } catch (error) {
            console.warn(
                'Post-update overlap detection and measurement failed:',
                error,
            );
            // Create fallback results
            overlapCheck = {
                hasOverlap: false,
                overlappingElements: [],
                isOutsideSlide: false,
            };
        }

        // Create appropriate message based on whether there was an overlap
        let message = 'Text element updated successfully';

        // Add actual DOM dimensions if available
        if (actualDimensions && actualDimensions.elementFound) {
            const { containerBounds, textBounds, textOverflow } =
                actualDimensions;

            if (textOverflow) {
                if (textOverflow.overflowsContainer) {
                    message += `\n\n⚠️ TEXT OVERFLOW DETECTED: Text extends outside its container.`;
                    message += `\n  Text size: ${textOverflow.actualTextWidth}x${textOverflow.actualTextHeight}px`;
                    message += `\n  Container size: ${textOverflow.containerWidth}x${textOverflow.containerHeight}px`;
                    message += `\n  Lines: ${textOverflow.lineCount}`;

                    if (
                        textOverflow.actualTextHeight >
                        textOverflow.containerHeight
                    ) {
                        message += `\n  Text is ${(textOverflow.actualTextHeight - textOverflow.containerHeight).toFixed(1)}px taller than container.`;
                    }
                    if (
                        textOverflow.actualTextWidth >
                        textOverflow.containerWidth
                    ) {
                        message += `\n  Text is ${(textOverflow.actualTextWidth - textOverflow.containerWidth).toFixed(1)}px wider than container.`;
                    }
                    message += `\n  Consider increasing container size or reducing font size.`;
                } else if (textOverflow.lineCount > 1) {
                    message += `\n\nℹ️ TEXT WRAPPING: Text spans ${textOverflow.lineCount} lines within container. This is normal multi-line behavior.`;
                }

                if (textOverflow.overflowsSlide) {
                    message += `\n\n⚠️ SLIDE OVERFLOW: Text extends outside slide boundaries (1280x720).`;
                }
            }
        }

        // Add line break information with specific guidance (fallback if DOM measurement failed)
        if (
            lineBreakInfo &&
            (!actualDimensions || !actualDimensions.elementFound)
        ) {
            message += `\n\n${lineBreakInfo}`;

            // Add specific guidance based on the type of text layout
            if (lineBreakInfo.includes('TEXT OVERFLOW')) {
                message += ` Use the updateTextElement tool to increase the width if single-line text is desired.`;
            } else if (lineBreakInfo.includes('TEXT WRAPPING')) {
                message += ` This is expected behavior for multi-line text content.`;
            }
        }

        if (overlapCheck) {
            // Warn about elements outside slide boundaries
            if (overlapCheck.isOutsideSlide) {
                message += `\n\nWARNING: This text element is now positioned outside the slide boundaries (1280x720). `;

                if (overlapCheck.suggestedPosition) {
                    message += `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}) to ensure visibility.`;
                }
            }

            // Warn about text overlaps
            if (overlapCheck.hasOverlap) {
                message += `\n\nWARNING: OVERLAP DETECTED. This text element now overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;

                if (overlapCheck.suggestedPosition) {
                    message += `The closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}). Alternatively, you can increase the z-index of this element using the changeElementZIndex tool to make it appear on top.`;
                } else {
                    message += `Please check the text placement to ensure readability. You can also use the changeElementZIndex tool to increase this element's z-index and make it appear on top of other elements. Elements with higher z-index values appear on top of elements with lower z-index values.`;
                }
            }
        }

        return {
            success: true,
            data: {
                elementId,
                slideId: updatedSlide.id,
                message,
                updates: Object.keys(updates),
            },
            editedSlidesIds: [slideId],
        };
    }
}
