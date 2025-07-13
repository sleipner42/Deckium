import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PDFProcessorService } from '../../../pdf-processor/service';
import { BaseTool } from '../BaseTool';

export class GetPDFContentTool extends BaseTool {
    name = 'getPDFContent';

    description =
        'Get the text content and available images from a processed PDF. Use this to access PDF text for analysis and to see what images are available for adding to slides.';

    requiredParams = {};

    optionalParams = {
        pdfId: 'The ID of a specific PDF to retrieve. If not provided, lists all available processed PDFs.',
    };

    private pdfService: PDFProcessorService;

    constructor() {
        super();
        this.pdfService = new PDFProcessorService();
    }

    protected async executeImpl(
        params: Record<string, any>,
    ): Promise<AIToolResult> {
        try {
            const { pdfId } = params;

            if (pdfId) {
                // Get specific PDF content
                const content = await this.pdfService.getPDFContent(pdfId);

                if (!content) {
                    return {
                        success: false,
                        error: `PDF with ID "${pdfId}" not found. Use getPDFContent without pdfId to see available PDFs.`,
                    };
                }

                // Format the response for the AI
                const imagesList = content.images
                    .map(
                        (img) =>
                            `- ${img.id}: "${img.label}" (${img.filename})`,
                    )
                    .join('\n');

                const message = `PDF: ${content.filename} (${content.numPages} pages)
Processed: ${new Date(content.extractedAt).toLocaleString()}

TEXT CONTENT:
${content.text}

AVAILABLE IMAGES (${content.images.length}):
${imagesList || 'No images found'}

To add any of these images to a slide, use the addImageFromPDF tool with the pdfId "${content.id}" and the image ID.`;

                return {
                    success: true,
                    data: {
                        message,
                        pdfId: content.id,
                        filename: content.filename,
                        text: content.text,
                        numPages: content.numPages,
                        images: content.images,
                        extractedAt: content.extractedAt,
                    },
                };
            } else {
                // List all available PDFs
                const allPDFs = await this.pdfService.getAllProcessedPDFs();

                if (allPDFs.length === 0) {
                    return {
                        success: true,
                        data: {
                            message:
                                'No processed PDFs found. Use the File menu to upload and process PDF files first.',
                            pdfs: [],
                        },
                    };
                }

                const pdfList = allPDFs
                    .map(
                        (pdf) =>
                            `- ${pdf.id}: "${pdf.filename}" (${pdf.numPages} pages, ${pdf.images.length} images) - processed ${new Date(pdf.extractedAt).toLocaleDateString()}`,
                    )
                    .join('\n');

                const message = `Found ${allPDFs.length} processed PDF(s):

${pdfList}

To access the content of a specific PDF, use getPDFContent with the pdfId parameter.`;

                return {
                    success: true,
                    data: {
                        message,
                        pdfs: allPDFs.map((pdf) => ({
                            id: pdf.id,
                            filename: pdf.filename,
                            numPages: pdf.numPages,
                            imageCount: pdf.images.length,
                            extractedAt: pdf.extractedAt,
                        })),
                    },
                };
            }
        } catch (error) {
            console.error('Error in GetPDFContentTool:', error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred',
            };
        }
    }
}
