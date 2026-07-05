/**
 * @jest-environment node
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dialog } from 'electron';
import {
    ContentElement,
    TextBox,
    UUID,
} from '../../common/domain/entities/types';
import { PresentationEventBus } from './event-bus';
import { PresentationService } from './service';

jest.mock('electron', () => ({
    BrowserWindow: { getAllWindows: jest.fn(() => []) },
    dialog: { showSaveDialog: jest.fn(), showOpenDialog: jest.fn() },
    screen: {
        getPrimaryDisplay: jest.fn(() => ({
            workAreaSize: { width: 1920, height: 1080 },
        })),
    },
}));

jest.mock('../utils/logger', () => ({
    logger: { logSystem: jest.fn() },
}));

const showSaveDialog = dialog.showSaveDialog as jest.Mock;
const showOpenDialog = dialog.showOpenDialog as jest.Mock;

// getAllWindows() is mocked to [], so the dialogs' `window` argument is unused.
const win = {} as never;

function makeTextBox(id: string = crypto.randomUUID()): TextBox {
    return {
        id: id as UUID,
        type: 'textbox',
        position: { x: 10, y: 10 },
        size: { width: 100, height: 50 },
        content: 'hello',
    };
}

describe('PresentationService persistence', () => {
    let tmpDir: string;
    let service: PresentationService;

    beforeAll(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kpres-svc-'));
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        showSaveDialog.mockReset();
        showOpenDialog.mockReset();
        service = new PresentationService();
        service.initializePresentation('My Deck');
    });

    it('round-trips a saved presentation back through load', async () => {
        const slide = service.getPresentation().slides[0];
        service.addElement(slide.id, makeTextBox('el-1') as ContentElement);

        const file = path.join(tmpDir, 'roundtrip.kpres');
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: file });
        await service.savePresentation(win);

        // A fresh service loading the same file reproduces the deck.
        const other = new PresentationService();
        const loaded = await other.loadPresentation(win, file);

        expect(loaded).not.toBeNull();
        expect(loaded?.title).toBe('My Deck');
        expect(loaded?.slides).toHaveLength(1);
        expect(loaded?.slides[0].elements.map((e) => e.id)).toContain('el-1');
        // Dates survive the ISO round-trip as real Date objects.
        expect(loaded?.createdAt).toBeInstanceOf(Date);
        expect(loaded?.updatedAt).toBeInstanceOf(Date);
    });

    it('serializes dates as ISO strings on disk', async () => {
        const file = path.join(tmpDir, 'iso.kpres');
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: file });
        await service.savePresentation(win);

        const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
        expect(typeof raw.createdAt).toBe('string');
        expect(typeof raw.updatedAt).toBe('string');
        expect(new Date(raw.createdAt).toISOString()).toBe(raw.createdAt);
    });

    it('reuses the current file path on a second save (no second dialog)', async () => {
        const file = path.join(tmpDir, 'reuse.kpres');
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: file });

        const first = await service.savePresentation(win);
        const second = await service.savePresentation(win);

        expect(first).toBe(file);
        expect(second).toBe(file);
        expect(showSaveDialog).toHaveBeenCalledTimes(1);
        expect(service.getCurrentFilePath()).toBe(file);
    });

    it('re-prompts for a path when forceNewPath is set', async () => {
        const first = path.join(tmpDir, 'first.kpres');
        const second = path.join(tmpDir, 'second.kpres');
        showSaveDialog
            .mockResolvedValueOnce({ canceled: false, filePath: first })
            .mockResolvedValueOnce({ canceled: false, filePath: second });

        await service.savePresentation(win);
        const result = await service.savePresentation(win, true);

        expect(result).toBe(second);
        expect(showSaveDialog).toHaveBeenCalledTimes(2);
        expect(service.getCurrentFilePath()).toBe(second);
    });

    it('returns null and writes nothing when the save dialog is cancelled', async () => {
        showSaveDialog.mockResolvedValue({
            canceled: true,
            filePath: undefined,
        });

        const result = await service.savePresentation(win);

        expect(result).toBeNull();
        expect(service.getCurrentFilePath()).toBeNull();
        expect(fs.readdirSync(tmpDir)).not.toContain('undefined');
    });

    it('loads from an explicit path without showing a dialog', async () => {
        const file = path.join(tmpDir, 'explicit.kpres');
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: file });
        await service.savePresentation(win);

        const other = new PresentationService();
        const loaded = await other.loadPresentation(win, file);

        expect(loaded?.title).toBe('My Deck');
        expect(showOpenDialog).not.toHaveBeenCalled();
        expect(other.getCurrentFilePath()).toBe(file);
    });

    it('propagates an error when the file is malformed', async () => {
        const file = path.join(tmpDir, 'broken.kpres');
        fs.writeFileSync(file, '{ not valid json');

        await expect(service.loadPresentation(win, file)).rejects.toThrow();
    });

    it('clears the current file path on initializePresentation', async () => {
        const file = path.join(tmpDir, 'cleared.kpres');
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: file });
        await service.savePresentation(win);
        expect(service.getCurrentFilePath()).toBe(file);

        service.initializePresentation('Fresh');
        expect(service.getCurrentFilePath()).toBeNull();

        // The next save must prompt again since there is no remembered path.
        showSaveDialog.mockClear();
        showSaveDialog.mockResolvedValue({ canceled: true });
        await service.savePresentation(win);
        expect(showSaveDialog).toHaveBeenCalledTimes(1);
    });
});

describe('PresentationService broadcasting and transactions', () => {
    let service: PresentationService;

    beforeEach(() => {
        (dialog.showSaveDialog as jest.Mock).mockReset();
        service = new PresentationService();
        service.initializePresentation('Deck');
    });

    it('broadcasts SLIDE_UPDATED when an element is added', () => {
        const events: string[] = [];
        service.onEvent(PresentationEventBus.events.SLIDE_UPDATED, () =>
            events.push('slide-updated'),
        );

        const slide = service.getPresentation().slides[0];
        service.addElement(slide.id, makeTextBox() as ContentElement);

        expect(events).toEqual(['slide-updated']);
    });

    it('broadcasts SAVED after a successful save', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kpres-bc-'));
        const file = path.join(tmp, 'saved.kpres');
        (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
            canceled: false,
            filePath: file,
        });

        const saved: Array<{ path: string; title: string }> = [];
        service.onEvent(PresentationEventBus.events.SAVED, (d) =>
            saved.push(d),
        );

        await service.savePresentation(win);

        expect(saved).toHaveLength(1);
        expect(saved[0].path).toBe(file);
        expect(saved[0].title).toBe('Deck');
        fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('collapses a service-level transaction into a single undo step', () => {
        const slide = service.getPresentation().slides[0];

        service.beginTransaction('main');
        service.addElement(slide.id, makeTextBox('a') as ContentElement);
        service.addElement(slide.id, makeTextBox('b') as ContentElement);
        service.endTransaction('main');

        expect(service.getPresentation().slides[0].elements).toHaveLength(2);
        expect(service.canUndo()).toBe(true);

        // One undo reverts both element additions, not just the last.
        service.undo();
        expect(service.getPresentation().slides[0].elements).toHaveLength(0);
        expect(service.canUndo()).toBe(false);
    });
});
