import {
    FONT_WHITELIST,
    MAX_FONT_SIZE_PX,
    MIN_FONT_SIZE_PX,
} from '../../../../common/config/text-formats';
import {
    DEFAULT_TEXT_FONT_SIZE,
    HEADER_FONT_SIZES,
} from '../../../../common/config/typography';

// The agent's text-content documentation is generated from the same spec the
// sanitizer enforces (common/config/text-formats.ts), so the two can never
// drift. Anything the agent emits outside this set is stripped before storage
// and reported back in the tool result.

const fontList = FONT_WHITELIST.map((font) => font.label).join(', ');

export const HTML_CONTENT_DESCRIPTION =
    'The text content to display as HTML. Only the following is supported; ' +
    'anything else is stripped on save and the tool result will tell you what ' +
    'was removed.\n\n' +
    'STRUCTURE:\n' +
    '- <p>Regular paragraph text</p>\n' +
    `- <h1>Large heading ${HEADER_FONT_SIZES.h1}</h1>, <h2>Medium heading ${HEADER_FONT_SIZES.h2}</h2>, <h3>Small heading ${HEADER_FONT_SIZES.h3}</h3> (no <h4> or deeper)\n` +
    '- <br> for line breaks\n\n' +
    'TEXT STYLING:\n' +
    '- <strong>Bold</strong> or <b>Bold</b>\n' +
    '- <em>Italic</em> or <i>Italic</i>\n' +
    '- <u>Underlined</u>\n' +
    '- <s>Strikethrough</s>\n' +
    '- <code>inline code</code>\n' +
    '- <a href="https://...">link</a> (http/https/mailto only)\n\n' +
    'LISTS:\n' +
    '- <ul><li>Bullet item</li><li>Another</li></ul>\n' +
    '- <ol><li>Numbered item</li><li>Another</li></ol>\n\n' +
    'ALIGNMENT (use these exact classes, nothing else):\n' +
    '- Default: left aligned (no class)\n' +
    "- <p class='ql-align-center'>Centered</p>\n" +
    "- <p class='ql-align-right'>Right</p>\n" +
    "- <p class='ql-align-justify'>Justified</p>\n\n" +
    'INLINE STYLES (only these style properties are kept):\n' +
    `- Font size: <span style='font-size: 50px'>text</span> — integer px from ${MIN_FONT_SIZE_PX} to ${MAX_FONT_SIZE_PX} (out-of-range values are clamped); default is ${DEFAULT_TEXT_FONT_SIZE}\n` +
    "- Text color: <span style='color: #ff0000'>text</span> — hex, rgb(a), hsl(a), or a common named color\n" +
    "- Highlight: <span style='background-color: yellow'>text</span>\n" +
    `- Font family: <span style='font-family: Arial'>text</span> — must be one of: ${fontList} (other fonts are substituted or dropped)\n\n` +
    'EXAMPLES:\n' +
    "- <h1 class='ql-align-center'>My Title</h1>\n" +
    "- <p><strong>Bold</strong> and <em>italic</em> with <span style='color: red'>red</span> text</p>\n" +
    '- <ul><li>First point</li><li>Second point</li></ul>';
