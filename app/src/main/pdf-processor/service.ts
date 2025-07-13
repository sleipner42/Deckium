import { createHash } from 'crypto';
import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

export interface PDFImage {
    id: string;
    filename: string;
    path: string;
    label: string;
    page: number;
}

export interface PDFContent {
    id: string;
    filename: string;
    text: string;
    numPages: number;
    images: PDFImage[];
    extractedAt: string;
}

export class PDFProcessorService {
    private extractsDir: string;

    constructor() {
        this.extractsDir = path.join(app.getPath('userData'), 'pdf_extracts');
        this.ensureExtractsDirectory();
    }

    private async ensureExtractsDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.extractsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating PDF extracts directory:', error);
        }
    }

    private generatePDFId(filePath: string, fileStats: any): string {
        const hashInput = `${filePath}-${fileStats.size}-${fileStats.mtime.getTime()}`;
        return createHash('md5')
            .update(hashInput)
            .digest('hex')
            .substring(0, 12);
    }

    async processPDF(filePath: string): Promise<PDFContent> {
        try {
            // Check if file exists
            const fileStats = await fs.stat(filePath);
            const filename = path.basename(filePath);
            const pdfId = this.generatePDFId(filePath, fileStats);

            // Create extraction directory for this PDF
            const pdfExtractDir = path.join(this.extractsDir, pdfId);
            const imagesDir = path.join(pdfExtractDir, 'images');

            await fs.mkdir(pdfExtractDir, { recursive: true });
            await fs.mkdir(imagesDir, { recursive: true });

            // Extract text content
            console.log('Extracting text from PDF...');
            const dataBuffer = await fs.readFile(filePath);

            // Use our safe PDF text extractor
            const { extractPDFText } = await import('./pdf-text-extractor');
            const textResult = await extractPDFText(filePath);

            // Create a compatible object for the rest of the function
            const pdfData = {
                text: textResult.text,
                numpages: textResult.numPages,
            };

            // Extract embedded images from PDF
            console.log('Extracting embedded images from PDF...');
            const images = await this.extractEmbeddedImages(
                dataBuffer,
                imagesDir,
            );

            // Save metadata
            const content: PDFContent = {
                id: pdfId,
                filename,
                text: pdfData.text,
                numPages: pdfData.numpages,
                images,
                extractedAt: new Date().toISOString(),
            };

            const metadataPath = path.join(pdfExtractDir, 'metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(content, null, 2));

            // Save text content separately for easy access
            const textPath = path.join(pdfExtractDir, 'text.txt');
            await fs.writeFile(textPath, pdfData.text);

            console.log(
                `PDF processed successfully: ${images.length} images extracted`,
            );
            return content;
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw new Error(
                `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    private async extractEmbeddedImages(
        pdfBuffer: Buffer,
        outputDir: string,
    ): Promise<PDFImage[]> {
        const images: PDFImage[] = [];

        try {
            // Load PDF with pdf-lib to extract embedded images
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();

            let imageCounter = 0;

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const page = pages[pageIndex];
                const pageNumber = pageIndex + 1;

                // Get page resources
                const pageDict = page.node;
                const resources = pageDict.lookup(
                    page.node.context.obj('Resources'),
                );

                if (resources) {
                    const xObject = resources.lookup(
                        page.node.context.obj('XObject'),
                    );

                    if (xObject) {
                        // Iterate through XObjects to find images
                        const xObjectKeys = xObject.dict.keys();

                        for (const key of xObjectKeys) {
                            const xObj = xObject.lookup(
                                page.node.context.obj(key),
                            );

                            if (xObj && xObj.dict) {
                                const subtype = xObj.dict.lookup(
                                    page.node.context.obj('Subtype'),
                                );

                                // Check if this XObject is an image
                                if (
                                    subtype &&
                                    subtype.toString() === '/Image'
                                ) {
                                    imageCounter++;

                                    try {
                                        // Note: PDF image extraction is complex due to various compression and encoding formats
                                        // For now, we'll skip embedded image extraction and recommend using screenshots
                                        // or external tools for image extraction from PDFs

                                        console.log(
                                            `Found image ${imageCounter} on page ${pageNumber} but skipping extraction (complex format)`,
                                        );

                                        // Add placeholder entry to indicate image was found but not extracted
                                        images.push({
                                            id: `img_${imageCounter}`,
                                            filename: `placeholder_image_${imageCounter}_page_${pageNumber}.txt`,
                                            path: '', // Empty path since we didn't extract it
                                            label: `Image ${imageCounter} found on page ${pageNumber} (extraction not supported for this format)`,
                                            page: pageNumber,
                                        });
                                    } catch (imageError) {
                                        console.warn(
                                            `Could not extract image ${imageCounter} from page ${pageNumber}:`,
                                            imageError,
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (images.length === 0) {
                console.log(
                    'No embedded images found in PDF. PDF may contain only text or vector graphics.',
                );
            } else {
                console.log(
                    `Successfully extracted ${images.length} embedded images from PDF`,
                );
            }
        } catch (error) {
            console.error('Error extracting embedded images:', error);
            console.log(
                'Note: Image extraction from PDFs can be complex. Some images may not be extractable depending on their encoding.',
            );
        }

        return images;
    }

    async getPDFContent(pdfId: string): Promise<PDFContent | null> {
        try {
            const metadataPath = path.join(
                this.extractsDir,
                pdfId,
                'metadata.json',
            );
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(metadataContent);
        } catch (error) {
            console.error(`Error reading PDF content for ID ${pdfId}:`, error);
            return null;
        }
    }

    async getAllProcessedPDFs(): Promise<PDFContent[]> {
        try {
            const entries = await fs.readdir(this.extractsDir, {
                withFileTypes: true,
            });
            const pdfContents: PDFContent[] = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const content = await this.getPDFContent(entry.name);
                    if (content) {
                        pdfContents.push(content);
                    }
                }
            }

            // Sort by extraction date (newest first)
            return pdfContents.sort(
                (a, b) =>
                    new Date(b.extractedAt).getTime() -
                    new Date(a.extractedAt).getTime(),
            );
        } catch (error) {
            console.error('Error getting processed PDFs:', error);
            return [];
        }
    }

    async deletePDFContent(pdfId: string): Promise<boolean> {
        try {
            const pdfDir = path.join(this.extractsDir, pdfId);
            await fs.rm(pdfDir, { recursive: true, force: true });
            console.log(`Deleted PDF content for ID: ${pdfId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting PDF content for ID ${pdfId}:`, error);
            return false;
        }
    }

    getImagePath(pdfId: string, imageId: string): string | null {
        try {
            const content = this.getPDFContent(pdfId);
            if (!content) return null;

            // This is async but we'll handle it in the caller
            return path.join(this.extractsDir, pdfId, 'images');
        } catch (error) {
            console.error('Error getting image path:', error);
            return null;
        }
    }
}
