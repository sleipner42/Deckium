import {
    ALIGN_CLASSES,
    ALLOWED_TAGS,
    canonicalFont,
    FONT_CSS_VALUES,
    FONT_WHITELIST,
    QUILL_FORMATS,
    STYLE_PROPS,
} from './text-formats';

// The Quill `formats` array and the HTML-level allowlist the sanitizer enforces
// are two different vocabularies. This mapping ties them together; the tests
// below fail if a Quill format is added/removed without updating the HTML side
// (or vice versa), so the editor and the sanitizer can't silently diverge.
const FORMAT_TO_HTML: Record<
    string,
    { tags?: string[]; styleProp?: string; classes?: string[] }
> = {
    header: { tags: ['h1', 'h2', 'h3'] },
    font: { styleProp: 'font-family' },
    size: { styleProp: 'font-size' },
    bold: { tags: ['strong', 'b'] },
    italic: { tags: ['em', 'i'] },
    underline: { tags: ['u'] },
    strike: { tags: ['s'] },
    list: { tags: ['ul', 'ol', 'li'] },
    link: { tags: ['a'] },
    align: { classes: [...ALIGN_CLASSES] },
    color: { styleProp: 'color' },
    background: { styleProp: 'background-color' },
    code: { tags: ['code'] },
    formula: {}, // katex blot, no plain-HTML representation
};

describe('text-format spec consistency', () => {
    it('every Quill format is mapped and vice versa', () => {
        expect(Object.keys(FORMAT_TO_HTML).sort()).toEqual(
            [...QUILL_FORMATS].sort(),
        );
    });

    it('every mapped tag is in the sanitizer allowlist', () => {
        for (const { tags } of Object.values(FORMAT_TO_HTML)) {
            for (const tag of tags ?? []) {
                expect(ALLOWED_TAGS.has(tag)).toBe(true);
            }
        }
    });

    it('every mapped style property is validated by the sanitizer', () => {
        for (const { styleProp } of Object.values(FORMAT_TO_HTML)) {
            if (styleProp) {
                expect(STYLE_PROPS[styleProp]).toBeInstanceOf(Function);
            }
        }
    });

    it('every content tag in the allowlist belongs to a format', () => {
        const mapped = new Set<string>();
        for (const { tags } of Object.values(FORMAT_TO_HTML)) {
            for (const tag of tags ?? []) mapped.add(tag);
        }
        // `span` carries inline styles; `p`/`br` are structural, no format.
        const structural = new Set(['span', 'p', 'br']);
        for (const tag of ALLOWED_TAGS) {
            if (!structural.has(tag)) {
                expect(mapped.has(tag)).toBe(true);
            }
        }
    });
});

describe('font whitelist', () => {
    it('every canonical CSS value canonicalizes to itself', () => {
        for (const css of FONT_CSS_VALUES) {
            expect(canonicalFont(css)).toBe(css);
        }
    });

    it('every alias maps to its family css value', () => {
        for (const font of FONT_WHITELIST) {
            for (const alias of font.aliases) {
                expect(canonicalFont(alias)).toBe(font.css);
            }
        }
    });

    it('resolves the first family in a fallback stack', () => {
        expect(canonicalFont("'Times New Roman', serif")).toBe('Georgia');
    });

    it('returns null for unknown fonts', () => {
        expect(canonicalFont('Papyrus')).toBeNull();
        expect(canonicalFont('')).toBeNull();
    });
});

describe('style validators', () => {
    it('clamps font-size to the supported px range', () => {
        expect(STYLE_PROPS['font-size']('999px')).toBe('120px');
        expect(STYLE_PROPS['font-size']('1px')).toBe('4px');
        expect(STYLE_PROPS['font-size']('20px')).toBe('20px');
        expect(STYLE_PROPS['font-size']('20pt')).toBeNull();
    });

    it('accepts safe colors and rejects injection', () => {
        expect(STYLE_PROPS.color('#ff0000')).toBe('#ff0000');
        expect(STYLE_PROPS.color('red')).toBe('red');
        expect(STYLE_PROPS.color('rgb(1,2,3)')).toBe('rgb(1,2,3)');
        expect(STYLE_PROPS.color('url(evil)')).toBeNull();
        expect(STYLE_PROPS.color('red; position:absolute')).toBeNull();
    });
});
