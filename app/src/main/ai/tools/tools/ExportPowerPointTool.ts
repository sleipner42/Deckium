import { PowerPointExportService } from '../../../powerpoint-export/service';
import { BaseTool } from '../BaseTool';

type ExportPowerPointParams = {};

export class ExportPowerPointTool extends BaseTool<ExportPowerPointParams> {
    name = 'export_powerpoint';
    description =
        'Export the current presentation to PowerPoint (.pptx) format';

    schema = {
        type: 'object',
        properties: {},
        required: [],
    } as const;

    async execute(params: ExportPowerPointParams) {
        try {
            const presentation = this.presentationService.getPresentation();
            if (!presentation) {
                return {
                    success: false,
                    error: 'No presentation available to export',
                };
            }

            const exportService = new PowerPointExportService();
            await exportService.exportPresentation(presentation);

            return {
                success: true,
                message: `Successfully exported "${presentation.title || 'Presentation'}" to PowerPoint format (.pptx). The file has been saved to your downloads folder.`,
                fileName: `${presentation.title || 'presentation'}.pptx`,
                slideCount: presentation.slides.length,
            };
        } catch (error) {
            console.error('PowerPoint export failed:', error);
            return {
                success: false,
                error: `PowerPoint export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}
