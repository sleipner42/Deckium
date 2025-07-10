import {
    DEFAULT_TEXT_FONT_SIZE,
    HEADER_FONT_SIZES,
} from '../../../../common/config/typography';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createTextBox } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
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
    };

    optionalParams = {
        x: 'X position of the element (defaults to center)',
        y: 'Y position of the element (defaults to center)',
        positionReference:
            'The reference position of the element (defaults to top left), choose from top left or center',
        width: 'The width of the element (defaults to 400)',
        height: 'The height of the element (defaults to 200)',
        borderRadius: 'The border radius of the element (defaults to 0)',
        backgroundColor:
            'The background color of the element (defaults to transparent). Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla formats to include opacity/transparency.',
        verticalAlign:
            'The vertical alignment of the element (defaults to top), choose from top, middle, bottom',
        zIndex: 'The z-index of the element (defaults to 1) - controls stacking order with higher values appearing on top',
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

        const message = `Text element added successfully at position (${element.position.x}, ${element.position.y}) with size ${element.size.width}x${element.size.height}px.`;

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
