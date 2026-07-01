import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { cloneElements } from '../../../../common/domain/entities/element-factory';
import { ContentElement } from '../../../../common/domain/entities/types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class CopyElementsTool extends BaseTool {
    name = 'copyElements';

    description =
        'Copy specific elements to a target slide. Requires the target slide ID and a list of element IDs to copy.';

    requiredParams = {
        targetSlideId: 'The ID of the slide where elements should be copied to',
        elementIds: 'Array of element IDs to copy (must not be empty)',
    };

    optionalParams = {
        positionOffset:
            'Offset to apply to copied elements position. Default is {x: 0, y: 0}',
    };

    inputSchema = z.object({
        targetSlideId: z
            .string()
            .describe('The ID of the slide where elements should be copied to'),
        elementIds: z
            .array(z.string())
            .describe('Array of element IDs to copy (must not be empty)'),
        positionOffset: z
            .object({
                x: z.number(),
                y: z.number(),
            })
            .describe(
                'Offset to apply to copied elements position. Default is {x: 0, y: 0}',
            )
            .optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { targetSlideId, elementIds, positionOffset } = params;

        if (!targetSlideId) {
            return {
                success: false,
                error: 'targetSlideId is required',
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
            (s) => s.id === targetSlideId,
        );
        if (!targetSlide) {
            return {
                success: false,
                error: `Target slide with ID ${targetSlideId} not found`,
            };
        }

        // Find elements to copy from anywhere in the presentation
        const elementsToCopy: ContentElement[] = [];
        const sourceSlideIds: string[] = [];

        for (const elementId of elementIds) {
            let foundElement: ContentElement | null = null;
            let foundSlideId: string | null = null;

            // Search for the element across all slides
            for (const slide of currentPresentation.slides) {
                const element = slide.elements.find((e) => e.id === elementId);
                if (element) {
                    foundElement = element;
                    foundSlideId = slide.id;
                    break;
                }
            }

            if (foundElement && foundSlideId) {
                elementsToCopy.push(foundElement);
                if (!sourceSlideIds.includes(foundSlideId)) {
                    sourceSlideIds.push(foundSlideId);
                }
            } else {
                return {
                    success: false,
                    error: `Element with ID ${elementId} not found in any slide`,
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
                targetSlideId,
                clonedElement,
            );
            if (!updatedSlide) {
                return {
                    success: false,
                    error: `Failed to add element to slide ${targetSlideId}`,
                };
            }
        }

        const copiedElementTypes = elementsToCopy.map((e) => e.type);
        const message = `Copied ${elementsToCopy.length} elements (${copiedElementTypes.join(', ')}) to slide`;

        return {
            success: true,
            data: {
                targetSlideId,
                sourceSlideIds,
                copiedElementsCount: clonedElements.length,
                copiedElementTypes,
                copiedElementIds: elementIds,
                message,
            },
            editedSlidesIds: [targetSlideId],
        };
    }
}
