import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';

export class DeleteSlideTool extends BaseTool {
    name = 'deleteSlide';

    description = 'Delete a slide from the current presentation';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to delete'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        const deletedSlideId = presentationService.deleteSlide(slideId);

        if (!deletedSlideId) {
            return {
                success: false,
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        return {
            success: true,
            data: {
                slideId: deletedSlideId,
                message: `Slide deleted successfully`,
            },
            editedSlidesIds: [],
        };
    }
}
