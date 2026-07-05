import { expect, test } from '@playwright/test';
import { launchApp } from './helpers';

// Tables render only in the real renderer (jsdom mocks Quill), so this is the
// coverage for the TableElement component: create a table via the preload API
// and assert the DOM reflects its structure and cell content.
test('a table element renders its rows, columns, and cell content', async () => {
    const { app, page } = await launchApp();
    try {
        const slideId = await page.evaluate(async () => {
            // biome-ignore lint/suspicious/noExplicitAny: preload global
            const p = await (window as any).electron.presentation.getPresentation();
            return p.slides[0].id as string;
        });

        await page.evaluate(async (sid) => {
            // biome-ignore lint/suspicious/noExplicitAny: preload global
            await (window as any).electron.presentation.addElement(sid, {
                id: 'tbl-1',
                type: 'table',
                position: { x: 100, y: 100 },
                size: { width: 400, height: 160 },
                rows: [
                    [
                        { content: '<strong>Region</strong>' },
                        { content: 'Q1' },
                    ],
                    [{ content: 'North' }, { content: '120' }],
                    [{ content: 'South' }, { content: '98' }],
                ],
                columnWidths: [2, 1],
                rowHeights: [1, 1, 1],
                headerRow: true,
                borderColor: '#000000',
                borderWidth: 1,
                zIndex: 1,
            });
        }, slideId);

        const host = page.locator('[data-element-id="tbl-1"]').first();
        await expect(host).toBeVisible();

        // 3 rows x 2 columns rendered as a real <table>.
        const table = host.locator('table');
        await expect(table.locator('tr')).toHaveCount(3);
        await expect(table.locator('tr').first().locator('td')).toHaveCount(2);

        // Header cell keeps its bold markup; a body cell shows its value.
        await expect(table.locator('strong', { hasText: 'Region' })).toBeVisible();
        await expect(table.getByText('120')).toBeVisible();
    } finally {
        await app.close();
    }
});
