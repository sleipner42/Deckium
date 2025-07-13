import { dialog, ipcMain } from 'electron';
import { PDFProcessorService } from './service';

export class PDFProcessorIPCHandler {
    private pdfService: PDFProcessorService;

    constructor() {
        this.pdfService = new PDFProcessorService();
        this.setupIPCHandlers();
    }

    private setupIPCHandlers(): void {
        // Upload and process PDF
        ipcMain.handle('pdf:upload-and-process', async () => {
            try {
                const result = await dialog.showOpenDialog({
                    title: 'Select PDF to Process',
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
                    properties: ['openFile'],
                });

                if (result.canceled || result.filePaths.length === 0) {
                    return { success: false, error: 'No file selected' };
                }

                const filePath = result.filePaths[0];
                console.log('Processing PDF:', filePath);

                const content = await this.pdfService.processPDF(filePath);

                return {
                    success: true,
                    data: content,
                };
            } catch (error) {
                console.error('Error in PDF upload and process:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                };
            }
        });

        // Get specific PDF content
        ipcMain.handle('pdf:get-content', async (_event, pdfId: string) => {
            try {
                const content = await this.pdfService.getPDFContent(pdfId);
                return { success: true, data: content };
            } catch (error) {
                console.error('Error getting PDF content:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                };
            }
        });

        // Get all processed PDFs
        ipcMain.handle('pdf:get-all', async () => {
            try {
                const pdfs = await this.pdfService.getAllProcessedPDFs();
                return { success: true, data: pdfs };
            } catch (error) {
                console.error('Error getting all PDFs:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                };
            }
        });

        // Delete PDF content
        ipcMain.handle('pdf:delete', async (_event, pdfId: string) => {
            try {
                const success = await this.pdfService.deletePDFContent(pdfId);
                return { success, data: { deleted: success } };
            } catch (error) {
                console.error('Error deleting PDF:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                };
            }
        });

        // Process PDF from file path (used for pasted PDFs)
        ipcMain.handle('pdf:process-file', async (_event, filePath: string) => {
            try {
                console.log('Processing PDF from file path:', filePath);

                const content = await this.pdfService.processPDF(filePath);

                return {
                    success: true,
                    data: content,
                };
            } catch (error) {
                console.error('Error processing PDF from file path:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                };
            }
        });
    }
}
