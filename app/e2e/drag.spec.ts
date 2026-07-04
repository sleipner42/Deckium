import {
    type ElectronApplication,
    expect,
    type Page,
    test,
} from '@playwright/test';
import {
    addTextbox,
    elementRect,
    elementScreenBox,
    launchApp,
    renderedScale,
} from './helpers';

// Fresh app per test so only one element is on the slide (keeps snapping
// predictable — it only has the slide bounds to snap to).
let app: ElectronApplication;
let page: Page;

test.beforeEach(async () => {
    ({ app, page } = await launchApp());
});
test.afterEach(async () => {
    // Teardown of a headless Electron app can be slow under back-to-back
    // launches; don't let a slow close fail an otherwise-passing test.
    await app.close().catch(() => {});
});

test('drag moves an element by the cursor delta divided by the render scale', async () => {
    await addTextbox(page, 'e2e-drag', 100, 100, 300, 120);
    const scale = await renderedScale(page);
    const box = (await elementScreenBox(page, 'e2e-drag'))!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx, cy); // select

    const dx = 30;
    const dy = 24;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 8 });
    await page.mouse.up();

    const rect = (await elementRect(page, 'e2e-drag'))!;
    const expectedX = 100 + dx / scale;
    const expectedY = 100 + dy / scale;

    // Moved by the cursor delta converted to slide units (small tolerance for
    // any snap adjustment).
    expect(Math.abs(rect.x - expectedX)).toBeLessThan(15);
    expect(Math.abs(rect.y - expectedY)).toBeLessThan(15);
    // And decisively NOT the old raw-pixel behaviour (~100 + dx), which the
    // small scale makes ~6x smaller than the correct move.
    expect(rect.x).toBeGreaterThan(100 + dx + 30);
});

test('resize grows an element by the cursor delta divided by the render scale', async () => {
    await addTextbox(page, 'e2e-resize', 100, 100, 300, 120);
    const scale = await renderedScale(page);
    const box = (await elementScreenBox(page, 'e2e-resize'))!;

    // Select, then drag the bottom-right (SE) resize handle.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const handleX = box.x + box.width;
    const handleY = box.y + box.height;
    const dx = 24;
    const dy = 18;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX + dx, handleY + dy, { steps: 8 });
    await page.mouse.up();

    const rect = (await elementRect(page, 'e2e-resize'))!;
    expect(Math.abs(rect.w - (300 + dx / scale))).toBeLessThan(15);
    expect(Math.abs(rect.h - (120 + dy / scale))).toBeLessThan(15);
    expect(rect.w).toBeGreaterThan(300 + dx + 30); // not the raw-pixel bug
});
