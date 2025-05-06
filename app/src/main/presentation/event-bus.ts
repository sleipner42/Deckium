import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export class PresentationEventBus extends EventEmitter {
  static events = {
    INITIALIZED: 'presentation:initialized',
    META_UPDATED: 'presentation:meta-updated',
    SLIDE_ADDED: 'presentation:slide-added',
    SLIDE_UPDATED: 'presentation:slide-updated',
    SLIDE_DELETED: 'presentation:slide-deleted',
    SET_SELECTED_SLIDE: 'presentation:set-selected-slide'
  };

  broadcastToWindows(eventName: string, data: any): void {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(eventName, data);
    });
    this.emit(eventName, data);
  }
} 