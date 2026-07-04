import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    type ElectronApplication,
    _electron as electron,
    type Page,
} from '@playwright/test';

const APP_ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(APP_ROOT, 'release/app/dist/main/main.js');
const PRELOAD = path.join(APP_ROOT, 'release/app/dist/main/preload.js');

export const SLIDE_WIDTH = 1280;

/**
 * Launch the built app and return the editor window (not the offscreen
 * viewer). Each launch gets an isolated userData dir so the persisted
 * presentation never leaks between tests (otherwise added elements survive
 * into the next app and perturb snapping). E2E_PRELOAD_PATH resolves the
 * preload for the direct launch; E2E_TEST_HOOKS enables the editing-lock hook.
 */
export async function launchApp(): Promise<{
    app: ElectronApplication;
    page: Page;
}> {
    const userDataDir = mkdtempSync(path.join(tmpdir(), 'deckium-e2e-'));
    const app = await electron.launch({
        args: [
            MAIN,
            `--user-data-dir=${userDataDir}`,
            '--no-sandbox',
            '--disable-gpu',
        ],
        env: {
            ...process.env,
            NODE_ENV: 'production',
            STANDALONE_MODE: 'true',
            E2E_PRELOAD_PATH: PRELOAD,
            E2E_TEST_HOOKS: '1',
        },
    });

    await app.firstWindow();
    const page = await findEditorWindow(app);
    await page.waitForSelector('[data-slide-container]', { timeout: 20_000 });
    return { app, page };
}

async function findEditorWindow(app: ElectronApplication): Promise<Page> {
    for (let attempt = 0; attempt < 40; attempt++) {
        for (const win of app.windows()) {
            const url = win.url();
            if (!url || url.includes('layout=viewer')) continue;
            const ready = await win
                .evaluate(
                    () => !!document.querySelector('[data-slide-container]'),
                )
                .catch(() => false);
            if (ready) return win;
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('editor window did not mount');
}

// The slide renders in both the main editor AND the thumbnail navigator, so
// [data-element-id] matches more than once. Everything below scopes to the
// largest [data-slide-container] (the editor) and works in screen coords via
// evaluate, avoiding Playwright strict-locator ambiguity. The browser-side
// picker is passed as a string and reconstituted with `new Function` inside
// each evaluate (page.evaluate can't close over module-scope helpers).
const PICK_MAIN =
    "const cs=Array.from(document.querySelectorAll('[data-slide-container]'));" +
    'const main=cs.length?cs.reduce((a,b)=>a.getBoundingClientRect().width>=b.getBoundingClientRect().width?a:b):null;';

/** Measured render scale of the editor slide surface (screen px / slide unit). */
export function renderedScale(page: Page): Promise<number> {
    return page.evaluate(
        ({ slideWidth, pick }) => {
            const main = new Function(
                `${pick}return main;`,
            )() as HTMLElement | null;
            if (!main) return 1;
            return main.getBoundingClientRect().width / slideWidth;
        },
        { slideWidth: SLIDE_WIDTH, pick: PICK_MAIN },
    );
}

/** The element's on-screen box in the editor (for driving the mouse). */
export function elementScreenBox(
    page: Page,
    elementId: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return page.evaluate(
        ({ id, pick }) => {
            const main = new Function(
                `${pick}return main;`,
            )() as HTMLElement | null;
            const el = main?.querySelector(
                `[data-element-id="${CSS.escape(id)}"]`,
            ) as HTMLElement | null;
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
        },
        { id: elementId, pick: PICK_MAIN },
    );
}

/** The element's stored slide-unit rect (left/top/width/height, scale-free). */
export function elementRect(
    page: Page,
    elementId: string,
): Promise<{ x: number; y: number; w: number; h: number } | null> {
    return page.evaluate(
        ({ id, pick }) => {
            const main = new Function(
                `${pick}return main;`,
            )() as HTMLElement | null;
            const el = main?.querySelector(
                `[data-element-id="${CSS.escape(id)}"]`,
            ) as HTMLElement | null;
            if (!el) return null;
            return {
                x: Number.parseFloat(el.style.left),
                y: Number.parseFloat(el.style.top),
                w: Number.parseFloat(el.style.width),
                h: Number.parseFloat(el.style.height),
            };
        },
        { id: elementId, pick: PICK_MAIN },
    );
}

/** Inject a textbox on the first slide via the presentation IPC. */
export async function addTextbox(
    page: Page,
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
): Promise<void> {
    await page.evaluate(
        async (el) => {
            // biome-ignore lint/suspicious/noExplicitAny: preload global
            const api = (window as any).electron.presentation;
            const presentation = await api.getPresentation();
            await api.addElement(presentation.slides[0].id, {
                id: el.id,
                type: 'textbox',
                position: { x: el.x, y: el.y },
                size: { width: el.w, height: el.h },
                content: '<p>e2e</p>',
                zIndex: 1,
            });
        },
        { id, x, y, w, h },
    );
    await page.waitForSelector(`[data-element-id="${id}"]`, {
        timeout: 10_000,
    });
}

/** Toggle the E2E editing lock (needs E2E_TEST_HOOKS in the launched app). */
export async function setEditingLocked(
    page: Page,
    locked: boolean,
): Promise<void> {
    await page.evaluate((value) => {
        // biome-ignore lint/suspicious/noExplicitAny: preload global
        (window as any).electron.ipcRenderer.sendMessage(
            'e2e:set-editing-locked',
            value,
        );
    }, locked);
    // sendMessage is fire-and-forget; give the main process a tick to apply.
    await page.waitForTimeout(150);
}
