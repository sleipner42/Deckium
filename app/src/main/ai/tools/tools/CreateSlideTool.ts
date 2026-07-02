import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { colorSchema } from '../utils/schemas';

export class CreateSlideTool extends BaseTool {
    name = 'createSlide';

    description = 'Create a new slide in the current presentation';

    inputSchema = z.object({
        background: colorSchema
            .optional()
            .describe(
                'Optional background color for the new slide (defaults to white). CSS color: hex, rgb(a), hsl(a), or named color.',
            ),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { background } = params;
        let newSlide = presentationService.addSlide();

        if (background) {
            const updated = presentationService.updateSlide(newSlide.id, {
                background,
            });
            if (updated) {
                newSlide = updated;
            }
        }

        return {
            success: true,
            data: {
                slideId: newSlide.id,
                background: newSlide.background,
                slideIndex:
                    presentationService.getPresentation().slides.length - 1,
                message: `New slide created successfully`,
            },
            editedSlidesIds: [newSlide.id],
        };
    }
}
