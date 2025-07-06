import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { Shape } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class UpdateShapeTool extends BaseTool {
    name = 'updateShape';

    description = 'Update an existing shape element on a slide';

    requiredParams = {
        elementId: 'The ID of the shape element to update',
        x: 'New X position (optional)',
        y: 'New Y position (optional)',
        width: 'New width (optional)',
        height: 'New height (optional)',
        fillColor: 'New fill color (optional)',
        strokeColor: 'New stroke/border color (optional)',
        strokeWidth: 'New stroke/border width (optional)',
        zIndex: 'The new z-index value (optional) - controls stacking order with higher values appearing on top',
        rotation: 'The rotation angle in degrees (optional, defaults to 0)',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            elementId,
            x,
            y,
            width,
            height,
            fillColor,
            strokeColor,
            strokeWidth,
            zIndex,
            rotation,
        } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        // Find the element to ensure it's a shape
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

        if (!foundElement) {
            return {
                success: false,
                error: `Element with ID ${elementId} not found`,
            };
        }

        if (!['rectangle', 'circle', 'triangle'].includes(foundElement.type)) {
            return {
                success: false,
                error: `Element with ID ${elementId} is not a shape`,
            };
        }

        const shape = foundElement as Shape;
        const updates: Partial<Shape> = {};

        // Process position updates
        if (x !== undefined || y !== undefined) {
            updates.position = {
                x: x !== undefined ? Number(x) : shape.position.x,
                y: y !== undefined ? Number(y) : shape.position.y,
            };
        }

        // Process size updates
        if (width !== undefined || height !== undefined) {
            updates.size = {
                width: width !== undefined ? Number(width) : shape.size.width,
                height:
                    height !== undefined ? Number(height) : shape.size.height,
            };
        }

        // Process other property updates
        if (fillColor !== undefined) {
            updates.fillColor = fillColor;
        }

        if (strokeColor !== undefined) {
            updates.strokeColor = strokeColor;
        }

        if (strokeWidth !== undefined) {
            updates.strokeWidth = Number(strokeWidth);
        }

        if (zIndex !== undefined) {
            updates.zIndex = Number(zIndex);
        }

        if (rotation !== undefined) {
            updates.rotation = Number(rotation);
        }

        // If no updates were requested, return success
        if (Object.keys(updates).length === 0) {
            return {
                success: true,
                data: {
                    message: 'No updates were requested',
                },
            };
        }

        // Update the element first
        const updatedElement = presentationService.updateElement(
            elementId,
            updates,
        );

        if (!updatedElement) {
            return {
                success: false,
                error: `Failed to update shape with ID ${elementId}`,
            };
        }

        const message = 'Shape updated successfully';

        return {
            success: true,
            data: {
                elementId,
                message,
                updates,
            },
            editedSlidesIds: slideId ? [slideId] : [],
        };
    }
}
