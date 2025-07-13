import path from 'path';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PDFProcessorService } from '../../../pdf-processor/service';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class AddImageFromPDFTool extends BaseTool {
    name = 'addImageFromPDF';

    description =
        'Add an image from a processed PDF to a presentation slide. Use getPDFContent first to see available images and their IDs.';

    requiredParams = {
        slideId: 'The ID of the slide to add the image to',
        pdfId: 'The ID of the processed PDF containing the image',
        imageId: 'The ID of the image to add (e.g., "page_1", "page_2", etc.)',
        x: 'The horizontal position (in pixels) where the image should be placed on the slide',
        y: 'The vertical position (in pixels) where the image should be placed on the slide',
        zIndex: 'The stacking order of the image relative to other elements (higher numbers appear on top)',
    };

    optionalParams = {
        width: 'The desired width of the image in pixels. If specified, height will be calculated automatically based on the image aspect ratio. Do not specify both width and height.',
        height: 'The desired height of the image in pixels. If specified, width will be calculated automatically based on the image aspect ratio. Do not specify both width and height.',
    };

    private pdfService: PDFProcessorService;

    constructor() {
        super();
        this.pdfService = new PDFProcessorService();
    }

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        try {
            const { slideId, pdfId, imageId, x, y, zIndex, width, height } =
                params;

            // Validate required parameters
            if (
                !slideId ||
                !pdfId ||
                !imageId ||
                x === undefined ||
                y === undefined ||
                zIndex === undefined
            ) {
                return {
                    success: false,
                    error: 'Missing required parameters: slideId, pdfId, imageId, x, y, and zIndex are all required',
                };
            }

            // Get PDF content to find the image
            const pdfContent = await this.pdfService.getPDFContent(pdfId);
            if (!pdfContent) {
                return {
                    success: false,
                    error: `PDF with ID "${pdfId}" not found. Use getPDFContent to see available PDFs.`,
                };
            }

            // Find the specific image
            const image = pdfContent.images.find((img) => img.id === imageId);
            if (!image) {
                const availableImages = pdfContent.images
                    .map((img) => img.id)
                    .join(', ');
                return {
                    success: false,
                    error: `Image with ID "${imageId}" not found in PDF "${pdfContent.filename}". Available images: ${availableImages}`,
                };
            }

            // Check if the slide exists
            const currentPresentation = presentationService.getPresentation();
            const slide = currentPresentation.slides.find(
                (s) => s.id === slideId,
            );
            if (!slide) {
                return {
                    success: false,
                    error: `Slide with ID ${slideId} not found`,
                };
            }

            // Convert local file path to a file:// URL that can be used by the renderer
            const imagePath = image.path;
            const imageUrl = `file://${imagePath}`;

            // Create the image element
            const elementData = {
                type: 'image' as const,
                position: { x: Number(x), y: Number(y) },
                size: {
                    width: width ? Number(width) : 400, // Default width if not specified
                    height: height ? Number(height) : 300, // Default height if not specified
                },
                zIndex: Number(zIndex),
                imageUrl: imageUrl,
                metadata: {
                    source: 'pdf',
                    pdfId: pdfId,
                    pdfFilename: pdfContent.filename,
                    originalImageId: imageId,
                    originalLabel: image.label,
                    page: image.page,
                },
            };

            // Add the element to the slide
            const result = presentationService.addElement(slideId, elementData);

            return {
                success: true,
                data: {
                    elementId: result.elementId,
                    slideId: slideId,
                    message: `Successfully added image "${image.label}" from PDF "${pdfContent.filename}" to slide`,
                    imageInfo: {
                        source: 'pdf',
                        pdfFilename: pdfContent.filename,
                        label: image.label,
                        page: image.page,
                    },
                },
                editedSlidesIds: [slideId],
            };
        } catch (error) {
            console.error('Error in AddImageFromPDFTool:', error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred while adding PDF image',
            };
        }
    }
}
