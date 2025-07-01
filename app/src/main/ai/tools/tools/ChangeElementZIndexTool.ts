import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class ChangeElementZIndexTool extends BaseTool {
    name = 'changeElementZIndex';

    description =
        'Change the z-index of an element to control its stacking order (which elements appear on top of others)';

    requiredParams = {
        slideId: 'The ID of the slide containing the element',
        elementId: 'The ID of the element to change the z-index of',
        zIndex: 'The new z-index value (higher values appear on top, default is 1). Good values: 0 for background, 1-4 for regular content, 5+ for headers/important elements',
        relative:
            'Optional: set to true to make the change relative to current z-index (e.g., +1, -2). This is useful for bringing an element forward or backward in the stack',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, elementId, zIndex, relative } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        if (zIndex === undefined || zIndex === null) {
            return {
                success: false,
                error: 'zIndex is required',
            };
        }

        // Get the current slide
        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        // Find the element
        const element = slide.elements.find((e) => e.id === elementId);

        if (!element) {
            return {
                success: false,
                error: `Element with ID ${elementId} not found on slide ${slideId}`,
            };
        }

        let newZIndex: number;
        const isRelative = relative === true || relative === 'true';
        const currentZIndex = element.zIndex || 1;

        if (isRelative) {
            // Parse as a delta value (can be negative or positive)
            const deltaZIndex = Number(zIndex);
            if (isNaN(deltaZIndex)) {
                return {
                    success: false,
                    error: 'zIndex must be a number when using relative mode',
                };
            }
            newZIndex = currentZIndex + deltaZIndex;
        } else {
            // Parse as absolute value
            newZIndex = Number(zIndex);
            if (isNaN(newZIndex)) {
                return {
                    success: false,
                    error: 'zIndex must be a number',
                };
            }
        }

        // Make sure z-index is at least 0
        newZIndex = Math.max(0, newZIndex);

        // Update the element with the new z-index
        const updatedElement = presentationService.updateElement(elementId, {
            zIndex: newZIndex,
        });

        if (!updatedElement) {
            return {
                success: false,
                error: `Failed to update z-index for element ${elementId}`,
            };
        }

        // Provide helpful context about what this z-index change means
        let stackingInfo = '';
        if (newZIndex > 10) {
            stackingInfo =
                'This element will appear on top of virtually all other elements.';
        } else if (newZIndex >= 5) {
            stackingInfo =
                'This element will appear on top of most content (good for headers and important content).';
        } else if (newZIndex > 1) {
            stackingInfo =
                'This element will appear above elements with default z-index.';
        } else if (newZIndex === 1) {
            stackingInfo = 'This is the default z-index value.';
        } else if (newZIndex === 0) {
            stackingInfo =
                'This element will appear behind most content (good for backgrounds).';
        } else if (newZIndex < 0) {
            stackingInfo =
                'This element will appear behind all elements with non-negative z-index.';
        }

        return {
            success: true,
            data: {
                elementId,
                previousZIndex: currentZIndex,
                newZIndex,
                message: `Changed z-index of element ${elementId} from ${currentZIndex} to ${newZIndex}. ${stackingInfo}\n\nElements with higher z-index values appear on top of elements with lower z-index values.`,
            },
            editedSlidesIds: [slideId],
        };
    }
}
