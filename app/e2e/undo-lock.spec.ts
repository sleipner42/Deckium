import { expect, test } from '@playwright/test';
import {
    addTextbox,
    elementRect,
    launchApp,
    setEditingLocked,
} from './helpers';

// Verifies the B1 fix: while an AI turn holds the editing lock, manual edits
// are no-op'd in the main process. Here the lock is toggled via the E2E test
// hook (E2E_TEST_HOOKS) instead of a live agent turn.
test('manual edits are blocked while editing is locked, and resume after', async () => {
    const { app, page } = await launchApp();
    try {
        await addTextbox(page, 'e2e-lock', 100, 100, 200, 80);

        // Lock, then try to move the element directly through the IPC.
        await setEditingLocked(page, true);
        await page.evaluate(() =>
            // biome-ignore lint/suspicious/noExplicitAny: preload global
            (window as any).electron.presentation.updateElement('e2e-lock', {
                position: { x: 600, y: 500 },
            }),
        );
        await page.waitForTimeout(200);

        const whileLocked = (await elementRect(page, 'e2e-lock'))!;
        expect(whileLocked.x).toBe(100); // unchanged
        expect(whileLocked.y).toBe(100);

        // Unlock and confirm edits apply again.
        await setEditingLocked(page, false);
        await page.evaluate(() =>
            // biome-ignore lint/suspicious/noExplicitAny: preload global
            (window as any).electron.presentation.updateElement('e2e-lock', {
                position: { x: 300, y: 220 },
            }),
        );
        await page.waitForFunction(
            () => {
                const el = document.querySelector(
                    '[data-element-id="e2e-lock"]',
                ) as HTMLElement | null;
                return !!el && Number.parseFloat(el.style.left) === 300;
            },
            { timeout: 5_000 },
        );

        const afterUnlock = (await elementRect(page, 'e2e-lock'))!;
        expect(afterUnlock.x).toBe(300);
        expect(afterUnlock.y).toBe(220);
    } finally {
        await app.close();
    }
});
