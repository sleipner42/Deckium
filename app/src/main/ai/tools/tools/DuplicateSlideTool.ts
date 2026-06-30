import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class DuplicateSlideTool extends BaseTool {
    name = 'duplicateSlide';

    description =
        'Duplicate an existing slide with all its elements, creating new IDs for the slide and all elements';

    requiredParams = {
        slideId: 'The ID of the slide to duplicate',
    };

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to duplicate'),
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

        // Check if the slide exists
        const presentation = presentationService.getPresentation();
        const originalSlide = presentation.slides.find((s) => s.id === slideId);

        if (!originalSlide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        const duplicatedSlide = presentationService.duplicateSlide(slideId);

        if (!duplicatedSlide) {
            return {
                success: false,
                error: `Failed to duplicate slide with ID ${slideId}`,
            };
        }

        return {
            success: true,
            data: {
                slideId: duplicatedSlide.id,
                originalSlideId: slideId,
                message: `Slide duplicated successfully with ${duplicatedSlide.elements.length} elements`,
                slideInfo: {
                    id: duplicatedSlide.id,
                    background: duplicatedSlide.background,
                    transition: duplicatedSlide.transition,
                    elementCount: duplicatedSlide.elements.length,
                    elements: duplicatedSlide.elements.map((element) => ({
                        id: element.id,
                        type: element.type,
                        position: element.position,
                        size: element.size,
                        zIndex: element.zIndex,
                        // Include type-specific properties
                        ...(element.type === 'textbox' && {
                            content: (element as any).content,
                            color: (element as any).color,
                        }),
                        ...(element.type === 'image' && {
                            content: (element as any).content,
                        }),
                        ...(element.type === 'shape' && {
                            shapeType: (element as any).shapeType,
                            fillColor: (element as any).fillColor,
                            strokeColor: (element as any).strokeColor,
                            strokeWidth: (element as any).strokeWidth,
                        }),
                        ...(element.type === 'barChart' && {
                            title: (element as any).title,
                            xAxisLabel: (element as any).xAxisLabel,
                            yAxisLabel: (element as any).yAxisLabel,
                            data: (element as any).data,
                        }),
                    })),
                },
            },
            editedSlidesIds: [duplicatedSlide.id],
        };
    }
}
