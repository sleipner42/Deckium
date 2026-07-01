// Minimal ambient declaration for the untyped `html2pptxgenjs` package.
// Only the surface actually used by this app is declared.
declare module 'html2pptxgenjs' {
    // Returns the rich-text array consumed by PptxGenJS `addText`.
    export function htmlToPptxText(html: string, options?: unknown): unknown[];
}
