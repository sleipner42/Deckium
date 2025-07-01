import { EventEmitter } from 'node:events';
import { BrowserWindow } from 'electron';

export class LintingEventBus extends EventEmitter {
    static events = {
        ERRORS_UPDATED: 'linting:errors-updated',
        SLIDE_LINTED: 'linting:slide-linted',
        ERRORS_CLEARED: 'linting:errors-cleared',
    };

    broadcastToWindows(eventName: string, data: any): void {
        BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(eventName, data);
        });
        this.emit(eventName, data);
    }
}
