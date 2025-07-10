import {
    DEFAULT_TEXT_FONT_SIZE,
    HEADER_FONT_SIZES,
} from '../../../../common/config/typography';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { TextBox } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class UpdateTextElementTool extends BaseTool {
    name = 'updateTextElement';

    description = 'Update an existing text element on a slide';

    requiredParams = {
        elementId: 'The ID of the text element to update',
    };

    optionalParams = {
        content:
            'The text content to display as HTML. Supported formatting options:\n\n' +
            'STRUCTURE:\n' +
            '- <p>Regular paragraph text</p>\n' +
            `- <h1>Large heading ${HEADER_FONT_SIZES.h1}</h1>, <h2>Medium heading ${HEADER_FONT_SIZES.h2}</h2>, <h3>Small heading ${HEADER_FONT_SIZES.h3}</h3>\n` +
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
            `- Font size: <span style='font-size: 50px'>Large text</span> (default is ${DEFAULT_TEXT_FONT_SIZE})\n` +
            "- Font family: <span style='font-family: Arial'>Arial text</span>\n" +
            "- Text color: <span style='color: #ff0000'>Red text</span>\n" +
            "- Combined: <span style='font-size: 18px; color: blue; font-family: Georgia'>Styled text</span>\n\n" +
            'EXAMPLES:\n' +
            '- Simple: <p>Hello world</p>\n' +
            "- Centered title: <h1 class='ql-align-center'>My Presentation Title</h1>\n" +
            "- Mixed formatting: <p><strong>Bold</strong> and <em>italic</em> text with <span style='color: red'>red highlight</span></p>",
        x: 'New X position',
        y: 'New Y position',
        positionReference:
            'The reference position of the element (defaults to top left), choose from top left or center',
        width: 'New width',
        height: 'New height',
        borderRadius: 'The new border radius',
        backgroundColor:
            'The new background color. Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla formats to include opacity/transparency.',
        verticalAlign: 'The new vertical alignment of the element',
        zIndex: 'The new z-index value - controls stacking order with higher values appearing on top',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            elementId,
            content,
            x,
            y,
            positionReference,
            width,
            height,
            borderRadius,
            backgroundColor,
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
            x === undefined &&
            y === undefined &&
            width === undefined &&
            height === undefined &&
            borderRadius === undefined &&
            backgroundColor === undefined &&
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
        if (borderRadius !== undefined)
            updates.borderRadius = Number(borderRadius);
        if (backgroundColor !== undefined)
            updates.backgroundColor = backgroundColor;
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

            if (positionReference === 'center') {
                xPos -= widthValue / 2;
                yPos -= heightValue / 2;
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

        const message = 'Text element updated successfully';

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
