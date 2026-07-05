import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { cloneElements } from '../../../../common/domain/entities/element-factory';
import { ContentElement } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { elementNotFoundInPresentation, slideNotFound } from '../utils/errors';
import { findElement } from '../utils/find-element';
import { elementIdsSchema } from '../utils/schemas';

export class CopyElementsTool extends BaseTool {
    name = 'copyElements';

    description =
        'Copy specific elements to a target slide. Requires the target slide ID and a list of element IDs to copy.';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide where elements should be copied to'),
        elementIds: elementIdsSchema.describe(
            'Array of element IDs to copy (must not be empty)',
        ),
        positionOffset: z
            .object({
                x: z.number(),
                y: z.number(),
            })
            .describe(
                'Offset in pixels to apply to the position of copied elements. Default is {x: 0, y: 0}',
            )
            .optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, elementIds, positionOffset } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (
            !elementIds ||
            !Array.isArray(elementIds) ||
            elementIds.length === 0
        ) {
            return {
                success: false,
                error: 'elementIds is required and must be a non-empty array',
            };
        }

        const currentPresentation = presentationService.getPresentation();

        // Find target slide
        const targetSlide = currentPresentation.slides.find(
            (s) => s.id === slideId,
        );
        if (!targetSlide) {
            return {
                success: false,
                error: slideNotFound(slideId, currentPresentation),
            };
        }

        // Find elements to copy from anywhere in the presentation
        const elementsToCopy: ContentElement[] = [];
        const sourceSlideIds: string[] = [];

        for (const elementId of elementIds) {
            const found = findElement(currentPresentation, elementId);

            if (found) {
                elementsToCopy.push(found.element);
                if (!sourceSlideIds.includes(found.slideId)) {
                    sourceSlideIds.push(found.slideId);
                }
            } else {
                return {
                    success: false,
                    error: elementNotFoundInPresentation(
                        elementId,
                        currentPresentation,
                    ),
                };
            }
        }

        if (elementsToCopy.length === 0) {
            return {
                success: false,
                error: 'No elements to copy',
            };
        }

        // Clone elements with new IDs and position offset
        const offset = positionOffset || { x: 0, y: 0 };
        const clonedElements = cloneElements(elementsToCopy, offset);

        // Add cloned elements to target slide
        for (const clonedElement of clonedElements) {
            const updatedSlide = presentationService.addElement(
                slideId,
                clonedElement,
            );
            if (!updatedSlide) {
                return {
                    success: false,
                    error: `Failed to add element to slide ${slideId}`,
                };
            }
        }

        const copiedElementTypes = elementsToCopy.map((e) => e.type);
        const message = `Copied ${elementsToCopy.length} elements (${copiedElementTypes.join(', ')}) to slide`;

        return {
            success: true,
            data: {
                slideId,
                sourceSlideIds,
                copiedElementsCount: clonedElements.length,
                copiedElementTypes,
                sourceElementIds: elementIds,
                newElementIds: clonedElements.map((element) => element.id),
                message,
            },
            editedSlidesIds: [slideId],
        };
    }
}
