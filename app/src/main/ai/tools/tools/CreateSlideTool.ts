import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class CreateSlideTool extends BaseTool {
    name = 'createSlide';

    description = 'Create a new slide in the current presentation';

    protected async executeImpl(
        _params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const newSlide = presentationService.addSlide();

        return {
            success: true,
            data: {
                slideId: newSlide.id,
                message: `New slide created successfully`,
            },
            editedSlidesIds: [newSlide.id],
        };
    }
}
