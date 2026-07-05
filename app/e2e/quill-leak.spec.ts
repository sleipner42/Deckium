import { type Page, expect, test } from '@playwright/test';
import { launchApp } from './helpers';

// Regression guard for the TextElement Quill teardown (see `destroyQuill`).
//
// We measure retention with WeakRefs held *inside the page*, not via CDP
// `Runtime.queryObjects`: that call returns an array RemoteObject which itself
// strongly retains every node it enumerates, so it reports the inspector's own
// handles as a "leak". A WeakRef never retains its target, so after a forced
// full GC a still-live deref means real app-side retention of the editor's
// detached `.ql-container` — exactly what a missing teardown causes.
async function forceGC(page: Page): Promise<void> {
    const cdp = await page.context().newCDPSession(page);
    try {
        await cdp.send('HeapProfiler.enable');
        // Two passes: the first clears strong refs, the second reclaims objects
        // that only became unreachable once the first pass ran finalizers.
        await cdp.send('HeapProfiler.collectGarbage');
        await cdp.send('HeapProfiler.collectGarbage');
    } finally {
        await cdp.detach();
    }
}

test('text elements do not leak Quill instances across mount/unmount', async () => {
    const { app, page } = await launchApp();
    try {
        const slideId = await page.evaluate(async () => {
            // biome-ignore lint/suspicious/noExplicitAny: preload global
            const w = window as any;
            const p = await w.electron.presentation.getPresentation();
            // Stash a WeakRef registry the page keeps across evaluates.
            w.__leakRefs = [];
            return p.slides[0].id as string;
        });

        // Mount and unmount a text element many times. All DOM interaction stays
        // inside the page (in-page polling, not Playwright element handles) so
        // the only reference that ever escapes is a non-retaining WeakRef.
        const ITERATIONS = 12;
        for (let i = 0; i < ITERATIONS; i++) {
            await page.evaluate(
                async (args) => {
                    // biome-ignore lint/suspicious/noExplicitAny: preload global
                    const w = window as any;
                    const api = w.electron.presentation;
                    const sel = `[data-element-id="${args.id}"]`;
                    const waitFor = (present: boolean) =>
                        new Promise<void>((resolve, reject) => {
                            const t0 = Date.now();
                            const tick = () => {
                                if (!!document.querySelector(sel) === present) {
                                    resolve();
                                } else if (Date.now() - t0 > 10_000) {
                                    reject(new Error(`timeout waiting ${sel}`));
                                } else {
                                    requestAnimationFrame(tick);
                                }
                            };
                            tick();
                        });

                    await api.addElement(args.slideId, {
                        id: args.id,
                        type: 'textbox',
                        position: { x: 100, y: 100 },
                        size: { width: 200, height: 80 },
                        content: '<p>leak</p>',
                        zIndex: 1,
                    });
                    await waitFor(true);

                    // The `.ql-container` and the [data-element-id] node are the
                    // same element; capture a WeakRef, keep no strong ref.
                    const node = document.querySelector(sel);
                    if (node) w.__leakRefs.push(new WeakRef(node));

                    await api.deleteElement(args.id);
                    await waitFor(false);
                },
                { slideId, id: `leak-${i}` },
            );
        }

        await forceGC(page);

        const live = await page.evaluate(() => {
            // biome-ignore lint/suspicious/noExplicitAny: page global
            const refs = (window as any).__leakRefs as Array<WeakRef<Element>>;
            return refs.filter((r) => r.deref() !== undefined).length;
        });

        // With teardown working, unmounted editors are reclaimed and no
        // container survives the GC. A leak would leave ~ITERATIONS behind.
        expect(live).toBeLessThanOrEqual(1);
    } finally {
        await app.close();
    }
});
