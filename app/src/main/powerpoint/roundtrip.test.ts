/**
 * @jest-environment node
 *
 * Import-side round trip against committed .pptx fixtures (generated with
 * pptxgenjs; see __fixtures__). Verifies the real PowerPointImportService
 * reads a 16:9 and a 4:3 deck with correct 96-DPI geometry and letterboxing.
 * The export-side mapping (units + rich-text) is covered by its own unit
 * tests; this locks the pptxgenjs<->pptxtojson coordinate agreement.
 */
import * as path from 'node:path';
import { PowerPointImportService } from '../powerpoint-import/service';

const fixture = (name: string) => path.join(__dirname, '__fixtures__', name);

const importDeck = async (name: string) => {
    const result = await new PowerPointImportService().importPowerPointFile(
        fixture(name),
    );
    if (!result.success || !result.presentation) {
        throw new Error(`import failed: ${result.error}`);
    }
    return result.presentation;
};

describe('import round trip', () => {
    jest.setTimeout(20000);

    it('keeps 16:9 geometry: an element at x:0 stays at x:0', async () => {
        const presentation = await importDeck('wide-16x9.pptx');
        const shape = presentation.slides[0].elements.find(
            (e) => e.type === 'rectangle',
        );
        expect(shape).toBeDefined();
        expect(shape!.position.x).toBeCloseTo(0, 0);
        expect(shape!.position.y).toBeCloseTo(0, 0);
        expect(shape!.size.width).toBeCloseTo(200, 0);
        expect(shape!.size.height).toBeCloseTo(100, 0);
    });

    it('preserves text and font size without 1.333x oversizing', async () => {
        const presentation = await importDeck('wide-16x9.pptx');
        const text = presentation.slides[0].elements.find(
            (e) => e.type === 'textbox',
        ) as { content: string } | undefined;
        expect(text).toBeDefined();
        expect(text!.content).toContain('Hello');
        // 18pt in the file must import as ~24px (not 18px, not 32px).
        const m = text!.content.match(/font-size:\s*(\d+)px/);
        expect(m).not.toBeNull();
        expect(Number(m![1])).toBeGreaterThanOrEqual(23);
        expect(Number(m![1])).toBeLessThanOrEqual(25);
    });

    it('letterboxes a 4:3 source instead of stretching it', async () => {
        const presentation = await importDeck('four-3x4.pptx');
        const shape = presentation.slides[0].elements[0];
        // 4:3 (960x720px) centers in 1280x720 with a 160px left offset.
        expect(shape.position.x).toBeCloseTo(160, 0);
        expect(shape.position.y).toBeCloseTo(0, 0);
        // 1in circle stays a 96x96px square bound, not stretched.
        expect(shape.size.width).toBeCloseTo(96, 0);
        expect(shape.size.height).toBeCloseTo(96, 0);
        expect(shape.type).toBe('circle');
    });
});
