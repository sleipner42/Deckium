/**
 * Typography configuration for consistent header font sizes across the application
 */
export const HEADER_FONT_SIZES = {
    h1: '64px', // For slide titles
    h2: '36px', // For section headers
    h3: '28px', // For subsection headers
} as const;

/**
 * Get font size for a specific header level
 */
export function getHeaderFontSize(level: 'h1' | 'h2' | 'h3'): string {
    return HEADER_FONT_SIZES[level];
}

/**
 * Header font size descriptions for AI prompts
 */
export const HEADER_DESCRIPTIONS = {
    h1: 'use for tiltle slide headers',
    h2: 'use for normal slide headers',
    h3: "use for subsection headers, but not for subheaders as it's bold",
} as const;
