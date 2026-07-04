import {
    HTMLElement,
    type Node,
    NodeType,
    parse,
    TextNode,
} from 'node-html-parser';
import { normalizeHex } from './color';
import { ptToPx, pxToPt } from './units';

// Bidirectional converter between Quill HTML (the app's TextBox.content) and
// PowerPoint rich text. Replaces the old regex pipelines + html2pptxgenjs.

// ---------------------------------------------------------------------------
// Shared font maps (must be exact inverses of each other).
// ---------------------------------------------------------------------------

const QL_FONT_TO_FACE: Record<string, string> = {
    'ql-font-sans': 'Arial',
    'ql-font-serif': 'Georgia',
    'ql-font-monospace': 'Courier New',
};

const FACE_TO_QL_FONT = (family: string): string | undefined => {
    const f = family.replace(/["']/g, '').trim().toLowerCase();
    if (/arial|calibri|helvetica|sans/.test(f)) return 'ql-font-sans';
    if (/georgia|times|garamond|serif/.test(f)) return 'ql-font-serif';
    if (/courier|consolas|mono/.test(f)) return 'ql-font-monospace';
    return undefined;
};

const FACE_FROM_FAMILY = (family: string): string | undefined => {
    const cls = FACE_TO_QL_FONT(family);
    return cls ? QL_FONT_TO_FACE[cls] : family.replace(/["']/g, '').trim();
};

const parseStyle = (style?: string | null): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!style) return out;
    for (const decl of style.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        out[decl.slice(0, i).trim().toLowerCase()] = decl.slice(i + 1).trim();
    }
    return out;
};

const tagOf = (el: HTMLElement): string => (el.rawTagName || '').toLowerCase();
const classOf = (el: HTMLElement): string => el.getAttribute('class') || '';
const isElement = (n: Node): n is HTMLElement =>
    n.nodeType === NodeType.ELEMENT_NODE;
const isText = (n: Node): n is TextNode => n.nodeType === NodeType.TEXT_NODE;

// ===========================================================================
// Export: Quill HTML -> pptxgenjs rich-text runs
// ===========================================================================

export interface PptxTextRunOptions {
    bold?: boolean;
    italic?: boolean;
    underline?: { style: 'sng' };
    strike?: boolean;
    color?: string;
    fontFace?: string;
    fontSize?: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    bullet?: boolean | { type: 'number' };
    indentLevel?: number;
    breakLine?: boolean;
    hyperlink?: { url: string };
}

export interface PptxTextRun {
    text: string;
    options: PptxTextRunOptions;
}

interface Fmt {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    color?: string;
    fontFace?: string;
    fontSize?: number; // points
    align?: 'left' | 'center' | 'right' | 'justify';
    bullet?: boolean | { type: 'number' };
    indentLevel?: number;
    hyperlink?: string;
}

const fontSizeToPt = (v: string): number | undefined => {
    const m = v.trim().match(/^([\d.]+)\s*(px|pt)?$/);
    if (!m) return undefined;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return undefined;
    return m[2] === 'pt' ? n : pxToPt(n); // Quill default is px
};

/** Fold an element's own formatting into the inherited format. */
const applyElementFmt = (base: Fmt, el: HTMLElement): Fmt => {
    const f: Fmt = { ...base };
    switch (tagOf(el)) {
        case 'strong':
        case 'b':
            f.bold = true;
            break;
        case 'em':
        case 'i':
            f.italic = true;
            break;
        case 'u':
            f.underline = true;
            break;
        case 's':
        case 'strike':
        case 'del':
            f.strike = true;
            break;
        case 'a': {
            const href = el.getAttribute('href');
            if (href) f.hyperlink = href;
            break;
        }
    }

    const cls = classOf(el);
    if (cls.includes('ql-align-center')) f.align = 'center';
    else if (cls.includes('ql-align-right')) f.align = 'right';
    else if (cls.includes('ql-align-justify')) f.align = 'justify';
    for (const [k, face] of Object.entries(QL_FONT_TO_FACE)) {
        if (cls.includes(k)) f.fontFace = face;
    }
    const indent = cls.match(/ql-indent-(\d)/);
    if (indent) f.indentLevel = parseInt(indent[1], 10);

    const style = parseStyle(el.getAttribute('style'));
    if (style.color) {
        const c = normalizeHex(style.color);
        if (c) f.color = c;
    }
    if (style['font-family']) {
        f.fontFace = FACE_FROM_FAMILY(style['font-family']) ?? f.fontFace;
    }
    if (style['font-size']) {
        const pt = fontSizeToPt(style['font-size']);
        if (pt) f.fontSize = pt;
    }
    if (
        style['font-weight'] === 'bold' ||
        parseInt(style['font-weight'], 10) >= 600
    ) {
        f.bold = true;
    }
    if (style['font-style'] === 'italic') f.italic = true;
    const decoration =
        style['text-decoration-line'] || style['text-decoration'] || '';
    if (decoration.includes('underline')) f.underline = true;
    if (decoration.includes('line-through')) f.strike = true;
    if (style['text-align']) f.align = style['text-align'] as Fmt['align'];

    return f;
};

const fmtToOptions = (f: Fmt): PptxTextRunOptions => {
    const o: PptxTextRunOptions = {};
    if (f.bold) o.bold = true;
    if (f.italic) o.italic = true;
    if (f.underline) o.underline = { style: 'sng' };
    if (f.strike) o.strike = true;
    if (f.color) o.color = f.color;
    if (f.fontFace) o.fontFace = f.fontFace;
    if (f.fontSize) o.fontSize = f.fontSize;
    if (f.align) o.align = f.align;
    if (f.bullet) o.bullet = f.bullet;
    if (f.indentLevel) o.indentLevel = f.indentLevel;
    if (f.hyperlink) o.hyperlink = { url: f.hyperlink };
    return o;
};

export const quillHtmlToPptxRichText = (
    html: string,
    opts: { manualBullets?: boolean } = {},
): PptxTextRun[] => {
    const root = parse(html || '');
    const runs: PptxTextRun[] = [];

    const walkInline = (node: Node, fmt: Fmt): void => {
        for (const child of node.childNodes) {
            if (isText(child)) {
                if (child.text) {
                    runs.push({ text: child.text, options: fmtToOptions(fmt) });
                }
            } else if (isElement(child)) {
                const tag = tagOf(child);
                if (tag === 'br') {
                    softBreak(fmt);
                } else if (tag === 'span' && classOf(child).includes('ql-ui')) {
                    // Quill DOM noise, always empty.
                } else {
                    walkInline(child, applyElementFmt(fmt, child));
                }
            }
        }
    };

    let blockStart = 0;

    const softBreak = (fmt: Fmt): void => {
        const last = runs[runs.length - 1];
        if (runs.length > blockStart && last && !last.options.breakLine) {
            last.options.breakLine = true;
        } else {
            runs.push({
                text: '',
                options: { ...fmtToOptions(fmt), breakLine: true },
            });
        }
    };

    const endBlock = (fmt: Fmt): void => {
        if (runs.length === blockStart) {
            runs.push({
                text: '',
                options: { ...fmtToOptions(fmt), breakLine: true },
            });
        } else {
            runs[runs.length - 1].options.breakLine = true;
        }
    };

    const emitBlock = (el: HTMLElement, baseFmt: Fmt): void => {
        blockStart = runs.length;
        // For manual-bullet mode, prepend the marker as its own run.
        if (opts.manualBullets && baseFmt.bullet) {
            const marker = typeof baseFmt.bullet === 'object' ? '' : '•  ';
            if (marker) {
                const rest: Fmt = { ...baseFmt, bullet: undefined };
                runs.push({ text: marker, options: fmtToOptions(rest) });
            }
        }
        walkInline(el, baseFmt);
        endBlock(baseFmt);
    };

    let orderedCounter = 0;
    for (const block of root.childNodes) {
        if (isText(block)) {
            if (block.text.trim()) {
                blockStart = runs.length;
                runs.push({ text: block.text, options: {} });
                endBlock({});
            }
            continue;
        }
        if (!isElement(block)) continue;
        const tag = tagOf(block);

        if (tag === 'ul' || tag === 'ol') {
            for (const li of block.childNodes) {
                if (!isElement(li) || tagOf(li) !== 'li') continue;
                const ordered =
                    li.getAttribute('data-list') === 'ordered' || tag === 'ol';
                const base = applyElementFmt({}, li);
                if (opts.manualBullets && ordered) {
                    orderedCounter += 1;
                    const rest: Fmt = { ...base, bullet: undefined };
                    blockStart = runs.length;
                    runs.push({
                        text: `${orderedCounter}.  `,
                        options: fmtToOptions(rest),
                    });
                    walkInline(li, rest);
                    endBlock(rest);
                } else {
                    base.bullet = opts.manualBullets
                        ? undefined
                        : ordered
                          ? { type: 'number' }
                          : true;
                    emitBlock(li, base);
                }
            }
            orderedCounter = 0;
        } else {
            emitBlock(block, applyElementFmt({}, block));
        }
    }

    return runs;
};

// ===========================================================================
// Import: pptxtojson HTML content -> Quill-canonical HTML
// ===========================================================================

const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const alignClass = (align?: string): string | undefined => {
    switch ((align || '').trim().toLowerCase()) {
        case 'center':
            return 'ql-align-center';
        case 'right':
            return 'ql-align-right';
        case 'justify':
            return 'ql-align-justify';
        default:
            return undefined;
    }
};

/** Convert one pptx inline node (or its children) to Quill inline HTML. */
const convertInline = (node: Node, fontScale: number): string => {
    if (isText(node)) return escapeHtml(node.text);
    if (!isElement(node)) return '';

    const tag = tagOf(node);
    const inner = node.childNodes
        .map((c) => convertInline(c, fontScale))
        .join('');

    if (tag === 'a') {
        const href = node.getAttribute('href');
        return href
            ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${inner}</a>`
            : inner;
    }
    if (tag === 'strong' || tag === 'b') return `<strong>${inner}</strong>`;
    if (tag === 'em' || tag === 'i') return `<em>${inner}</em>`;
    if (tag === 'u') return `<u>${inner}</u>`;
    if (tag === 's' || tag === 'strike' || tag === 'del')
        return `<s>${inner}</s>`;
    if (tag === 'br') return '<br>';

    // span (or unknown wrapper): translate style into Quill span + wrappers.
    const style = parseStyle(node.getAttribute('style'));
    const spanStyle: string[] = [];
    const classes: string[] = [];
    let wrapPre = '';
    let wrapPost = '';

    const color = normalizeHex(style.color);
    if (color) spanStyle.push(`color: #${color}`);

    if (style['font-size']) {
        const m = style['font-size'].match(/^([\d.]+)\s*pt$/);
        if (m) {
            const px = Math.round(ptToPx(parseFloat(m[1])) * fontScale);
            spanStyle.push(`font-size: ${px}px`);
        } else {
            spanStyle.push(`font-size: ${style['font-size']}`);
        }
    }

    if (style['font-family']) {
        const cls = FACE_TO_QL_FONT(style['font-family']);
        if (cls) classes.push(cls);
    }

    if (
        style['font-weight'] === 'bold' ||
        parseInt(style['font-weight'], 10) >= 600 ||
        tag === 'b'
    ) {
        wrapPre += '<strong>';
        wrapPost = `</strong>${wrapPost}`;
    }
    if (style['font-style'] === 'italic') {
        wrapPre += '<em>';
        wrapPost = `</em>${wrapPost}`;
    }
    const decoration =
        style['text-decoration-line'] || style['text-decoration'] || '';
    if (decoration.includes('line-through')) {
        wrapPre += '<s>';
        wrapPost = `</s>${wrapPost}`;
    }
    if (decoration.includes('underline')) {
        wrapPre += '<u>';
        wrapPost = `</u>${wrapPost}`;
    }

    const attrs: string[] = [];
    if (classes.length) attrs.push(`class="${classes.join(' ')}"`);
    if (spanStyle.length) attrs.push(`style="${spanStyle.join('; ')}"`);

    const body = `${wrapPre}${inner}${wrapPost}`;
    return attrs.length ? `<span ${attrs.join(' ')}>${body}</span>` : body;
};

const convertBlock = (
    el: HTMLElement,
    quillTag: 'p' | 'li',
    fontScale: number,
    dataList?: 'bullet' | 'ordered',
): string => {
    const style = parseStyle(el.getAttribute('style'));
    const cls = alignClass(style['text-align']);
    const inner = el.childNodes
        .map((c) => convertInline(c, fontScale))
        .join('');
    const attrs: string[] = [];
    if (cls) attrs.push(`class="${cls}"`);
    if (dataList) attrs.push(`data-list="${dataList}"`);
    const open = attrs.length
        ? `<${quillTag} ${attrs.join(' ')}>`
        : `<${quillTag}>`;
    return `${open}${inner || ''}</${quillTag}>`;
};

export const pptxContentToQuillHtml = (html: string, fontScale = 1): string => {
    const root = parse(html || '');
    const blocks: string[] = [];
    let pendingLis: string[] = [];

    const flushLis = (): void => {
        if (pendingLis.length) {
            blocks.push(`<ul>${pendingLis.join('')}</ul>`);
            pendingLis = [];
        }
    };

    for (const node of root.childNodes) {
        if (isText(node)) {
            if (node.text.trim()) {
                flushLis();
                blocks.push(`<p>${escapeHtml(node.text)}</p>`);
            }
            continue;
        }
        if (!isElement(node)) continue;
        const tag = tagOf(node);

        if (tag === 'li') {
            // pptxtojson emits bare <li> with no ordered/bullet signal.
            pendingLis.push(convertBlock(node, 'li', fontScale, 'bullet'));
            continue;
        }
        flushLis();

        if (tag === 'p' || tag === 'div') {
            blocks.push(convertBlock(node, 'p', fontScale));
        } else if (tag === 'ul' || tag === 'ol') {
            const dl = tag === 'ol' ? 'ordered' : 'bullet';
            const items = node.childNodes
                .filter((c) => isElement(c) && tagOf(c) === 'li')
                .map((li) =>
                    convertBlock(li as HTMLElement, 'li', fontScale, dl),
                )
                .join('');
            blocks.push(`<${tag}>${items}</${tag}>`);
        } else {
            blocks.push(`<p>${convertInline(node, fontScale)}</p>`);
        }
    }
    flushLis();

    return blocks.join('') || '<p></p>';
};
