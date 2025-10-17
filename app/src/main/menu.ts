import {
    app,
    BrowserWindow,
    Menu,
    MenuItemConstructorOptions,
    shell,
} from 'electron';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
    selector?: string;
    submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
    mainWindow: BrowserWindow;
    presentationService: any;

    constructor(mainWindow: BrowserWindow, presentationService?: any) {
        this.mainWindow = mainWindow;
        this.presentationService = presentationService;
    }

    buildMenu(): Menu {
        if (
            process.env.NODE_ENV === 'development' ||
            process.env.DEBUG_PROD === 'true'
        ) {
            this.setupDevelopmentEnvironment();
        }

        const template =
            process.platform === 'darwin'
                ? this.buildDarwinTemplate()
                : this.buildDefaultTemplate();

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        return menu;
    }

    updateMenu(): void {
        this.buildMenu();
    }

    setPresentationService(presentationService: any): void {
        this.presentationService = presentationService;
        this.updateMenu(); // Rebuild menu with the new service
    }

    setupDevelopmentEnvironment(): void {
        this.mainWindow.webContents.on('context-menu', (_, props) => {
            const { x, y } = props;

            Menu.buildFromTemplate([
                {
                    label: 'Inspect element',
                    click: () => {
                        this.mainWindow.webContents.inspectElement(x, y);
                    },
                },
            ]).popup({ window: this.mainWindow });
        });
    }

    buildDarwinTemplate(): MenuItemConstructorOptions[] {
        const subMenuAbout: DarwinMenuItemConstructorOptions = {
            label: 'Electron',
            submenu: [
                {
                    label: 'About ElectronReact',
                    selector: 'orderFrontStandardAboutPanel:',
                },
                { type: 'separator' },
                { label: 'Services', submenu: [] },
                { type: 'separator' },
                {
                    label: 'Hide ElectronReact',
                    accelerator: 'Command+H',
                    selector: 'hide:',
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Shift+H',
                    selector: 'hideOtherApplications:',
                },
                { label: 'Show All', selector: 'unhideAllApplications:' },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => {
                        app.quit();
                    },
                },
            ],
        };

        const subMenuFile: DarwinMenuItemConstructorOptions = {
            label: 'File',
            submenu: [
                {
                    label: 'Open...',
                    accelerator: 'Command+O',
                    click: () => {
                        if (this.presentationService) {
                            this.presentationService.loadPresentation(
                                this.mainWindow,
                            );
                        }
                    },
                },
                {
                    label: 'Import PowerPoint...',
                    click: async () => {
                        try {
                            await this.mainWindow.webContents.executeJavaScript(`
                                window.electron.powerpointImport.selectAndImport();
                            `);
                        } catch (error) {
                            console.error('PowerPoint import error:', error);
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'Command+S',
                    click: () => {
                        if (this.presentationService) {
                            this.presentationService.savePresentation(
                                this.mainWindow,
                            );
                        }
                    },
                },
                {
                    label: 'Save As...',
                    accelerator: 'Command+Shift+S',
                    click: () => {
                        if (this.presentationService) {
                            this.presentationService.savePresentation(
                                this.mainWindow,
                                true,
                            );
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: 'Export to PDF...',
                    accelerator: 'Command+E',
                    click: async () => {
                        try {
                            await this.mainWindow.webContents.executeJavaScript(`
                                window.electron.pdfExport.exportToPDF();
                            `);
                        } catch (error) {
                            console.error('PDF export error:', error);
                        }
                    },
                },
                {
                    label: 'Export to PowerPoint...',
                    accelerator: 'Command+Shift+E',
                    click: async () => {
                        try {
                            await this.mainWindow.webContents.executeJavaScript(`
                                window.electron.presentation.exportToPowerPoint();
                            `);
                        } catch (error) {
                            console.error('PowerPoint export error:', error);
                        }
                    },
                },
            ],
        };

        const subMenuEdit: DarwinMenuItemConstructorOptions = {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'Command+Z',
                    click: () => {
                        this.mainWindow.webContents.send('menu:undo');
                    },
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+Command+Z',
                    click: () => {
                        this.mainWindow.webContents.send('menu:redo');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Copy',
                    accelerator: 'Command+C',
                    click: () => {
                        console.log('Menu Copy clicked');
                        this.mainWindow.webContents.send('menu:copy');
                    },
                },
                {
                    label: 'Paste',
                    accelerator: 'Command+V',
                    selector: 'paste:',
                },
                {
                    label: 'Select All',
                    accelerator: 'Command+A',
                    click: () => {
                        console.log('Menu Select All clicked');
                        this.mainWindow.webContents.send('menu:select-all');
                    },
                },
                { type: 'separator' },
                {
                    label: 'LLM Settings...',
                    accelerator: 'Command+,',
                    click: () => {
                        this.mainWindow.webContents.send(
                            'menu:open-llm-settings',
                        );
                    },
                },
            ],
        };
        const subMenuWindow: DarwinMenuItemConstructorOptions = {
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'Command+M',
                    selector: 'performMiniaturize:',
                },
                {
                    label: 'Close',
                    accelerator: 'Command+W',
                    selector: 'performClose:',
                },
                { type: 'separator' },
                { label: 'Bring All to Front', selector: 'arrangeInFront:' },
            ],
        };

        return [subMenuAbout, subMenuFile, subMenuEdit, subMenuWindow];
    }

    buildDefaultTemplate() {
        const templateDefault = [
            {
                label: '&File',
                submenu: [
                    {
                        label: '&Open...',
                        accelerator: 'Ctrl+O',
                        click: () => {
                            if (this.presentationService) {
                                this.presentationService.loadPresentation(
                                    this.mainWindow,
                                );
                            }
                        },
                    },
                    {
                        label: '&Import PowerPoint...',
                        click: async () => {
                            try {
                                await this.mainWindow.webContents.executeJavaScript(`
                                    window.electron.powerpointImport.selectAndImport();
                                `);
                            } catch (error) {
                                console.error(
                                    'PowerPoint import error:',
                                    error,
                                );
                            }
                        },
                    },
                    { type: 'separator' as const },
                    {
                        label: '&Save',
                        accelerator: 'Ctrl+S',
                        click: () => {
                            if (this.presentationService) {
                                this.presentationService.savePresentation(
                                    this.mainWindow,
                                );
                            }
                        },
                    },
                    {
                        label: 'Save &As...',
                        accelerator: 'Ctrl+Shift+S',
                        click: () => {
                            if (this.presentationService) {
                                this.presentationService.savePresentation(
                                    this.mainWindow,
                                    true,
                                );
                            }
                        },
                    },
                    { type: 'separator' as const },
                    {
                        label: '&Export to PDF...',
                        accelerator: 'Ctrl+E',
                        click: async () => {
                            try {
                                await this.mainWindow.webContents.executeJavaScript(`
                                    window.electron.pdfExport.exportToPDF();
                                `);
                            } catch (error) {
                                console.error('PDF export error:', error);
                            }
                        },
                    },
                    {
                        label: 'Export to &PowerPoint...',
                        accelerator: 'Ctrl+Shift+E',
                        click: async () => {
                            try {
                                await this.mainWindow.webContents.executeJavaScript(`
                                    window.electron.presentation.exportToPowerPoint();
                                `);
                            } catch (error) {
                                console.error(
                                    'PowerPoint export error:',
                                    error,
                                );
                            }
                        },
                    },
                    { type: 'separator' as const },
                    {
                        label: '&Close',
                        accelerator: 'Ctrl+W',
                        click: () => {
                            this.mainWindow.close();
                        },
                    },
                ],
            },
            {
                label: '&Edit',
                submenu: [
                    {
                        label: '&Undo',
                        accelerator: 'Ctrl+Z',
                        click: () => {
                            this.mainWindow.webContents.send('menu:undo');
                        },
                    },
                    {
                        label: '&Redo',
                        accelerator: 'Ctrl+Y',
                        click: () => {
                            this.mainWindow.webContents.send('menu:redo');
                        },
                    },
                    { type: 'separator' as const },
                    {
                        label: '&Copy',
                        accelerator: 'Ctrl+C',
                        click: () => {
                            console.log('Windows menu Copy clicked');
                            this.mainWindow.webContents.send('menu:copy');
                        },
                    },
                    {
                        label: '&Paste',
                        accelerator: 'Ctrl+V',
                        role: 'paste',
                    },
                    {
                        label: 'Select &All',
                        accelerator: 'Ctrl+A',
                        click: () => {
                            console.log('Windows menu Select All clicked');
                            this.mainWindow.webContents.send('menu:select-all');
                        },
                    },
                    { type: 'separator' as const },
                    {
                        label: 'LLM &Settings...',
                        accelerator: 'Ctrl+,',
                        click: () => {
                            this.mainWindow.webContents.send(
                                'menu:open-llm-settings',
                            );
                        },
                    },
                ],
            },
        ];

        return templateDefault;
    }
}
