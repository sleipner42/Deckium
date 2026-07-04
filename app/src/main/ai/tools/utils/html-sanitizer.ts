import {
    NodeType,
    type HTMLElement as ParsedElement,
    type Node as ParsedNode,
    parse,
} from 'node-html-parser';
import {
    ALIGN_CLASSES,
    ALLOWED_TAGS,
    canonicalFont,
    STYLE_PROPS,
} from '../../../../common/config/text-formats';

export interface SanitizeResult {
    /** The cleaned HTML (identical to the input when nothing was changed). */
    html: string;
    /** Whether the sanitizer altered the content in any way. */
    changed: boolean;
    /**
     * Short, human-readable notes on what was normalized, for the agent. Can
     * be empty even when `changed` is true (e.g. a silent case-canonicalization
     * of a font name that we don't want to bother the agent about).
     */
    notes: string[];
}

// Accumulates results as the tree is walked. `mutated` tracks any byte-level
// change we must persist; `notes` is the agent-facing subset (skips changes
// too trivial to report, like `arial` -> `Arial`).
interface SanitizeContext {
    mutated: boolean;
    notes: Set<string>;
}

// Dropped entirely, including their text content.
const DROP_WITH_CONTENT = new Set([
    'script',
    'style',
    'noscript',
    'iframe',
    'object',
    'embed',
    'template',
]);

const VOID_TAGS = new Set(['br']);

const LEGACY_FONT_CLASS: Record<string, string> = {
    'ql-font-serif': 'Georgia',
    'ql-font-monospace': 'Courier',
    'ql-font-sans': 'Arial',
};

function escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function isSafeHref(value: string): boolean {
    const v = value.trim().toLowerCase();
    return (
        v.startsWith('http://') ||
        v.startsWith('https://') ||
        v.startsWith('mailto:') ||
        v.startsWith('#')
    );
}

