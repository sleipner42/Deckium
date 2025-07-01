import { BrowserWindow, ipcMain } from 'electron';
import { PDFExportService, PDFExportProgress } from './service';

const PDF_EXPORT_CHANNELS = {
    EXPORT_TO_PDF: 'pdf-export:export-to-pdf',
    EXPORT_PROGRESS: 'pdf-export:progress',
    EXPORT_COMPLETE: 'pdf-export:complete',
    EXPORT_ERROR: 'pdf-export:error'
} as const;

export function setupPDFExportIPC(pdfExportService: PDFExportService): void {
    // Handle PDF export requests
    ipcMain.handle(PDF_EXPORT_CHANNELS.EXPORT_TO_PDF, async (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow) {
            throw new Error('Unable to determine sender window');
        }

        try {
            // Set up progress handler
            const progressHandler = (progress: PDFExportProgress) => {
                event.sender.send(PDF_EXPORT_CHANNELS.EXPORT_PROGRESS, progress);
            };

            // Start the export
            const exportPath = await pdfExportService.exportToPDF(senderWindow, progressHandler);
            
            if (exportPath) {
                event.sender.send(PDF_EXPORT_CHANNELS.EXPORT_COMPLETE, { path: exportPath });
                return { success: true, path: exportPath };
            } else {
                // User cancelled
                return { success: false, cancelled: true };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            event.sender.send(PDF_EXPORT_CHANNELS.EXPORT_ERROR, { message: errorMessage });
            throw new Error(`PDF export failed: ${errorMessage}`);
        }
    });
}

// Export channel names for use in renderer
export { PDF_EXPORT_CHANNELS };