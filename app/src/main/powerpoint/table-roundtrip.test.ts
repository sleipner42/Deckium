/**
 * @jest-environment node
 *
 * Full export -> import round trip for Table elements. The real
 * PowerPointExportService writes a table into a pptxgenjs deck (electron and
 * the hidden-window helpers are mocked away — table conversion never touches
 * them), and the real PowerPointImportService reads it back, locking the
 * pptxgenjs<->pptxtojson table agreement (geometry, header, cell rich text).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import type { Table } from '../../common/domain/entities/types';
import { LAYOUT } from './units';

// The export service pulls electron + the main-process hidden window at import
// time; neither is reachable (or needed) for table conversion.
jest.mock('electron', () => ({ BrowserWindow: class {}, dialog: {} }));
jest.mock('../main', () => ({
    getSecondWindow: () => null,
    setSlideInHiddenWindow: async () => undefined,
}));

import { PowerPointExportService } from '../powerpoint-export/service';
import { PowerPointImportService } from '../powerpoint-import/service';

const makeTable = (): Table => ({
    id: 'tbl-1',
    type: 'table',
    position: { x: 128, y: 72 },
    size: { width: 640, height: 216 },
    rows: [
        [
            { content: '<p><strong>North</strong></p>' },
            { content: '<p>Q1</p>' },
        ],
        [{ content: '<p>Region A</p>' }, { content: '<p><em>1,204</em></p>' }],
        [
            { content: '<p>Region B</p>' },
            { content: '<p>987</p>', backgroundColor: '#FFEEAA' },
        ],
    ],
    columnWidths: [3, 1],
    rowHeights: [1, 1, 1],
    headerRow: true,
    borderColor: '#FF0000',
    borderWidth: 2,
    headerBackgroundColor: '#DDDDDD',
    zIndex: 1,
});

/** Run the real export converter over one table into a deck buffer. */
const exportTableDeck = async (table: Table): Promise<Buffer> => {
    const pptx = new PptxGenJS();
    pptx.defineLayout({
        name: LAYOUT.name,
        width: LAYOUT.width,
        height: LAYOUT.height,
    });
    pptx.layout = LAYOUT.name;
    const slide = pptx.addSlide();

    const service = new PowerPointExportService();
    // Dispatch through the real private converter (async, no plots involved).
    await (
        service as unknown as {
            convertElement: (
                s: PptxGenJS.Slide,
                e: Table,
                p: PptxGenJS,
                r: () => Promise<boolean>,
            ) => Promise<void>;
        }
    ).convertElement(slide, table, pptx, async () => false);

    // pptxgenjs eagerly fires `import('node:fs')` when it detects Node, which
    // jest's VM can't service without --experimental-vm-modules. We have no
    // media to encode, so mask the Node signal for the duration of the write:
    // the requested 'nodebuffer' output is still produced by JSZip.
    const realRelease = process.release;
    Object.defineProperty(process, 'release', {
        value: { ...realRelease, name: 'jest' },
        configurable: true,
    });
    try {
        const out = (await (
            pptx as unknown as {
                write: (o: { outputType: string }) => Promise<Buffer>;
            }
        ).write({ outputType: 'nodebuffer' })) as Buffer;
        return out;
    } finally {
        Object.defineProperty(process, 'release', {
            value: realRelease,
            configurable: true,
        });
    }
};

const roundTrip = async (table: Table): Promise<Table> => {
    const buf = await exportTableDeck(table);
    const file = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-table-')),
        'deck.pptx',
    );
    fs.writeFileSync(file, buf);

    const result = await new PowerPointImportService().importPowerPointFile(
        file,
    );
    fs.rmSync(path.dirname(file), { recursive: true, force: true });

    if (!result.success || !result.presentation) {
        throw new Error(`import failed: ${result.error}`);
    }
    const el = result.presentation.slides[0].elements.find(
        (e) => e.type === 'table',
    );
    if (!el || el.type !== 'table') throw new Error('no table imported');
    return el;
};

describe('table export -> import round trip', () => {
    jest.setTimeout(20000);

    let imported: Table;
    beforeAll(async () => {
        imported = await roundTrip(makeTable());
    });

    it('preserves the grid dimensions', () => {
        expect(imported.rows).toHaveLength(3);
        expect(imported.rows.every((r) => r.length === 2)).toBe(true);
        expect(imported.columnWidths).toHaveLength(2);
        expect(imported.rowHeights).toHaveLength(3);
    });

    it('keeps proportional column weights (3:1)', () => {
        const [c0, c1] = imported.columnWidths;
        expect(c0 / c1).toBeCloseTo(3, 1);
    });

    it('places the table with 96-DPI geometry', () => {
        // 128px -> ~1.333in -> 96pt -> back to 128px; 640px -> 480px width.
        expect(imported.position.x).toBeCloseTo(128, 0);
        expect(imported.position.y).toBeCloseTo(72, 0);
        expect(imported.size.width).toBeCloseTo(640, 0);
        expect(imported.size.height).toBeCloseTo(216, 0);
    });

    it('detects the header row and its background', () => {
        expect(imported.headerRow).toBe(true);
        expect(imported.headerBackgroundColor?.toUpperCase()).toBe('#DDDDDD');
    });

    it('preserves the border color and width', () => {
        expect(imported.borderColor?.toUpperCase()).toBe('#FF0000');
        expect(imported.borderWidth).toBe(2);
    });

    it('preserves header cell text and bold formatting', () => {
        expect(imported.rows[0][0].content).toContain('North');
        expect(imported.rows[0][0].content).toMatch(/<strong|font-weight/i);
        expect(imported.rows[0][1].content).toContain('Q1');
        // Header fill lives on the element, not the individual cells.
        expect(imported.rows[0][0].backgroundColor).toBeUndefined();
    });

    it('preserves plain and italic body cell text', () => {
        // pptx encodes runs of spaces as non-breaking spaces; normalize.
        const plain = imported.rows[1][0].content.replace(/\u00a0/g, ' ');
        expect(plain).toContain('Region A');
        expect(imported.rows[1][1].content).toContain('1,204');
        expect(imported.rows[1][1].content).toMatch(/<em|font-style/i);
    });

    it('preserves a per-cell background color', () => {
        expect(imported.rows[2][1].backgroundColor?.toUpperCase()).toBe(
            '#FFEEAA',
        );
    });
});
