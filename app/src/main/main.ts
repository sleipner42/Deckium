import path from 'node:path';
import * as dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { setupAIIPC } from './ai/ipc-handler';
import { AIService } from './ai/service';
import { AppImageIntegration } from './appimage-integration';
import { FileSystemIpcHandler } from './fs/ipc-handler';
import { LintingIpcHandler, LintingService } from './linting';
import MenuBuilder from './menu';
import { setupPDFExportIPC } from './pdf-export/ipc-handler';
import { PDFExportService } from './pdf-export/service';
import { PowerPointImportIPCHandler } from './powerpoint-import/ipc-handler';
import { setupPresentationIPC } from './presentation/ipc-handler';
import { PresentationService } from './presentation/service';
import { setupLLMSettingsIPC } from './settings/ipc-handler';
import { LLMSettingsService } from './settings/llm-settings-service';
import { textMeasurementService } from './text-measurement/service';
import { resolveHtmlPath } from './util';

dotenv.config();

let mainWindow: BrowserWindow | null = null;
let secondWindow: BrowserWindow | null = null;
let presentationService: PresentationService;
let aiService: AIService;
let llmSettingsService: LLMSettingsService;
let lintingService: LintingService;
let pdfExportService: PDFExportService;
let powerpointImportHandler: PowerPointImportIPCHandler;
let menuBuilder: MenuBuilder;

// How long to wait for the hidden window's render ack before proceeding
// anyway. The ack normally arrives in well under this; the timeout only
// guards against a hung or reloading renderer.
const SLIDE_RENDER_TIMEOUT_MS = 1500;

function waitForSlideRendered(
    slideId: string,
    timeoutMs: number,
): Promise<void> {
    return new Promise((resolve) => {
        const cleanup = () => {
            clearTimeout(timer);
            ipcMain.removeListener('presentation:slide-rendered', listener);
        };
        const listener = (
            _event: Electron.IpcMainEvent,
            renderedSlideId: string,
        ) => {
            if (renderedSlideId !== slideId) {
                return;
            }
            cleanup();
            resolve();
        };
        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, timeoutMs);
        ipcMain.on('presentation:slide-rendered', listener);
    });
}

export async function setSlideInHiddenWindow(slideId: string): Promise<void> {
    if (!secondWindow) {
        throw new Error('Secondary window is not available');
    }

    // Start listening for the render ack before sending, then send the slide
    // change directly to the hidden window only.
    const rendered = waitForSlideRendered(slideId, SLIDE_RENDER_TIMEOUT_MS);
    secondWindow.webContents.send('presentation:set-selected-slide', slideId);
    await rendered;
}

export function getMenuBuilder(): MenuBuilder | null {
    return menuBuilder;
}

export default async function getScreenshotFromSecondaryWindow(): Promise<string> {
    if (!secondWindow) {
        console.error('Secondary window is not available');
        throw new Error('Secondary window is not available');
    }

    try {
        const image = await secondWindow.webContents.capturePage();
        const pngData = image.toPNG();
        const base64Data = pngData.toString('base64');

        return `data:image/png;base64,${base64Data}`;
    } catch (error) {
        console.error(
            'Error capturing screenshot from secondary window:',
            error,
        );
        throw error;
    }
}

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

const isDebug =
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
    require('electron-debug').default();
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS'];

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload,
        )
        .catch(console.log);
};

const createWindow = async () => {
    if (isDebug) {
        await installExtensions();
    }

    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths);
    };

    mainWindow = new BrowserWindow({
        show: false,
        title: 'Deckium',
        icon: getAssetPath('icon.png'),
        fullscreen: false,
        width: 1280,
        height: 800,
        frame: process.platform === 'linux',
        titleBarStyle:
            process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition:
            process.platform === 'darwin' ? { x: 10, y: 10 } : undefined,
        backgroundColor: '#1e1e1e',
        darkTheme: true,
        webPreferences: {
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
            devTools: true,
            partition: 'persist:main',
        },
    });

    mainWindow.loadURL(resolveHtmlPath('index.html'));

    // Set dark theme for Linux window decorations
    if (process.platform === 'linux') {
        mainWindow.setMenuBarVisibility(true);
    }

    mainWindow.on('ready-to-show', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
        }

        textMeasurementService.setMainWindow(mainWindow);
        lintingService?.setMainWindow(mainWindow);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    menuBuilder = new MenuBuilder(mainWindow, presentationService);
    menuBuilder.buildMenu();

    mainWindow.webContents.setWindowOpenHandler((edata) => {
        shell.openExternal(edata.url);
        return { action: 'deny' };
    });
};

const createSecondWindow = async () => {
    if (isDebug) {
        await installExtensions();
    }
    secondWindow = new BrowserWindow({
        width: 1024,
        height: 728,
        show: false,
        title: 'Deckium Viewer',
        frame: false,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            offscreen: true,
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
            partition: 'persist:main',
        },
    });

    secondWindow.loadURL(`${resolveHtmlPath('index.html')}#/?layout=viewer`);

    secondWindow.on('closed', () => {
        secondWindow = null;
    });

    // Set secondary window for PDF export service if it exists
    if (pdfExportService) {
        pdfExportService.setSecondWindow(secondWindow);
    }
};

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// Request single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady()
        .then(async () => {
            // Handle AppImage desktop integration
            await AppImageIntegration.integrateIfNeeded();

            createWindow();
            createSecondWindow();
            app.on('activate', () => {
                if (mainWindow === null) createWindow();
                if (secondWindow === null) createSecondWindow();
            });

            presentationService = new PresentationService();
            pdfExportService = new PDFExportService(presentationService);
            powerpointImportHandler = new PowerPointImportIPCHandler();
            powerpointImportHandler.setPresentationService(presentationService);

            lintingService = new LintingService();

            // Update menu with presentation service
            if (menuBuilder) {
                menuBuilder.setPresentationService(presentationService);
            }

            llmSettingsService = new LLMSettingsService();
            setupLLMSettingsIPC(llmSettingsService);

            aiService = new AIService(
                llmSettingsService,
                presentationService,
                lintingService,
            );
            aiService.setPdfExportService(pdfExportService);

            setupAIIPC(aiService);
            setupPresentationIPC(presentationService);
            new LintingIpcHandler(lintingService);
            new FileSystemIpcHandler();
            setupPDFExportIPC(pdfExportService);

            // Set secondary window for PDF export service if it exists
            if (secondWindow) {
                pdfExportService.setSecondWindow(secondWindow);
            }
        })
        .catch(console.log);
}
