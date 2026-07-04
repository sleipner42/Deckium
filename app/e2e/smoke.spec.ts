import { expect, test } from '@playwright/test';
import { launchApp, renderedScale } from './helpers';

test('editor mounts with a scaled slide surface', async () => {
    const { app, page } = await launchApp();
    try {
        // The slide surface exists...
        await expect(
            page.locator('[data-slide-container]').first(),
        ).toBeVisible();

        // ...and the measured scale is the real zoom, not the old hard-coded 1
        // (the whole drag/resize fix depends on measuring this from the DOM).
        const scale = await renderedScale(page);
        expect(scale).toBeGreaterThan(0);
        expect(scale).toBeLessThan(1);
    } finally {
        await app.close();
    }
});
