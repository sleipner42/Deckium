// The minimal CSS named-color set worth resolving; anything unknown or
// unparseable returns undefined so callers can fall through to a default
// rather than emitting "[object Object]" or a bad hex.
const NAMED: Record<string, string> = {
    black: '000000',
    white: 'FFFFFF',
    red: 'FF0000',
    green: '008000',
    lime: '00FF00',
    blue: '0000FF',
    yellow: 'FFFF00',
    cyan: '00FFFF',
    aqua: '00FFFF',
    magenta: 'FF00FF',
    fuchsia: 'FF00FF',
    gray: '808080',
    grey: '808080',
    silver: 'C0C0C0',
    maroon: '800000',
    olive: '808000',
    navy: '000080',
    purple: '800080',
    teal: '008080',
    orange: 'FFA500',
};

const toHexByte = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, '0');

/**
 * Normalize any CSS-ish color to a bare 6-digit uppercase hex (no '#'), the
 * form pptxgenjs wants. Handles #rgb / #rrggbb / #rrggbbaa (alpha dropped),
 * rgb()/rgba(), named colors, and transparent/none. Returns undefined for
 * empty/unknown/unparseable input.
 */
export const normalizeHex = (input?: string | null): string | undefined => {
    if (!input) return undefined;
    const c = input.trim().toLowerCase();
    if (!c || c === 'transparent' || c === 'none' || c === 'inherit') {
        return undefined;
    }

    if (NAMED[c]) return NAMED[c];

    const rgb = c.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) {
        const parts = rgb[1].split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
            return parts
                .slice(0, 3)
                .map(toHexByte)
                .join('')
                .toUpperCase();
        }
        return undefined;
    }

    const hex = c.startsWith('#') ? c.slice(1) : c;
    if (/^[0-9a-f]{3}$/.test(hex)) {
        return hex
            .split('')
            .map((ch) => ch + ch)
            .join('')
            .toUpperCase();
    }
    if (/^[0-9a-f]{6}$/.test(hex)) return hex.toUpperCase();
    if (/^[0-9a-f]{8}$/.test(hex)) return hex.slice(0, 6).toUpperCase();

    return undefined;
};
