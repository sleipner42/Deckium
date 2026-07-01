import { BrowserWindow } from 'electron';

declare global {
    // eslint-disable-next-line no-var, vars-on-top
    var mainWindow: BrowserWindow | null | undefined;
}
