import { sanitizeTextContent } from './html-sanitizer';

describe('sanitizeTextContent', () => {
    describe('valid content passes through untouched', () => {
        const valid = [
            '<p><strong>Bold</strong> and <em>italic</em></p>',
            "<p class='ql-align-center'>Centered</p>",
            '<ul><li>one</li><li>two</li></ul>',
            "<h1>Title</h1><p>Body <span style='color: red'>red</span></p>",
            "<span style='font-size: 20px'>sized</span>",
            "<span style='font-family: Arial'>sans</span>",
            '<p>Line one<br>line two</p>',
            "<a href='https://example.com'>link</a>",
        ];
        for (const html of valid) {
            it(`unchanged: ${html}`, () => {
                const result = sanitizeTextContent(html);
                expect(result.changed).toBe(false);
                expect(result.notes).toEqual([]);
                expect(result.html).toBe(html);
            });
        }
    });

    describe('unsupported tags are unwrapped, keeping text', () => {
        it('drops a table but keeps cell text', () => {
            const result = sanitizeTextContent(
                '<table><tr><td>data</td></tr></table>',
            );
            expect(result.changed).toBe(true);
            expect(result.html).toBe('data');
            expect(result.notes.join(' ')).toContain('table');
        });

        it('unwraps h4 to its text', () => {
            const result = sanitizeTextContent('<h4>heading</h4>');
            expect(result.html).toBe('heading');
            expect(result.notes.join(' ')).toContain('h4');
        });

        it('unwraps blockquote and div', () => {
            const result = sanitizeTextContent(
                '<div><blockquote>quoted</blockquote></div>',
            );
            expect(result.html).toBe('quoted');
        });
    });

    describe('font-size clamping', () => {
        it('clamps above the max to 120px', () => {
            const result = sanitizeTextContent(
                "<span style='font-size: 999px'>x</span>",
            );
            expect(result.html).toContain('font-size: 120px');
            expect(result.notes.join(' ')).toContain('clamped');
        });
        it('clamps below the min to 4px', () => {
            const result = sanitizeTextContent(
                "<span style='font-size: 1px'>x</span>",
            );
            expect(result.html).toContain('font-size: 4px');
        });
    });

    describe('font-family whitelist', () => {
        it('substitutes an unlisted named font to the nearest family', () => {
            const result = sanitizeTextContent(
                "<span style='font-family: Times New Roman'>x</span>",
            );
            expect(result.html).toContain('font-family: Georgia');
            expect(result.notes.join(' ')).toContain('font-family');
        });

        it('drops a completely unknown font', () => {
            const result = sanitizeTextContent(
                "<span style='font-family: Papyrus'>x</span>",
            );
            expect(result.html).not.toContain('font-family');
            expect(result.notes.join(' ')).toContain(
                'not in the supported set',
            );
        });

        it('canonicalizes case silently (no agent note)', () => {
            const result = sanitizeTextContent(
                "<span style='font-family: arial'>x</span>",
            );
            expect(result.changed).toBe(true);
            expect(result.html).toContain('font-family: Arial');
            expect(result.notes).toEqual([]);
        });

        it('maps legacy ql-font-* classes to inline font-family', () => {
            const result = sanitizeTextContent(
                "<p class='ql-font-serif'>legacy</p>",
            );
            expect(result.html).toContain('font-family: Georgia');
            expect(result.html).not.toContain('ql-font');
        });
    });

    describe('security / attribute stripping', () => {
        it('drops <script> and its content entirely', () => {
            const result = sanitizeTextContent(
                '<script>alert(1)</script><p>safe</p>',
            );
            expect(result.html).toBe('<p>safe</p>');
            expect(result.html).not.toContain('alert');
        });

        it('strips event handlers and arbitrary attributes', () => {
            const result = sanitizeTextContent(
                '<p onclick="evil()" id="x" data-y="1">t</p>',
            );
            expect(result.html).toBe('<p>t</p>');
            expect(result.notes.join(' ')).toContain('attribute');
        });

        it('drops javascript: hrefs but keeps safe ones', () => {
            const result = sanitizeTextContent(
                "<a href='javascript:evil()'>bad</a>",
            );
            expect(result.html).toBe('<a>bad</a>');
            expect(result.notes.join(' ')).toContain('unsafe');
        });

        it('drops disallowed inline styles like position', () => {
            const result = sanitizeTextContent(
                "<span style='position: absolute; color: blue'>x</span>",
            );
            expect(result.html).toContain('color: blue');
            expect(result.html).not.toContain('position');
        });

        it('rejects a color with url() injection', () => {
            const result = sanitizeTextContent(
                "<span style='color: url(evil)'>x</span>",
            );
            expect(result.html).not.toContain('url');
        });
    });

    describe('idempotency', () => {
        const samples = [
            '<table><tr><td>x</td></tr></table>',
            "<span style='font-size: 999px; font-family: Times New Roman; margin: 4px'>y</span>",
            "<div class='foo ql-align-center'><h4>z</h4></div>",
            '<script>x</script><p>ok</p>',
        ];
        for (const html of samples) {
            it(`sanitize(sanitize(x)) == sanitize(x): ${html}`, () => {
                const once = sanitizeTextContent(html);
                const twice = sanitizeTextContent(once.html);
                expect(twice.html).toBe(once.html);
                expect(twice.changed).toBe(false);
            });
        }
    });
});
