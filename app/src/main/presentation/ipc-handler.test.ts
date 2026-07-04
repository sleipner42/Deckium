import { ipcMain } from 'electron';
import { setupPresentationIPC } from './ipc-handler';

jest.mock('electron', () => ({
    ipcMain: { handle: jest.fn() },
    BrowserWindow: { fromWebContents: jest.fn() },
}));

jest.mock('../powerpoint-export/service', () => ({
    PowerPointExportService: jest.fn(),
}));

type Handler = (...args: unknown[]) => unknown;

function captureHandlers(locked: () => boolean): {
    handlers: Map<string, Handler>;
    service: Record<string, jest.Mock>;
} {
    const handlers = new Map<string, Handler>();
    (ipcMain.handle as jest.Mock).mockImplementation(
        (channel: string, fn: Handler) => handlers.set(channel, fn),
    );

    const service = {
        updateElement: jest.fn(() => ({ id: 's1' })),
        addElement: jest.fn(() => ({ id: 's1' })),
        deleteElement: jest.fn(() => ({ id: 's1' })),
        updateSlide: jest.fn(() => ({ id: 's1' })),
        deleteSlide: jest.fn(() => 's1'),
        addSlide: jest.fn(() => ({ id: 's2' })),
        reorderSlides: jest.fn(() => ({})),
        duplicateSlide: jest.fn(() => ({ id: 's2' })),
        undo: jest.fn(() => ({})),
        redo: jest.fn(() => ({})),
        beginTransaction: jest.fn(),
        endTransaction: jest.fn(),
    };

    setupPresentationIPC(service as never, locked);
    return { handlers, service };
}

describe('presentation IPC editing lock', () => {
    beforeEach(() => jest.clearAllMocks());

    const mutating: Array<[string, string]> = [
        ['presentation:update-element', 'updateElement'],
        ['presentation:add-element', 'addElement'],
        ['presentation:delete-element', 'deleteElement'],
        ['presentation:update-slide', 'updateSlide'],
        ['presentation:delete-slide', 'deleteSlide'],
        ['presentation:add-slide', 'addSlide'],
        ['presentation:reorder-slides', 'reorderSlides'],
        ['presentation:duplicate-slide', 'duplicateSlide'],
        ['presentation:undo', 'undo'],
        ['presentation:redo', 'redo'],
    ];

    it('no-ops every mutating handler while editing is locked', () => {
        const { handlers, service } = captureHandlers(() => true);
        for (const [channel, method] of mutating) {
            const result = handlers.get(channel)?.({});
            expect(service[method]).not.toHaveBeenCalled();
            expect(result).toBeNull();
        }
    });

    it('runs the handlers normally when unlocked', () => {
        const { handlers, service } = captureHandlers(() => false);
        for (const [channel, method] of mutating) {
            handlers.get(channel)?.({});
            expect(service[method]).toHaveBeenCalled();
        }
    });

    it('does not open a transaction while locked', () => {
        const { handlers, service } = captureHandlers(() => true);
        handlers.get('presentation:transaction-start')?.({
            sender: { id: 1, on: jest.fn(), once: jest.fn() },
        });
        expect(service.beginTransaction).not.toHaveBeenCalled();
    });
});
