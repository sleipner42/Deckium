import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { getScreenshotFromSecondaryWindow, setSlideInHiddenWindow } from '../../../main';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class GetScreenshotOfSlideTool extends BaseTool {
    name = 'getScreenshotOfSlide';

    description = 'Get a screenshot of a slide';

    requiredParams = {
        slideId: 'The ID of the slide to get a screenshot of',
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

        const currentPresentation = presentationService.getPresentation();
        const slide = currentPresentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        // Set slide only in hidden window to avoid disturbing the user's current view
        await setSlideInHiddenWindow(slideId);

        await new Promise((resolve) => setTimeout(resolve, 800));

        const screenshot = await getScreenshotFromSecondaryWindow();

        return {
            success: true,
            screenshot,
            editedSlidesIds: [],
        };
    }
}
