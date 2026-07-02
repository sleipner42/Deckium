import {
    DEFAULT_TEXT_FONT_SIZE,
    HEADER_FONT_SIZES,
} from '../../../../common/config/typography';

export const HTML_CONTENT_DESCRIPTION =
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
    "- Mixed formatting: <p><strong>Bold</strong> and <em>italic</em> text with <span style='color: red'>red highlight</span></p>";
