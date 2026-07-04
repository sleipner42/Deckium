// Full export -> import round trip through BOTH real services, exercising
// every component type. Runs in a plain Node process (not jest) because
// pptxgenjs's writer and pptxtojson's reader want opposite module modes under
// jest. Electron and the offscreen window are stubbed via a module hook so
// the real services run headless.
//
//   npm run test:pptx-e2e
//
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const appDir = path.join(__dirname, '..');
const exportPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-e2e-')),
    'deck.pptx',
);

// 1x1 PNG returned by the stub offscreen window so plot capture works.
const PNG_1x1 = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
        '0000000a49444154789c630001000005000' +
        '10d0a2db40000000049454e44ae426082',
    'hex',
);
const stubWindow = {
    isDestroyed: () => false,
    webContents: { capturePage: async () => ({ toPNG: () => PNG_1x1 }) },
};

// --- Stub electron / ../main / redirect pptxtojson to its ESM build --------
const pptxtojsonEsm = path.join(appDir, 'node_modules/pptxtojson/dist/index.js');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'electron') {
        return {
            dialog: {
                showSaveDialog: async () => ({
                    canceled: false,
                    filePath: exportPath,
                }),
            },
            BrowserWindow: class {},
        };
    }
    if (request === '../main') {
        return {
            getSecondWindow: () => stubWindow,
            setSlideInHiddenWindow: async () => {},
        };
    }
    if (request === 'pptxtojson') {
        return origLoad.call(this, pptxtojsonEsm, parent, isMain);
    }
    return origLoad.call(this, request, parent, isMain);
};

require('ts-node').register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs', esModuleInterop: true },
});

const {
    PowerPointExportService,
} = require('../src/main/powerpoint-export/service');
const {
    PowerPointImportService,
} = require('../src/main/powerpoint-import/service');

// --- Build a deck with every component type ---------------------------------
const TINY_IMG = `data:image/png;base64,${PNG_1x1.toString('base64')}`;
const at = (x, y, w, h) => ({
    position: { x, y },
    size: { width: w, height: h },
});

const original = {
    id: 'deck',
    title: 'All Components',
    slides: [
        {
            id: 's1',
            background: '#FFFFFF',
            elements: [
                {
                    id: 't1',
                    type: 'textbox',
                    ...at(0, 0, 400, 90),
                    content:
                        '<p><strong><span style="color:#0080ff;font-size:24px">Title</span></strong></p>',
                    verticalAlign: 'top',
                },
                {
                    id: 'r1',
                    type: 'rectangle',
                    ...at(100, 200, 150, 120),
                    fillColor: '#ff0000',
                    strokeColor: '#000000',
                    strokeWidth: 2,
                },
                {
                    id: 'c1',
                    type: 'circle',
                    ...at(300, 200, 120, 120),
                    fillColor: '#00ff00',
                    strokeColor: '#000000',
                    strokeWidth: 1,
                },
                {
                    id: 'g1',
                    type: 'triangle',
                    ...at(500, 200, 140, 120),
                    fillColor: '#0000ff',
                    strokeColor: '#000000',
                    strokeWidth: 1,
                },
                {
                    id: 'i1',
                    type: 'image',
                    ...at(700, 200, 100, 100),
                    content: TINY_IMG,
                },
                {
                    id: 'b1',
                    type: 'barchart',
                    ...at(100, 400, 400, 260),
                    data: { x: ['A', 'B', 'C'], y: [10, 20, 15] },
                    title: 'Sales',
                    xAxisLabel: 'Cat',
                    yAxisLabel: 'Val',
                },
                {
                    id: 'p1',
                    type: 'plot',
                    ...at(600, 400, 300, 260),
                    data: {},
                    plotType: 'line',
                },
            ],
        },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
};

// --- Assertions -------------------------------------------------------------
let failed = 0;
const check = (name, cond, detail) => {
    if (cond) {
        console.log(`  PASS  ${name}`);
    } else {
        failed++;
        console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    }
};
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;

(async () => {
    await new PowerPointExportService().exportPresentation(original);
    const result = await new PowerPointImportService().importPowerPointFile(
        exportPath,
    );
    if (!result.success || !result.presentation) {
        console.error('import failed:', result.error);
        process.exit(1);
    }
    const out = result.presentation.slides[0].elements;
    const src = original.slides[0].elements;

    const match = (s) =>
        out.reduce((best, e) => {
            const d = (x) =>
                Math.hypot(
                    x.position.x - s.position.x,
                    x.position.y - s.position.y,
                );
            return d(e) < d(best) ? e : best;
        }, out[0]);

    console.log(`\nRound trip: ${src.length} elements out -> ${out.length} in`);

    // Expected type after a round trip. A plot rasterizes to an image on
    // export by design; every other type is preserved, including the bar
    // chart as a native, editable PowerPoint chart (thanks to the pptxgenjs
    // single-level strRef + relative-target patches).
    const expected = {
        t1: 'textbox',
        r1: 'rectangle',
        c1: 'circle',
        g1: 'triangle',
        i1: 'image',
        b1: 'barchart',
        p1: 'image',
    };
    const roundTripped = src.filter((s) => expected[s.id] !== null);
    check(
        'all round-trippable elements preserved',
        out.length === roundTripped.length,
        `got ${out.length}, expected ${roundTripped.length}`,
    );

    for (const s of roundTripped) {
        const g = match(s);
        check(
            `${s.type} (${s.id}) -> ${expected[s.id]}`,
            g.type === expected[s.id],
            `got ${g.type}`,
        );
        check(
            `${s.id} geometry preserved`,
            near(g.position.x, s.position.x) &&
                near(g.position.y, s.position.y) &&
                near(g.size.width, s.size.width) &&
                near(g.size.height, s.size.height),
            `pos ${JSON.stringify(g.position)} size ${JSON.stringify(g.size)}`,
        );
    }

    const text = out.find((e) => e.type === 'textbox');
    check('text content preserved', /Title/.test(text.content));
    check(
        'text font size ~24px (not oversized)',
        /font-size:\s*2[34]px/.test(text.content),
        text.content,
    );
    check('text bold preserved', /<strong>/.test(text.content));

    const chart = out.find((e) => e.type === 'barchart');
    check(
        'bar chart data preserved (labels + values)',
        !!chart &&
            JSON.stringify(chart.data.x) === JSON.stringify(['A', 'B', 'C']) &&
            JSON.stringify(chart.data.y) === JSON.stringify([10, 20, 15]),
        chart ? JSON.stringify(chart.data) : 'no chart',
    );

    fs.rmSync(path.dirname(exportPath), { recursive: true, force: true });

    console.log(
        failed === 0
            ? '\nALL COMPONENT ROUND-TRIP CHECKS PASSED'
            : `\n${failed} CHECK(S) FAILED`,
    );
    process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
});
