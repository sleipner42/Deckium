import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';

export class MoveSlideTool extends BaseTool {
    name = 'moveSlide';

    description =
        'Move a slide to a different position in the presentation (reorder slides).';

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to move'),
        newIndex: z
            .number()
            .int()
            .min(0)
            .describe(
                '0-based target position: 0 makes it the first slide, 1 the second, and so on',
            ),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, newIndex } = params;

        if (!slideId || newIndex === undefined) {
            return {
                success: false,
                error: 'slideId and newIndex are required',
            };
        }

        const presentation = presentationService.getPresentation();
        const fromIndex = presentation.slides.findIndex(
            (slide) => slide.id === slideId,
        );

        if (fromIndex === -1) {
            return {
                success: false,
                error: slideNotFound(slideId, presentation),
            };
        }

        const slideCount = presentation.slides.length;
        const toIndex = Number(newIndex);
        if (
            !Number.isInteger(toIndex) ||
            toIndex < 0 ||
            toIndex >= slideCount
        ) {
            return {
                success: false,
                error: `newIndex ${newIndex} is out of range. Valid range: 0 to ${slideCount - 1} (the presentation has ${slideCount} slides).`,
            };
        }

        if (toIndex === fromIndex) {
            return {
                success: true,
                data: {
                    slideId,
                    index: fromIndex,
                    slideOrder: presentation.slides.map((slide) => slide.id),
                    message: `Slide is already at position ${fromIndex}.`,
                },
                editedSlidesIds: [],
            };
        }

        const updated = presentationService.reorderSlides(fromIndex, toIndex);

        return {
            success: true,
            data: {
                slideId,
                fromIndex,
                toIndex,
                slideOrder: updated.slides.map((slide) => slide.id),
                message: `Slide moved from position ${fromIndex} to ${toIndex}.`,
            },
            editedSlidesIds: [],
        };
    }
}
