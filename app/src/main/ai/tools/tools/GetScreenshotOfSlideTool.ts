import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import getScreenshotFromSecondaryWindow, {
    setSlideInHiddenWindow,
} from '../../../main';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';

export class GetScreenshotOfSlideTool extends BaseTool {
    name = 'getScreenshotOfSlide';

    description = 'Get a screenshot of a slide';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to get a screenshot of'),
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

        const currentPresentation = presentationService.getPresentation();
        const slide = currentPresentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        // Set slide only in hidden window to avoid disturbing the user's
        // current view; resolves once the hidden window reports it rendered.
        await setSlideInHiddenWindow(slideId);

        const screenshot = await getScreenshotFromSecondaryWindow();

        const slideIndex = currentPresentation.slides.indexOf(slide) + 1;
        return {
            success: true,
            data: {
                slideId,
                message: `Screenshot of slide ${slideIndex} (${slideId}) attached.`,
            },
            screenshot,
            editedSlidesIds: [],
        };
    }
}
