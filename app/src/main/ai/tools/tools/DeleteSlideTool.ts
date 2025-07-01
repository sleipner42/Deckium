import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class DeleteSlideTool extends BaseTool {
    name = 'deleteSlide';

    description = 'Delete a slide from the current presentation';

    requiredParams = {
        slideId: 'The ID of the slide to delete',
    };

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
                error: `Slide with ID ${slideId} not found`,
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
