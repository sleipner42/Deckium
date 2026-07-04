import { BrowserWindow, ipcMain, WebContents } from 'electron';
import { ContentElement, Slide } from '../../common/domain/entities/types';
import { PowerPointExportService } from '../powerpoint-export/service';
import { PresentationService } from './service';

export function setupPresentationIPC(
    service: PresentationService,
    // True while an AI turn holds its own transaction. Manual edits and
    // undo/redo are no-op'd during that window: running them would revert or
    // coalesce state under the agent's open transaction and corrupt history.
    // The renderer disables the affordances via the AI processing events; this
    // is the authoritative backstop.
    isEditingLocked: () => boolean = () => false,
) {
    // History transactions are scoped to the sending webContents so a
    // renderer that reloads, navigates, or crashes mid-gesture cannot leave
    // a transaction open in the main process forever.
    const transactionOwner = (sender: WebContents) =>
        `webcontents:${sender.id}`;
    const trackedSenders = new Set<number>();
    const trackTransactionSender = (sender: WebContents) => {
        if (trackedSenders.has(sender.id)) return;
        trackedSenders.add(sender.id);
        const owner = transactionOwner(sender);
        const forceClose = () => service.endAllTransactionsFor(owner);
        sender.on('did-navigate', forceClose);
        sender.on('render-process-gone', forceClose);
        sender.once('destroyed', () => {
            forceClose();
            trackedSenders.delete(sender.id);
        });
    };
    ipcMain.handle('presentation:initialize', (_, title: string) => {
        return service.initializePresentation(title);
    });

    ipcMain.handle('presentation:get', () => {
        return service.getPresentation();
    });

    ipcMain.handle('presentation:update-meta', (_, title: string) => {
        return service.updatePresentationMeta(title);
    });

    ipcMain.handle('presentation:add-slide', () => {
        if (isEditingLocked()) return null;
        return service.addSlide();
    });

    ipcMain.handle(
        'presentation:update-slide',
        (_, slideId: string, updates: Partial<Slide>) => {
            if (isEditingLocked()) return null;
            return service.updateSlide(slideId, updates);
        },
    );

    ipcMain.handle('presentation:delete-slide', (_, slideId: string) => {
        if (isEditingLocked()) return null;
        return service.deleteSlide(slideId);
    });

    ipcMain.handle('presentation:duplicate-slide', (_, slideId: string) => {
        if (isEditingLocked()) return null;
        return service.duplicateSlide(slideId);
    });

    ipcMain.handle(
        'presentation:reorder-slides',
        (_, fromIndex: number, toIndex: number) => {
            if (isEditingLocked()) return null;
            return service.reorderSlides(fromIndex, toIndex);
        },
    );

    ipcMain.handle(
        'presentation:add-element',
        (_, slideId: string, element: ContentElement) => {
            if (isEditingLocked()) return null;
            return service.addElement(slideId, element);
        },
    );

    ipcMain.handle(
        'presentation:update-element',
        (_, elementId: string, updates: Partial<ContentElement>) => {
            if (isEditingLocked()) return null;
            return service.updateElement(elementId, updates);
        },
    );

    ipcMain.handle('presentation:transaction-start', (event) => {
        // Don't open a user transaction during an AI turn (its edits would be
        // no-op'd anyway); transaction-end is always allowed so nothing wedges.
        if (isEditingLocked()) return;
        trackTransactionSender(event.sender);
        service.beginTransaction(transactionOwner(event.sender));
    });

    ipcMain.handle('presentation:transaction-end', (event) => {
        service.endTransaction(transactionOwner(event.sender));
    });

    ipcMain.handle('presentation:delete-element', (_, elementId: string) => {
        if (isEditingLocked()) return null;
        return service.deleteElement(elementId);
    });

    ipcMain.handle('presentation:save', async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
            throw new Error('Could not determine source window');
        }
        return service.savePresentation(window);
    });

    ipcMain.handle('presentation:save-as', async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
            throw new Error('Could not determine source window');
        }
        return service.savePresentation(window, true);
    });

    ipcMain.handle('presentation:load', async (event, filePath?: string) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
            throw new Error('Could not determine source window');
        }
        return service.loadPresentation(window, filePath);
    });

    ipcMain.handle('presentation:get-file-path', () => {
        return service.getCurrentFilePath();
    });

    ipcMain.handle('presentation:open-fullscreen', () => {
        return service.openFullscreenPresentation();
    });

    ipcMain.handle('presentation:close-fullscreen', () => {
        return service.closeFullscreenPresentation();
    });

    ipcMain.handle('presentation:is-fullscreen-open', () => {
        return service.isFullscreenOpen();
    });

    ipcMain.handle(
        'presentation:set-selected-slide',
        (_, slideId: string | null) => {
            return service.setSelectedSlideInViewer(slideId);
        },
    );

    ipcMain.handle('presentation:get-selected-slide', () => {
        return service.getSelectedSlideId();
    });

    ipcMain.handle('presentation:undo', () => {
        if (isEditingLocked()) return null;
        return service.undo();
    });

    ipcMain.handle('presentation:redo', () => {
        if (isEditingLocked()) return null;
        return service.redo();
    });

    ipcMain.handle('presentation:can-undo', () => {
        return service.canUndo();
    });

    ipcMain.handle('presentation:can-redo', () => {
        return service.canRedo();
    });

    ipcMain.handle('presentation:export-powerpoint', async (event) => {
        try {
            const presentation = service.getPresentation();
            if (!presentation) {
                throw new Error('No presentation to export');
            }

            const window = BrowserWindow.fromWebContents(event.sender);
            if (!window) {
                throw new Error('Could not determine source window');
            }

            // Send progress update
            event.sender.send('powerpoint-export:progress', {
                message: 'Starting PowerPoint export...',
            });

            const exportService = new PowerPointExportService();
            await exportService.exportPresentation(presentation, window);

            // Send completion event
            event.sender.send('powerpoint-export:complete', {
                message: 'PowerPoint export completed successfully!',
            });

            return { success: true };
        } catch (error) {
            console.error('PowerPoint export error:', error);

            // Send error event
            event.sender.send('powerpoint-export:error', {
                message: 'PowerPoint export failed',
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
        }
    });
}
