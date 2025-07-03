import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createShape } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class CreateShapeTool extends BaseTool {
    name = 'createShape';

    description =
        'Create a shape element (rectangle, circle, or triangle) on a slide';

    requiredParams = {
        slideId: 'The ID of the slide to add the shape to',
        shapeType:
            'The type of shape to create (rectangle, circle, or triangle)',
        x: 'X position of the element (optional, defaults to 100)',
        y: 'Y position of the element (optional, defaults to 100)',
        positionReference:
            'The reference position of the element (optional, defaults to top left), choose from top left or center',
        width: 'The width of the element (optional, defaults to 150)',
        height: 'The height of the element (optional, defaults to 150)',
        fillColor: 'The fill color of the shape (optional, defaults to white)',
        strokeColor:
            'The stroke/border color of the shape (optional, defaults to black)',
        strokeWidth:
            'The stroke/border width of the shape (optional, defaults to 2)',
        zIndex: 'The z-index of the element for stacking order (optional, defaults to 1)',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            shapeType,
            x,
            y,
            positionReference,
            width,
            height,
            fillColor,
            strokeColor,
            strokeWidth,
            zIndex,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (
            !shapeType ||
            !['rectangle', 'circle', 'triangle'].includes(shapeType)
        ) {
            return {
                success: false,
                error: 'shapeType is required and must be one of: rectangle, circle, triangle',
            };
        }

        const widthValue = Number(width) || 150;
        const heightValue = Number(height) || 150;

        let xPos = x !== undefined ? Number(x) : 100;
        let yPos = y !== undefined ? Number(y) : 100;

        if (positionReference === 'center') {
            xPos -= widthValue / 2;
            yPos -= heightValue / 2;
        }

        // Get the current slide to check for overlaps
        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        const element = createShape({
            shapeType: shapeType as 'rectangle' | 'circle' | 'triangle',
            position: { x: xPos, y: yPos },
            size: {
                width: widthValue,
                height: heightValue,
            },
            fillColor: fillColor || '#FFFFFF',
            strokeColor: strokeColor || '#000000',
            strokeWidth: Number(strokeWidth) || 2,
            zIndex: zIndex !== undefined ? Number(zIndex) : 1,
        });

        const updatedSlide = presentationService.addElement(slideId, element);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add shape to slide with ID ${slideId}`,
            };
        }

        const message = `${shapeType} shape added successfully`;

        return {
            success: true,
            data: {
                elementId: element.id,
                message,
                shapeInfo: {
                    type: shapeType,
                    position: { x: xPos, y: yPos },
                    size: {
                        width: widthValue,
                        height: heightValue,
                    },
                    fillColor: fillColor || '#FFFFFF',
                    strokeColor: strokeColor || '#000000',
                    strokeWidth: Number(strokeWidth) || 2,
                },
            },
            editedSlidesIds: [slideId],
        };
    }
}
