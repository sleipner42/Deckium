import { BrowserWindow, ipcMain } from 'electron';
import { ContentElement, Slide } from '../../common/domain/entities/types';
import { PowerPointExportService } from '../powerpoint-export/service';
import { PresentationService } from './service';

export function setupPresentationIPC(service: PresentationService) {
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
        return service.addSlide();
    });

    ipcMain.handle(
        'presentation:update-slide',
        (_, slideId: string, updates: Partial<Slide>) => {
            return service.updateSlide(slideId, updates);
        },
    );

    ipcMain.handle('presentation:delete-slide', (_, slideId: string) => {
        return service.deleteSlide(slideId);
    });

    ipcMain.handle('presentation:duplicate-slide', (_, slideId: string) => {
        return service.duplicateSlide(slideId);
    });

    ipcMain.handle(
        'presentation:reorder-slides',
        (_, fromIndex: number, toIndex: number) => {
            return service.reorderSlides(fromIndex, toIndex);
        },
    );

    ipcMain.handle(
        'presentation:add-element',
        (_, slideId: string, element: ContentElement) => {
            return service.addElement(slideId, element);
        },
    );

    ipcMain.handle(
        'presentation:update-element',
        (
            _,
            elementId: string,
            updates: Partial<ContentElement>,
            skipHistory?: boolean,
        ) => {
            return service.updateElement(elementId, updates, skipHistory);
        },
    );

    ipcMain.handle('presentation:delete-element', (_, elementId: string) => {
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
        return service.undo();
    });

    ipcMain.handle('presentation:redo', () => {
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
                error: error.message,
            });

            throw error;
        }
    });
}
