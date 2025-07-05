import { dialog, ipcMain } from 'electron';
import { PresentationService } from '../presentation/service';
import {
    ImportProgress,
    ImportResult,
    PowerPointImportService,
} from './service';

export class PowerPointImportIPCHandler {
    private importService: PowerPointImportService;
    private presentationService: PresentationService | null = null;

    constructor() {
        this.importService = new PowerPointImportService();
        this.registerHandlers();
    }

    setPresentationService(presentationService: PresentationService) {
        this.presentationService = presentationService;
    }

    private registerHandlers() {
        // Handler for showing file dialog and importing PowerPoint file
        ipcMain.handle('powerpoint-import:select-and-import', async (event) => {
            try {
                // Show file dialog to select PPTX file
                const result = await dialog.showOpenDialog({
                    title: 'Import PowerPoint Presentation',
                    filters: [
                        {
                            name: 'PowerPoint Presentations',
                            extensions: ['pptx'],
                        },
                        {
                            name: 'All Files',
                            extensions: ['*'],
                        },
                    ],
                    properties: ['openFile'],
                });

                if (result.canceled || result.filePaths.length === 0) {
                    return { success: false, error: 'Import canceled by user' };
                }

                const filePath = result.filePaths[0];

                // Set up progress callback
                this.importService.setProgressCallback(
                    (progress: ImportProgress) => {
                        event.sender.send(
                            'powerpoint-import:progress',
                            progress,
                        );
                    },
                );

                // Import the file
                const importResult =
                    await this.importService.importPowerPointFile(filePath);

                // If import was successful and we have a presentation service, load the presentation
                if (
                    importResult.success &&
                    importResult.presentation &&
                    this.presentationService
                ) {
                    const loadedPresentation =
                        this.presentationService.loadImportedPresentation(
                            importResult.presentation,
                        );
                    return {
                        success: true,
                        presentation: loadedPresentation,
                    };
                }

                return importResult;
            } catch (error) {
                console.error('PowerPoint import error:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error occurred',
                };
            }
        });

        // Handler for importing from a specific file path
        ipcMain.handle(
            'powerpoint-import:import-file',
            async (event, filePath: string) => {
                try {
                    // Set up progress callback
                    this.importService.setProgressCallback(
                        (progress: ImportProgress) => {
                            event.sender.send(
                                'powerpoint-import:progress',
                                progress,
                            );
                        },
                    );

                    // Import the file
                    const importResult =
                        await this.importService.importPowerPointFile(filePath);

                    // If import was successful and we have a presentation service, load the presentation
                    if (
                        importResult.success &&
                        importResult.presentation &&
                        this.presentationService
                    ) {
                        const loadedPresentation =
                            this.presentationService.loadImportedPresentation(
                                importResult.presentation,
                            );
                        return {
                            success: true,
                            presentation: loadedPresentation,
                        };
                    }

                    return importResult;
                } catch (error) {
                    console.error('PowerPoint import error:', error);
                    return {
                        success: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error occurred',
                    };
                }
            },
        );
    }

    // Method to cleanup handlers when needed
    public removeHandlers() {
        ipcMain.removeHandler('powerpoint-import:select-and-import');
        ipcMain.removeHandler('powerpoint-import:import-file');
    }
}
