import path from 'path';
import { app, BrowserWindow, shell, protocol, session, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as dotenv from 'dotenv';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { setupPresentationIPC } from './presentation/ipc-handler';
import { AzureOpenAIServiceFactory } from './ai/external/azure-openai-service';
import { PresentationService } from './presentation/service';
import { AIService } from './ai/service';
import { IAIServiceFactory } from '../common/domain/interfaces/ai-service.interface';
import { setupAIIPC } from './ai/ipc-handler';
import { setupAuthIPC } from './auth/ipc-handler';
import { BackendAIServiceFactory } from './ai/external/backend-ai-service';
import AuthService from './auth/service';

dotenv.config();

class AppUpdater {
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://deckiumpublic.blob.core.windows.net/releases/',
    });

    autoUpdater.checkForUpdatesAndNotify();

    this.setupUpdateHandlers();
    this.startPeriodicCheck();
  }

  private setupUpdateHandlers() {
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. It will be downloaded in the background.`,
        buttons: ['OK']
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      log.info(logMessage);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Ready',
        message: `Update has been downloaded. The application will restart to apply the update.`,
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  private startPeriodicCheck() {
    this.updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
  }

  public checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
  }

  public destroy() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

let mainWindow: BrowserWindow | null = null;
let secondWindow: BrowserWindow | null = null;

export async function getScreenshotFromSecondaryWindow(): Promise<string> {
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
    console.error('Error capturing screenshot from secondary window:', error);
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
    icon: getAssetPath('icon.png'),
    fullscreen: false,
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      devTools: true,
      partition: 'persist:main',
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (presentationService) {
    const menuBuilder = new MenuBuilder(mainWindow, presentationService);
    menuBuilder.buildMenu();
  }

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    new AppUpdater();
  }
};

const createSecondWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }
  secondWindow = new BrowserWindow({
    width: 1024,
    height: 728,
    show: false,
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
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let presentationService: PresentationService | null = null;
let aiService: AIService | null = null;
let aiServiceFactory: IAIServiceFactory | null = null;
let authService: AuthService | null = null;

app
  .whenReady()
  .then(async () => {
    createWindow();
    createSecondWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
      if (secondWindow === null) createSecondWindow();
    });

    presentationService = new PresentationService();
    authService = new AuthService();

    aiServiceFactory = new BackendAIServiceFactory(authService);

    const aiModel = aiServiceFactory.createService();

    aiService = new AIService(aiModel, presentationService);

    setupAuthIPC(authService);
    setupAIIPC(aiService);
    setupPresentationIPC(presentationService);
  })
  .catch(console.log);
