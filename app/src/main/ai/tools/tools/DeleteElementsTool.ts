import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { findElement } from '../utils/find-element';

export class DeleteElementsTool extends BaseTool {
    name = 'deleteElements';

    description =
        'Delete multiple elements at once by their IDs. Elements can live on different slides. Use deleteElement for a single element.';

    inputSchema = z.object({
        elementIds: z
            .array(z.string())
            .min(1)
            .describe('IDs of the elements to delete'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementIds } = params;

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

        const deleted: Array<{ elementId: string; type: string }> = [];
        const notFound: string[] = [];
        const editedSlideIds = new Set<string>();

        for (const elementId of elementIds) {
            const presentation = presentationService.getPresentation();
            const found = findElement(presentation, elementId);

            if (!found) {
                notFound.push(elementId);
                continue;
            }

            const updatedSlide = presentationService.deleteElement(elementId);
            if (updatedSlide) {
                deleted.push({ elementId, type: found.element.type });
                editedSlideIds.add(found.slideId);
            } else {
                notFound.push(elementId);
            }
        }

        if (deleted.length === 0) {
            return {
                success: false,
                error: `None of the elements were found: ${notFound.join(', ')}`,
            };
        }

        const summary = `Deleted ${deleted.length} element(s): ${deleted
            .map((d) => `${d.elementId} (${d.type})`)
            .join(
                ', ',
            )}.${notFound.length > 0 ? ` Not found (skipped): ${notFound.join(', ')}.` : ''}`;

        return {
            success: true,
            data: {
                deleted,
                notFound,
                message: summary,
            },
            editedSlidesIds: [...editedSlideIds],
        };
    }
}
