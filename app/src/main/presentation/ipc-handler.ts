import { BrowserWindow, ipcMain } from 'electron';
import { ContentElement, Slide } from '../../common/domain/entities/types';
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
    (_, elementId: string, updates: Partial<ContentElement>) => {
      return service.updateElement(elementId, updates);
    },
  );

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

  ipcMain.handle('presentation:set-selected-slide', (_, slideId: string) => {
    return service.setSelectedSlideInViewer(slideId);
  });

  ipcMain.handle('presentation:get-selected-slide', () => {
    return service.getSelectedSlideId();
  });
}
