/**
 * @jest-environment node
 */
import { pptxContentToQuillHtml, quillHtmlToPptxRichText } from './rich-text';

describe('quillHtmlToPptxRichText (export)', () => {
    it('emits a single run with a trailing break for a plain paragraph', () => {
        const runs = quillHtmlToPptxRichText('<p>Hello</p>');
        expect(runs).toEqual([{ text: 'Hello', options: { breakLine: true } }]);
    });

    it('flattens nested bold/italic into one run', () => {
        const runs = quillHtmlToPptxRichText(
            '<p>a <strong>b <em>c</em></strong></p>',
        );
        expect(runs[0]).toEqual({ text: 'a ', options: {} });
        expect(runs[1]).toEqual({ text: 'b ', options: { bold: true } });
        expect(runs[2]).toEqual({
            text: 'c',
            options: { bold: true, italic: true, breakLine: true },
        });
    });

    it('converts colored and sized spans (px -> pt)', () => {
        const runs = quillHtmlToPptxRichText(
            '<p><span style="color:#f00;font-size:24px">z</span></p>',
        );
        expect(runs[0].options.color).toBe('FF0000');
        expect(runs[0].options.fontSize).toBe(18);
    });

    it('carries alignment and font class onto runs', () => {
        const runs = quillHtmlToPptxRichText(
            '<p class="ql-align-center ql-font-serif">t</p>',
        );
        expect(runs[0].options.align).toBe('center');
        expect(runs[0].options.fontFace).toBe('Georgia');
    });

    it('maps underline and strike', () => {
        const runs = quillHtmlToPptxRichText('<p><u>a</u><s>b</s></p>');
        expect(runs[0].options.underline).toEqual({ style: 'sng' });
        expect(runs[1].options.strike).toBe(true);
    });

    it('uses native bullets for unordered and numbers for ordered lists', () => {
        const bullet = quillHtmlToPptxRichText(
            '<ul><li data-list="bullet">a</li></ul>',
        );
        expect(bullet[0].options.bullet).toBe(true);

        const ordered = quillHtmlToPptxRichText(
            '<ol><li data-list="ordered">a</li></ol>',
        );
        expect(ordered[0].options.bullet).toEqual({ type: 'number' });
    });

    it('supports manual bullet prefixes as a fallback', () => {
        const runs = quillHtmlToPptxRichText(
            '<ol><li data-list="ordered">a</li><li data-list="ordered">b</li></ol>',
            { manualBullets: true },
        );
        expect(runs[0].text).toBe('1.  ');
        expect(runs[2].text).toBe('2.  ');
        expect(runs[0].options.bullet).toBeUndefined();
    });

    it('renders an empty paragraph as one empty break', () => {
        const runs = quillHtmlToPptxRichText('<p><br></p>');
        expect(runs).toEqual([{ text: '', options: { breakLine: true } }]);
    });

    it('strips ql-ui noise spans', () => {
        const runs = quillHtmlToPptxRichText(
            '<ul><li data-list="bullet"><span class="ql-ui"></span>item</li></ul>',
        );
        expect(runs).toHaveLength(1);
        expect(runs[0].text).toBe('item');
    });

    it('produces one break per paragraph across multiple paragraphs', () => {
        const runs = quillHtmlToPptxRichText('<p>a</p><p>b</p>');
        expect(runs.map((r) => r.text)).toEqual(['a', 'b']);
        expect(runs.every((r) => r.options.breakLine)).toBe(true);
    });

    it('decodes entities', () => {
        const runs = quillHtmlToPptxRichText('<p>a&amp;b&nbsp;c</p>');
        expect(runs[0].text).toBe('a&b c');
    });
});

describe('pptxContentToQuillHtml (import)', () => {
    it('converts font-size pt -> px applying the scale', () => {
        expect(
            pptxContentToQuillHtml(
                '<p><span style="font-size: 18pt">x</span></p>',
            ),
        ).toBe('<p><span style="font-size: 24px">x</span></p>');
        expect(
            pptxContentToQuillHtml(
                '<p><span style="font-size: 18pt">x</span></p>',
                0.5,
            ),
        ).toBe('<p><span style="font-size: 12px">x</span></p>');
    });

    it('groups bare <li> into a bullet list', () => {
        const out = pptxContentToQuillHtml('<li>a</li><li>b</li>');
        expect(out).toBe(
            '<ul><li data-list="bullet">a</li><li data-list="bullet">b</li></ul>',
        );
    });

    it('maps text-align to a ql-align class and drops the inline style', () => {
        expect(
            pptxContentToQuillHtml('<p style="text-align: center">c</p>'),
        ).toBe('<p class="ql-align-center">c</p>');
    });

    it('maps font-family to a ql-font class and strips the inline family', () => {
        const out = pptxContentToQuillHtml(
            '<p><span style="font-family: Georgia">g</span></p>',
        );
        expect(out).toBe('<p><span class="ql-font-serif">g</span></p>');
    });

    it('converts bold/strike style into tags, eliding the empty span', () => {
        expect(
            pptxContentToQuillHtml(
                '<p><span style="font-weight: bold">b</span></p>',
            ),
        ).toBe('<p><strong>b</strong></p>');
        expect(
            pptxContentToQuillHtml(
                '<p><span style="text-decoration-line: line-through">s</span></p>',
            ),
        ).toBe('<p><s>s</s></p>');
    });

    it('keeps the span when it carries color plus a formatting tag', () => {
        expect(
            pptxContentToQuillHtml(
                '<p><span style="color: red; font-weight: bold">b</span></p>',
            ),
        ).toBe('<p><span style="color: #FF0000"><strong>b</strong></span></p>');
    });

    it('normalizes colors', () => {
        expect(
            pptxContentToQuillHtml('<p><span style="color: red">r</span></p>'),
        ).toBe('<p><span style="color: #FF0000">r</span></p>');
    });

    it('returns an empty paragraph for empty content', () => {
        expect(pptxContentToQuillHtml('')).toBe('<p></p>');
        expect(pptxContentToQuillHtml('   ')).toBe('<p></p>');
    });
});

describe('semantic round-trip (invertible subset)', () => {
    it('preserves text, bold, color, size and alignment quill -> pptx', () => {
        const quill =
            '<p class="ql-align-right"><strong><span style="color:#0080ff;font-size:32px">Title</span></strong></p>';
        const runs = quillHtmlToPptxRichText(quill);
        expect(runs).toHaveLength(1);
        expect(runs[0]).toEqual({
            text: 'Title',
            options: {
                bold: true,
                color: '0080FF',
                fontSize: 24,
                align: 'right',
                breakLine: true,
            },
        });
    });
});
