import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createTextBox } from '../../../../common/domain/entities/element-factory';
import { ElementValidator } from '../../../presentation/element-validator';
import type { PresentationService } from '../../../presentation/service';
import { textMeasurementService } from '../../../text-measurement/service';
import { BaseTool } from '../BaseTool';

export class AddTextElementTool extends BaseTool {
    name = 'addTextElement';

    description = 'Add a text element to a slide';

    requiredParams = {
        slideId: 'The ID of the slide to add the element to',
        content:
            'The text content to display as HTML. Supported formatting options:\n\n' +
            'STRUCTURE:\n' +
            '- <p>Regular paragraph text</p>\n' +
            '- <h1>Large heading (32px)</h1>, <h2>Medium heading (24px)</h2>, <h3>Small heading (20px)</h3>\n' +
            '- <br> for line breaks\n\n' +
            'TEXT STYLING:\n' +
            '- <strong>Bold text</strong> or <b>Bold text</b>\n' +
            '- <em>Italic text</em> or <i>Italic text</i>\n' +
            '- <u>Underlined text</u>\n' +
            '- <s>Strikethrough text</s>\n\n' +
            'LISTS:\n' +
            '- <ul><li>Bullet point item</li><li>Another item</li></ul>\n' +
            '- <ol><li>Numbered item 1</li><li>Numbered item 2</li></ol>\n\n' +
            'ALIGNMENT (IMPORTANT):\n' +
            '- Default: Left aligned (no class needed)\n' +
            "- Center: Add class='ql-align-center' to any element\n" +
            "- Right: Add class='ql-align-right' to any element\n" +
            "- Example: <p class='ql-align-center'>Centered paragraph</p>\n\n" +
            'INLINE STYLING:\n' +
            "- Font size: <span style='font-size: 24px'>Large text</span> (default is 16px)\n" +
            "- Font family: <span style='font-family: Arial'>Arial text</span>\n" +
            "- Text color: <span style='color: #ff0000'>Red text</span>\n" +
            "- Combined: <span style='font-size: 18px; color: blue; font-family: Georgia'>Styled text</span>\n\n" +
            'EXAMPLES:\n' +
            '- Simple: <p>Hello world</p>\n' +
            "- Centered title: <h1 class='ql-align-center'>My Presentation Title</h1>\n" +
            "- Mixed formatting: <p><strong>Bold</strong> and <em>italic</em> text with <span style='color: red'>red highlight</span></p>",
        x: 'X position of the element (optional, defaults to center)',
        y: 'Y position of the element (optional, defaults to center)',
        positionReference:
            'The reference position of the element (optional, defaults to top left), choose from top left or center',
        width: 'The width of the element (optional, defaults to 400)',
        height: 'The height of the element (optional, defaults to 200)',
        borderRadius:
            'The border radius of the element (optional, defaults to 0)',
        backgroundColor:
            'The background color of the element (optional, defaults to transparent). Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla formats to include opacity/transparency.',
        verticalAlign:
            'The vertical alignment of the element (optional, defaults to top), choose from top, middle, bottom',
        zIndex: 'The z-index of the element (optional, defaults to 1) - controls stacking order with higher values appearing on top',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            content,
            x,
            y,
            positionReference,
            borderRadius,
            backgroundColor,
            verticalAlign,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!content) {
            return {
                success: false,
                error: 'Content is required for text element',
            };
        }

        const width = Number(params.width) || 400;
        const height = Number(params.height) || 200;

        let xPos = x !== undefined ? Number(x) : 1280 / 2 - width / 2;
        let yPos = y !== undefined ? Number(y) : 720 / 2 - height / 2;

        if (positionReference === 'center') {
            xPos -= width / 2;
            yPos -= height / 2;
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;

        const element = createTextBox({
            content,
            position: { x: xPos, y: yPos },
            size: { width, height },
            borderRadius: Number(borderRadius) || 0,
            backgroundColor: backgroundColor || 'transparent',
            verticalAlign: verticalAlign || 'top',
            zIndex,
        });

        const updatedSlide = presentationService.addElement(slideId, element);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add element to slide with ID ${slideId}`,
            };
        }

        let textDimensions = null;
        let overlapCheck = null;
        let actualDimensions = null;

        try {
            await new Promise((resolve) => setTimeout(resolve, 300));

            textDimensions = await textMeasurementService.measureQuillText(
                element.id,
            );

            actualDimensions =
                await textMeasurementService.getActualElementDimensions(
                    element.id,
                );

            overlapCheck = await ElementValidator.checkElementOverlap(
                element.id,
                0,
            );
        } catch (error) {
            console.warn(
                'Post-creation measurement and overlap detection failed:',
                error,
            );

            textDimensions = { height, width, lineBreakInfo: null };
            overlapCheck = {
                hasOverlap: false,
                overlappingElements: [],
                isOutsideSlide: false,
            };
        }

        let message = `Text element added successfully at position (${element.position.x}, ${element.position.y}) with size ${element.size.width}x${element.size.height}px.`;

        if (actualDimensions?.elementFound) {
            const { containerBounds, textBounds, textOverflow } =
                actualDimensions;

            message += `\n\nActual rendered dimensions:`;
            if (containerBounds) {
                message += `\n  Container: x: ${containerBounds.x}, y: ${containerBounds.y}, width: ${containerBounds.width}, height: ${containerBounds.height}`;
            }

            if (textBounds) {
                message += `\n  Text content: x: ${textBounds.x}, y: ${textBounds.y}, width: ${textBounds.width}, height: ${textBounds.height}`;
            }

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

        if (
            textDimensions?.lineBreakInfo &&
            (!actualDimensions || !actualDimensions.elementFound)
        ) {
            message += `\n\n${textDimensions.lineBreakInfo}`;

            if (textDimensions.lineBreakInfo.includes('TEXT OVERFLOW')) {
                message += ` Use the updateTextElement tool to increase the width if single-line text is desired.`;
            } else if (textDimensions.lineBreakInfo.includes('TEXT WRAPPING')) {
                message += ` This is expected behavior for multi-line text content.`;
            }
        }

        if (overlapCheck.isOutsideSlide) {
            message += `\n\nWARNING: This element is positioned outside the slide boundaries (1280x720). Consider adjusting the position to ensure visibility.`;
        }

        if (overlapCheck.hasOverlap) {
            message += `\n\nWARNING: OVERLAP DETECTED. This text element visually overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}. `;

            if (overlapCheck.suggestedPosition) {
                message += `Closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y}).`;
            } else {
                message += `Please check the text placement to ensure readability.`;
            }
        }

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId: updatedSlide.id,
                message,
            },
            editedSlidesIds: [updatedSlide.id],
        };
    }
}