/** Lowercased first family token of a font-family value, quotes stripped. */
function firstFamilyToken(value: string): string {
    return (value.split(',')[0] ?? '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .trim()
        .toLowerCase();
}

/** Collect the surviving classes, promoting legacy ql-font-* to a font style. */
function cleanClasses(
    raw: string,
    ctx: SanitizeContext,
): { classes: string[]; fontFromClass: string | null } {
    const classes: string[] = [];
    let fontFromClass: string | null = null;

    for (const cls of raw.split(/\s+/).filter(Boolean)) {
        if ((ALIGN_CLASSES as string[]).includes(cls)) {
            classes.push(cls);
        } else if (LEGACY_FONT_CLASS[cls]) {
            fontFromClass = LEGACY_FONT_CLASS[cls];
            ctx.mutated = true; // class is consumed / replaced by inline style
        } else {
            ctx.mutated = true;
            ctx.notes.add('removed unsupported CSS class(es)');
        }
    }

    return { classes, fontFromClass };
}

/** Keep only allowed, validated inline style properties. */
function cleanStyle(
    raw: string,
    fontFromClass: string | null,
    ctx: SanitizeContext,
): string[] {
    const kept: string[] = [];

    for (const decl of raw.split(';')) {
        const idx = decl.indexOf(':');
        if (idx === -1) {
            continue;
        }
        const prop = decl.slice(0, idx).trim().toLowerCase();
        const value = decl.slice(idx + 1).trim();
        const validator = STYLE_PROPS[prop];
        if (!validator) {
            ctx.mutated = true;
            ctx.notes.add('removed unsupported inline style(s)');
            continue;
        }
        const normalized = validator(value);
        if (normalized === null) {
            ctx.mutated = true;
            ctx.notes.add(
                prop === 'font-family'
                    ? 'font-family not in the supported set; dropped'
                    : 'removed invalid inline style value',
            );
            continue;
        }
        if (normalized !== value) {
            ctx.mutated = true;
            if (prop === 'font-size') {
                ctx.notes.add('clamped font-size to the 4-120px range');
            } else if (prop === 'font-family') {
                // Note only a real family swap (Times New Roman -> Georgia),
                // not a silent case/quote canonicalization (arial -> Arial).
                if (normalized.toLowerCase() !== firstFamilyToken(value)) {
                    ctx.notes.add(
                        'substituted font-family with the nearest supported font',
                    );
                }
            } else {
                ctx.notes.add('normalized an inline style value');
            }
        }
        kept.push(`${prop}: ${normalized}`);
    }

    // A legacy ql-font-* class becomes an inline font-family, unless the
    // element already declares one.
    if (fontFromClass && !kept.some((d) => d.startsWith('font-family'))) {
        const canonical = canonicalFont(fontFromClass);
        if (canonical) {
            kept.push(`font-family: ${canonical}`);
            ctx.notes.add('converted legacy font class to an inline style');
        }
    }

    return kept;
}

function cleanAttributes(
    el: ParsedElement,
    tag: string,
    ctx: SanitizeContext,
): string {
    const parts: string[] = [];

    const rawClass = el.getAttribute('class') ?? '';
    const { classes, fontFromClass } = cleanClasses(rawClass, ctx);

    const rawStyle = el.getAttribute('style') ?? '';
    const styleDecls = cleanStyle(rawStyle, fontFromClass, ctx);

    if (classes.length > 0) {
        parts.push(`class="${classes.join(' ')}"`);
    }
    if (styleDecls.length > 0) {
        parts.push(`style="${escapeAttr(styleDecls.join('; '))}"`);
    }

    if (tag === 'a') {
        const href = el.getAttribute('href');
        if (href && isSafeHref(href)) {
            parts.push(`href="${escapeAttr(href.trim())}"`);
        } else if (href) {
            ctx.mutated = true;
            ctx.notes.add('removed unsafe link href');
        }
    }

    // Flag any other attributes we are about to drop (onclick, id, data-*, ...).
    for (const name of Object.keys(el.attributes)) {
        if (
            name !== 'class' &&
            name !== 'style' &&
            !(tag === 'a' && name === 'href')
        ) {
            ctx.mutated = true;
            ctx.notes.add('removed unsupported attribute(s)');
            break;
        }
    }

    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function cleanNode(node: ParsedNode, ctx: SanitizeContext): string {
    if (node.nodeType === NodeType.TEXT_NODE) {
        return node.toString();
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) {
        // Comments and anything else: strip silently (no agent-facing note).
        ctx.mutated = true;
        return '';
    }

    const el = node as ParsedElement;
    const tag = el.rawTagName?.toLowerCase() ?? '';

    if (DROP_WITH_CONTENT.has(tag)) {
        ctx.mutated = true;
        ctx.notes.add(`removed <${tag}> and its content`);
        return '';
    }

    const innerHtml = el.childNodes
        .map((child) => cleanNode(child, ctx))
        .join('');

    if (!ALLOWED_TAGS.has(tag)) {
        ctx.mutated = true;
        ctx.notes.add(`unwrapped unsupported <${tag}> (kept its text)`);
        return innerHtml;
    }

    if (VOID_TAGS.has(tag)) {
        return `<${tag}>`;
    }

    const attrs = cleanAttributes(el, tag, ctx);
    return `<${tag}${attrs}>${innerHtml}</${tag}>`;
}

/**
 * Validate and normalize agent-provided text-box HTML against exactly what the
 * Quill editor accepts (see common/config/text-formats.ts). Content is never
 * rejected outright: unsupported tags are unwrapped (their text kept),
 * unsupported classes/styles/attributes are stripped, and `notes` explains
 * what changed so the agent can correct itself. Returns the input untouched
 * when nothing needed changing (so callers don't churn valid content).
 */
export function sanitizeTextContent(html: string): SanitizeResult {
    const ctx: SanitizeContext = { mutated: false, notes: new Set() };
    const root = parse(html);
    const cleaned = root.childNodes
        .map((child) => cleanNode(child, ctx))
        .join('');

    if (!ctx.mutated) {
        return { html, changed: false, notes: [] };
    }
    return { html: cleaned, changed: true, notes: [...ctx.notes] };
}
