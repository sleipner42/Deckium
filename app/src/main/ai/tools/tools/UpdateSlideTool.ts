import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class UpdateSlideTool extends BaseTool {
    name = 'updateSlide';

    description = 'Update details of a slide';

    requiredParams = {
        slideId: 'The ID of the slide to update',
    };

    optionalParams = {
        background: 'The new background color for the slide',
    };

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to update'),
        background: z
            .string()
            .optional()
            .describe('The new background color for the slide'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, background } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        const updates: any = {};
        if (background) updates.background = background;

        const updatedSlide = presentationService.updateSlide(slideId, updates);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        return {
            success: true,
            data: {
                slideId: updatedSlide.id,
                message: `Slide updated successfully`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
