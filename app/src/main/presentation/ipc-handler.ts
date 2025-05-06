import { ipcMain } from 'electron';
import { Slide, ContentElement } from '../../common/domain/entities/types';
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
  
  ipcMain.handle('presentation:add-slide', (_, title?: string) => {
    return service.addSlide(title);
  });
  
  ipcMain.handle('presentation:update-slide', (_, slideId: string, updates: Partial<Slide>) => {
    return service.updateSlide(slideId, updates);
  });
  
  ipcMain.handle('presentation:delete-slide', (_, slideId: string) => {
    return service.deleteSlide(slideId);
  });
  
  ipcMain.handle('presentation:add-element', (_, slideId: string, element: ContentElement) => {
    return service.addElement(slideId, element);
  });
  
  ipcMain.handle('presentation:update-element', (_, elementId: string, updates: Partial<ContentElement>) => {
    return service.updateElement(elementId, updates);
  });
} 