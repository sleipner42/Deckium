import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import { COLOR_DESCRIPTION, colorSchema } from '../utils/schemas';

export class UpdateSlideTool extends BaseTool {
    name = 'updateSlide';

    description = 'Update details of a slide';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to update'),
        background: colorSchema
            .describe(
                `The new background for the slide. ${COLOR_DESCRIPTION} Also accepts CSS gradients like 'linear-gradient(135deg, #0B1220, #1E293B)'.`,
            )
            .optional(),
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
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        return {
            success: true,
            data: {
                slideId: updatedSlide.id,
                background: updatedSlide.background,
                message: `Slide updated successfully`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
