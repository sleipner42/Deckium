import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementNotFoundInPresentation } from '../utils/errors';
import { findElement } from '../utils/find-element';

export class DeleteElementTool extends BaseTool {
    name = 'deleteElement';

    description = 'Delete an element from a slide';

    inputSchema = z.object({
        elementId: z.string().describe('The ID of the element to delete'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        // Find the element first to check if it exists and get its details
        const currentPresentation = presentationService.getPresentation();
        const found = findElement(currentPresentation, elementId);

        if (!found) {
            return {
                success: false,
                error: elementNotFoundInPresentation(
                    elementId,
                    currentPresentation,
                ),
            };
        }

        const targetElement = found.element;
        const slideId = found.slideId;

        // Delete the element
        const updatedSlide = presentationService.deleteElement(elementId);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to delete element with ID ${elementId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId,
                slideId: updatedSlide.id,
                elementType: targetElement.type,
                message: `${targetElement.type} element deleted successfully`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
