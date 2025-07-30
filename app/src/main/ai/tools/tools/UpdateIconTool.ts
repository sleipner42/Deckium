import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { Icon } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class UpdateIconTool extends BaseTool {
    name = 'updateIcon';
    description = 'Update an existing icon element on a slide';
    requiredParams = {
        elementId: 'The ID of the icon element to update',
    };
    optionalParams = {
        x: 'New X position',
        y: 'New Y position',
        size: 'New size',
        color: 'New color',
        zIndex: 'The new z-index value',
    };
    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId, x, y, size, color, zIndex } = params;
        if (!elementId)
            return { success: false, error: 'elementId is required' };
        const currentPresentation = presentationService.getPresentation();
        let foundElement = null;
        let slideId = null;
        for (const slide of currentPresentation.slides) {
            const element = slide.elements.find((e) => e.id === elementId);
            if (element) {
                foundElement = element;
                slideId = slide.id;
                break;
            }
        }
        if (!foundElement)
            return {
                success: false,
                error: `Element with ID ${elementId} not found`,
            };
        if (foundElement.type !== 'icon')
            return {
                success: false,
                error: `Element with ID ${elementId} is not an icon`,
            };
        const icon = foundElement as Icon;
        const updates: Partial<Icon> = {};
        if (x !== undefined || y !== undefined) {
            updates.position = {
                x: x !== undefined ? Number(x) : icon.position.x,
                y: y !== undefined ? Number(y) : icon.position.y,
            };
        }
        if (size !== undefined) updates.size = Number(size);
        if (color !== undefined) updates.color = color;
        if (zIndex !== undefined) (updates as any).zIndex = Number(zIndex);
        if (Object.keys(updates).length === 0) {
            return {
                success: true,
                data: { message: 'No updates were requested' },
            };
        }
        const updatedElement = presentationService.updateElement(
            elementId,
            updates,
        );
        if (!updatedElement)
            return {
                success: false,
                error: `Failed to update icon with ID ${elementId}`,
            };
        return {
            success: true,
            data: {
                elementId,
                message: 'Icon updated successfully',
                updates,
            },
            editedSlidesIds: slideId ? [slideId] : [],
        };
    }
}
