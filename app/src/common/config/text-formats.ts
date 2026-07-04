// Single source of truth for the rich text a text box accepts. Three consumers
// must agree, so they all derive from here:
//   1. The Quill editor's registered `formats` + font attributor (renderer).
//   2. The agent's content documentation (html-content.ts).
//   3. The sanitizer that validates/normalizes agent HTML before storage.
// A consistency test (text-formats.test.ts) asserts QUILL_FORMATS stays in
// sync with the HTML-level allowlist so the two vocabularies can't drift.

export const BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'br'];

export const INLINE_TAGS = [
    'span',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'a',
    'code',
];

export const ALLOWED_TAGS = new Set([...BLOCK_TAGS, ...INLINE_TAGS]);

export const ALIGN_CLASSES = [
    'ql-align-center',
    'ql-align-right',
    'ql-align-justify',
];

export const MIN_FONT_SIZE_PX = 4;
export const MAX_FONT_SIZE_PX = 120;

// Quill format names (a different vocabulary from the HTML tag/attr allowlist).
// This is the array registered on the Quill instance in TextElement.tsx.
export const QUILL_FORMATS = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'link',
    'align',
    'color',
    'background',
    'code',
    'formula',
];

export interface FontSpec {
    /** Human label for the picker and the agent documentation. */
    label: string;
    /**
     * Canonical CSS value stored in the HTML and registered in Quill's font
     * style-attributor whitelist. Kept to single-token families on purpose:
     * Quill's style attributor matches the browser-normalized `style.fontFamily`
     * string exactly, and multi-word families get re-quoted by the browser
     * (`Times New Roman` -> `"Times New Roman"`), which breaks the match. The
     * aliases below absorb the common multi-word names.
     */
    css: string;
    /** Lowercased input names that normalize to this family. */
    aliases: string[];
}

// Cross-platform system families (Linux resolves these via fontconfig aliases).
// No fonts are bundled, so everything here must render from the OS.
export const FONT_WHITELIST: FontSpec[] = [
    {
        label: 'Sans-serif (Arial)',
        css: 'Arial',
        aliases: [
            'arial',
            'helvetica',
            'calibri',
            'liberation sans',
            'sans-serif',
            'system-ui',
            'system',
        ],
    },
    {
        label: 'Serif (Georgia)',
        css: 'Georgia',
        aliases: [
            'georgia',
            'times new roman',
            'times',
            'eb garamond',
            'garamond',
            'liberation serif',
            'serif',
        ],
    },
    {
        label: 'Monospace (Courier)',
        css: 'Courier',
        aliases: [
            'courier new',
            'courier',
            'consolas',
            'monaco',
            'liberation mono',
            'monospace',
        ],
    },
    {
        label: 'Verdana',
        css: 'Verdana',
        aliases: ['verdana', 'tahoma', 'segoe ui'],
    },
];

/** Canonical CSS font values, for Quill's `FontStyle.whitelist`. */
export const FONT_CSS_VALUES = FONT_WHITELIST.map((font) => font.css);

/**
 * Normalize an arbitrary font-family value (possibly quoted, possibly a
 * fallback stack) to a canonical whitelisted CSS value, or null if none match.
 * Only the first family in a stack is considered.
 */
export function canonicalFont(input: string): string | null {
    const first = input.split(',')[0] ?? '';
    const cleaned = first
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .trim()
        .toLowerCase();
    if (!cleaned) {
        return null;
    }
    for (const font of FONT_WHITELIST) {
        if (
            font.css.toLowerCase() === cleaned ||
            font.aliases.includes(cleaned)
        ) {
            return font.css;
        }
    }
    return null;
}

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const FUNC_COLOR = /^(rgb|rgba|hsl|hsla)\(\s*[\d.,%/\s]+\)$/i;
const NAMED_COLORS = new Set([
    'transparent',
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'orange',
    'purple',
    'gray',
    'grey',
    'pink',
    'brown',
    'cyan',
    'magenta',
    'navy',
    'teal',
    'maroon',
    'olive',
    'lime',
    'aqua',
    'silver',
    'gold',
    'darkgray',
    'darkgrey',
    'lightgray',
    'lightgrey',
    'darkblue',
    'darkgreen',
    'darkred',
    'lightblue',
    'lightgreen',
]);

/** True for a CSS color we consider safe to keep (blocks url()/expression/etc). */
export function isSafeColor(value: string): boolean {
    const v = value.trim();
    if (!v || /[;{}<>]/.test(v) || /url\s*\(/i.test(v)) {
        return false;
    }
    return (
        HEX_COLOR.test(v) ||
        FUNC_COLOR.test(v) ||
        NAMED_COLORS.has(v.toLowerCase())
    );
}

/**
 * Validators for the inline style properties we keep. Each returns the
 * normalized value to store, or null to drop the property.
 */
export const STYLE_PROPS: Record<string, (value: string) => string | null> = {
    'font-size': (value) => {
        const match = value.trim().match(/^(\d+(?:\.\d+)?)px$/);
        if (!match) {
            return null;
        }
        const clamped = Math.min(
            MAX_FONT_SIZE_PX,
            Math.max(MIN_FONT_SIZE_PX, Math.round(Number(match[1]))),
        );
        return `${clamped}px`;
    },
    'font-family': (value) => canonicalFont(value),
    color: (value) => (isSafeColor(value) ? value.trim() : null),
    'background-color': (value) => (isSafeColor(value) ? value.trim() : null),
};
