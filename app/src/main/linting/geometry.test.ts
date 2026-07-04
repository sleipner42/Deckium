/**
 * @jest-environment node
 */
import type { BrowserWindow } from 'electron';
import type { Slide, TextBox } from '../../common/domain/entities/types';
import { buildSnapshotScript, captureGeometrySnapshot } from './geometry';

const makeSlide = (): Slide => ({
    id: 'slide-1',
    background: '#FFFFFF',
    elements: [
        {
            id: 'text-1',
            type: 'textbox',
            position: { x: 10, y: 20 },
            size: { width: 200, height: 50 },
            content: 'hello',
        } as TextBox,
        {
            id: 'shape-1',
            type: 'rectangle',
            position: { x: 300, y: 300 },
            size: { width: 100, height: 100 },
            fillColor: '#fff',
            strokeColor: '#000',
            strokeWidth: 1,
            zIndex: 7,
        },
    ],
});

const makeWindow = (executeJavaScript: jest.Mock) =>
    ({
        isDestroyed: () => false,
        webContents: { executeJavaScript },
    }) as unknown as BrowserWindow;

describe('captureGeometrySnapshot', () => {
    it('runs exactly one renderer eval per capture', async () => {
        const executeJavaScript = jest.fn().mockResolvedValue({});
        await captureGeometrySnapshot(
            makeWindow(executeJavaScript),
            makeSlide(),
        );
        expect(executeJavaScript).toHaveBeenCalledTimes(1);
    });

    it('merges DOM results with model fallback for missing elements', async () => {
        const executeJavaScript = jest.fn().mockResolvedValue({
            'text-1': {
                elementId: 'text-1',
                source: 'canvas',
                bounds: { x: 12, y: 22, width: 200, height: 50 },
                zIndex: 3,
                textContentBounds: { x: 14, y: 24, width: 180, height: 40 },
            },
            // shape-1 intentionally absent from the DOM result.
        });

        const snapshot = await captureGeometrySnapshot(
            makeWindow(executeJavaScript),
            makeSlide(),
        );

        expect(snapshot.elements['text-1'].source).toBe('canvas');
        expect(snapshot.elements['text-1'].zIndex).toBe(3);
        expect(snapshot.elements['shape-1']).toEqual({
            elementId: 'shape-1',
            source: 'model',
            bounds: { x: 300, y: 300, width: 100, height: 100 },
            zIndex: 7,
        });
    });

    it('substitutes the model rect for unmeasurable textbox content', async () => {
        const executeJavaScript = jest.fn().mockResolvedValue({
            'text-1': {
                elementId: 'text-1',
                source: 'thumbnail',
                bounds: { x: 10, y: 20, width: 200, height: 50 },
                zIndex: 1,
                textContentBounds: null,
            },
        });

        const snapshot = await captureGeometrySnapshot(
            makeWindow(executeJavaScript),
            makeSlide(),
        );

        expect(snapshot.elements['text-1'].textContentBounds).toEqual({
            x: 10,
            y: 20,
            width: 200,
            height: 50,
        });
        expect(snapshot.elements['text-1'].textSource).toBe('model');
    });

    it('falls back to model geometry when the window is unavailable', async () => {
        const snapshot = await captureGeometrySnapshot(null, makeSlide());

        expect(Object.keys(snapshot.elements)).toHaveLength(2);
        expect(snapshot.elements['text-1'].source).toBe('model');
        expect(snapshot.elements['text-1'].textContentBounds).toEqual({
            x: 10,
            y: 20,
            width: 200,
            height: 50,
        });
        expect(snapshot.elements['shape-1'].zIndex).toBe(7);
    });

    it('falls back to model geometry when the eval throws', async () => {
        const executeJavaScript = jest
            .fn()
            .mockRejectedValue(new Error('renderer gone'));
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const snapshot = await captureGeometrySnapshot(
            makeWindow(executeJavaScript),
            makeSlide(),
        );

        expect(snapshot.elements['text-1'].source).toBe('model');
        warn.mockRestore();
    });
});

describe('buildSnapshotScript', () => {
    it('passes element ids only through JSON, never raw selectors', () => {
        const hostileId = 'a"]b\\c';
        const script = buildSnapshotScript([hostileId]);

        expect(script).toContain(JSON.stringify([hostileId]));
        expect(script).not.toContain(`[data-element-id="${hostileId}"]`);
        // The script must remain parseable JavaScript.
        expect(() => new Function(`return ${script}`)).not.toThrow();
    });
});
