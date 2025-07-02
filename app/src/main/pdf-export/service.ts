import { BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { Presentation } from '../../common/domain/entities/types';
import { setSlideInHiddenWindow } from '../main';
import { PresentationService } from '../presentation/service';

export interface PDFExportProgress {
    slideIndex: number;
    totalSlides: number;
    currentSlide: string;
    status: 'starting' | 'processing' | 'complete' | 'error';
    message?: string;
}

export class PDFExportService {
    private presentationService: PresentationService;
    private secondWindow: BrowserWindow | null = null;

    constructor(presentationService: PresentationService) {
        this.presentationService = presentationService;
    }

    setSecondWindow(window: BrowserWindow): void {
        this.secondWindow = window;
    }

    /**
     * Export the entire presentation to PDF
     */
    async exportToPDF(
        mainWindow: BrowserWindow,
        onProgress?: (progress: PDFExportProgress) => void,
    ): Promise<string | null> {
        try {
            console.log('Starting PDF export...');

            if (!this.secondWindow) {
                throw new Error(
                    'Secondary window not available for PDF export',
                );
            }

            const presentation = this.presentationService.getPresentation();
            console.log(
                `Presentation loaded: ${presentation.title}, slides: ${presentation.slides.length}`,
            );

            const slides = presentation.slides;

            if (slides.length === 0) {
                throw new Error('No slides to export');
            }

            // Log slide information
            slides.forEach((slide, index) => {
                console.log(
                    `Slide ${index + 1}: ID=${slide.id}, Title="${slide.title || 'Untitled'}"`,
                );
            });

            // Show save dialog
            const savePath = await this.showSaveDialog(
                mainWindow,
                presentation,
            );
            if (!savePath) {
                return null; // User cancelled
            }

            onProgress?.({
                slideIndex: 0,
                totalSlides: slides.length,
                currentSlide: slides[0]?.title || 'Slide 1',
                status: 'starting',
                message: 'Initializing PDF export...',
            });

            // Try Electron's printToPDF first (preserves real text)
            try {
                const pdfData = await this.exportWithElectronPDF(
                    slides,
                    onProgress,
                );
                await fs.promises.writeFile(savePath, pdfData);

                onProgress?.({
                    slideIndex: slides.length,
                    totalSlides: slides.length,
                    currentSlide: '',
                    status: 'complete',
                    message: 'PDF export completed successfully',
                });

                return savePath;
            } catch (electronError) {
                console.warn(
                    'Electron PDF export failed, falling back to image-based export:',
                    electronError,
                );

                // Fallback to image-based export
                const pdfBuffer = await this.exportWithImageFallback(
                    slides,
                    onProgress,
                );
                await fs.promises.writeFile(savePath, pdfBuffer);

                onProgress?.({
                    slideIndex: slides.length,
                    totalSlides: slides.length,
                    currentSlide: '',
                    status: 'complete',
                    message: 'PDF export completed (image-based)',
                });

                return savePath;
            }
        } catch (error) {
            console.error('PDF export error:', error);
            onProgress?.({
                slideIndex: 0,
                totalSlides: 0,
                currentSlide: '',
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred',
            });
            throw error;
        }
    }

    /**
     * Export using Electron's printToPDF (preserves real text)
     */
    private async exportWithElectronPDF(
        slides: any[],
        onProgress?: (progress: PDFExportProgress) => void,
    ): Promise<Buffer> {
        const pdfBuffers: Buffer[] = [];

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];

            onProgress?.({
                slideIndex: i + 1,
                totalSlides: slides.length,
                currentSlide: slide.title || `Slide ${i + 1}`,
                status: 'processing',
                message: `Generating PDF for slide ${i + 1}...`,
            });

            // Set the slide in the hidden viewer window only (don't disturb the main window)
            console.log(
                `Setting slide ${slide.id} in hidden viewer for PDF generation`,
            );
            await setSlideInHiddenWindow(slide.id);

            // Wait for rendering
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Generate PDF for this slide
            console.log(
                `Generating PDF for slide ${i + 1}/${slides.length}: ${slide.title || 'Untitled'}`,
            );

            const pdfData = await this.secondWindow!.webContents.printToPDF({
                pageSize: 'A4',
                margins: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                },
                printBackground: true,
                landscape: true,
            });

            console.log(`PDF data generated, size: ${pdfData.length} bytes`);

            pdfBuffers.push(pdfData);
        }

        console.log(
            `Generated ${pdfBuffers.length} PDF buffers, total sizes: ${pdfBuffers.map((b) => b.length).join(', ')} bytes`,
        );

        // For single slide, return directly
        if (pdfBuffers.length === 1) {
            return pdfBuffers[0];
        }

        // For multiple slides, merge PDFs using pdf-lib (preserves text quality)
        console.log('Multiple slides detected, merging PDFs with pdf-lib...');
        return await this.mergePDFs(pdfBuffers);
    }

    /**
     * Merge multiple PDF buffers into a single PDF using pdf-lib
     */
    private async mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
        console.log(`Merging ${pdfBuffers.length} PDFs...`);

        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < pdfBuffers.length; i++) {
            console.log(
                `Processing PDF ${i + 1}/${pdfBuffers.length} (${pdfBuffers[i].length} bytes)`,
            );

            const pdfDoc = await PDFDocument.load(pdfBuffers[i]);
            const pages = await mergedPdf.copyPages(
                pdfDoc,
                pdfDoc.getPageIndices(),
            );

            pages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        console.log(
            `Merged PDF created, final size: ${mergedPdfBytes.length} bytes`,
        );

        return Buffer.from(mergedPdfBytes);
    }

    /**
     * Fallback export using screenshots and jsPDF
     */
    private async exportWithImageFallback(
        slides: any[],
        onProgress?: (progress: PDFExportProgress) => void,
    ): Promise<Buffer> {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4', // Use standard A4 size for better compatibility
        });

        let isFirstSlide = true;

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];

            onProgress?.({
                slideIndex: i + 1,
                totalSlides: slides.length,
                currentSlide: slide.title || `Slide ${i + 1}`,
                status: 'processing',
                message: `Capturing slide ${i + 1}...`,
            });

            // Set the slide in the hidden viewer window only (don't disturb the main window)
            console.log(
                `Setting slide ${slide.id} in hidden viewer for capture`,
            );
            await setSlideInHiddenWindow(slide.id);

            // Wait for rendering and slide change to take effect
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Capture screenshot at higher resolution
            console.log(`Capturing screenshot for slide ${i + 1}`);
            const screenshot = await this.secondWindow!.webContents.capturePage(
                {
                    x: 0,
                    y: 0,
                    width: 1280,
                    height: 720,
                },
            );
            const pngData = screenshot.toPNG();
            const base64Data = pngData.toString('base64');

            console.log(
                `Screenshot captured, PNG size: ${pngData.length} bytes, base64 size: ${base64Data.length} chars`,
            );

            // Add page to PDF
            if (!isFirstSlide) {
                pdf.addPage();
            }
            isFirstSlide = false;

            // Add image to PDF (full page) - A4 landscape is 297x210mm
            console.log(`Adding image to PDF page ${i + 1}`);
            pdf.addImage(
                `data:image/png;base64,${base64Data}`,
                'PNG',
                0,
                0,
                297,
                210, // A4 landscape dimensions
                undefined,
                'SLOW', // Use SLOW for better quality
            );
        }

        console.log('Generating final PDF buffer...');
        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
        console.log(`Final PDF generated, size: ${pdfBuffer.length} bytes`);
        return pdfBuffer;
    }

    /**
     * Show save dialog for PDF export
     */
    private async showSaveDialog(
        window: BrowserWindow,
        presentation: Presentation,
    ): Promise<string | null> {
        const defaultPath = `${presentation.title}.pdf`;

        const { canceled, filePath } = await dialog.showSaveDialog(window, {
            title: 'Export Presentation to PDF',
            defaultPath,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });

        return canceled ? null : filePath || null;
    }
}
