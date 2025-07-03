import { EventEmitter } from 'node:events';
import { BrowserWindow } from 'electron';

export class PresentationEventBus extends EventEmitter {
    static events = {
        INITIALIZED: 'presentation:initialized',
        META_UPDATED: 'presentation:meta-updated',
        SLIDE_ADDED: 'presentation:slide-added',
        SLIDE_UPDATED: 'presentation:slide-updated',
        SLIDE_DELETED: 'presentation:slide-deleted',
        SLIDES_REORDERED: 'presentation:slides-reordered',
        SET_SELECTED_SLIDE: 'presentation:set-selected-slide',
        SAVED: 'presentation:saved',
        LOADED: 'presentation:loaded',
        FULLSCREEN_OPENED: 'presentation:fullscreen-opened',
        FULLSCREEN_CLOSED: 'presentation:fullscreen-closed',
        UNDO_EXECUTED: 'presentation:undo-executed',
        REDO_EXECUTED: 'presentation:redo-executed',
        HISTORY_CHANGED: 'presentation:history-changed',
    };

    broadcastToWindows(eventName: string, data: any): void {
        BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(eventName, data);
        });
        this.emit(eventName, data);
    }

    // Override EventEmitter methods to add debugging
    on(eventName: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(eventName, listener);
    }

    off(eventName: string | symbol, listener: (...args: any[]) => void): this {
        return super.off(eventName, listener);
    }
}
