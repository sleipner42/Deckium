import path from 'node:path';
import { app } from 'electron';
import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import type { ToolServices } from '../AITool';
import { BaseTool } from '../BaseTool';

function sanitizeFilename(name: string): string {
    const cleaned = name
        .replace(/[<>:"/\\|?*]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80);
    return cleaned || 'presentation';
}

export class ExportPresentationToPdfTool extends BaseTool {
    name = 'exportPresentationToPdf';

    description =
        "Export the entire presentation as a PDF file. Saves to the user's Documents folder by default and returns the saved file path — tell the user where the file is.";

    inputSchema = z.object({
        filePath: z
            .string()
            .optional()
            .describe(
                "Optional absolute path for the PDF file (must end in .pdf). Defaults to the user's Documents folder with a name derived from the presentation title.",
            ),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
        services?: ToolServices,
    ): Promise<AIToolResult> {
        const pdfExport = services?.pdfExport;
        if (!pdfExport) {
            return {
                success: false,
                error: 'PDF export is not available in this context.',
            };
        }

        const presentation = presentationService.getPresentation();
        if (presentation.slides.length === 0) {
            return {
                success: false,
                error: 'The presentation has no slides to export.',
            };
        }

        let filePath: string = params.filePath;
        if (filePath) {
            if (!filePath.toLowerCase().endsWith('.pdf')) {
                return {
                    success: false,
                    error: `filePath must end in .pdf (got '${filePath}')`,
                };
            }
        } else {
            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, '-')
                .slice(0, 19);
            filePath = path.join(
                app.getPath('documents'),
                `${sanitizeFilename(presentation.title)}-${timestamp}.pdf`,
            );
        }

        try {
            const savedPath = await pdfExport.exportToFile(filePath);
            return {
                success: true,
                data: {
                    filePath: savedPath,
                    slideCount: presentation.slides.length,
                    message: `Exported ${presentation.slides.length} slide(s) to ${savedPath}. Tell the user the file location.`,
                },
                editedSlidesIds: [],
            };
        } catch (error) {
            return {
                success: false,
                error: `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}
