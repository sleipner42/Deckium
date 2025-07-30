import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createIcon } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class CreateIconTool extends BaseTool {
    name = 'createIcon';
    description =
        'Create a FontAwesome icon element on a slide. The icon will be centered at the given position.';
    requiredParams = {
        slideId: 'The ID of the slide to add the icon to',
        iconName: 'The FontAwesome icon name (e.g., fa-solid fa-star)',
    };
    optionalParams = {
        x: 'Center X position of the icon (defaults to 100)',
        y: 'Center Y position of the icon (defaults to 100)',
        size: 'Size of the icon (defaults to 48)',
        color: 'Color of the icon (defaults to #000000)',
        zIndex: 'The z-index of the element for stacking order (defaults to 1)',
    };
    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, iconName, x, y, size, color, zIndex } = params;
        if (!slideId) return { success: false, error: 'slideId is required' };
        if (!iconName) return { success: false, error: 'iconName is required' };
        const sizeValue = Number(size) || 48;
        let xPos = x !== undefined ? Number(x) : 100;
        let yPos = y !== undefined ? Number(y) : 100;
        xPos -= sizeValue / 2;
        yPos -= sizeValue / 2;
        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide)
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        const element = createIcon({
            iconName,
            position: { x: xPos, y: yPos },
            size: sizeValue,
            color: color || '#000000',
        });
        const updatedSlide = presentationService.addElement(slideId, element);
        if (!updatedSlide)
            return {
                success: false,
                error: `Failed to add icon to slide with ID ${slideId}`,
            };
        return {
            success: true,
            data: {
                elementId: element.id,
                message: 'Icon added successfully',
                iconInfo: {
                    iconName,
                    position: { x: xPos, y: yPos },
                    size: sizeValue,
                    color: color || '#000000',
                },
            },
            editedSlidesIds: [slideId],
        };
    }
}
