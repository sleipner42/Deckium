import { type ToolSet, tool } from 'ai';
import type { AIToolResult } from '../../../common/domain/entities/ai-types';
import type { LintingService } from '../../linting/service';
import type { PresentationService } from '../../presentation/service';
import { generateSlideGrid } from '../../presentation/utils';
import type { AIToolsService } from './tools';

export type ToolEventListener = (
    toolName: string,
    params: Record<string, unknown>,
    result: AIToolResult,
) => void;

interface ToolModelOutput {
    text: string;
    screenshot?: string;
}

export function buildToolSet(
    toolsService: AIToolsService,
    presentationService: PresentationService,
    lintingService: LintingService,
    onToolEvent?: ToolEventListener,
): ToolSet {
    const toolSet: ToolSet = {};

    for (const aiTool of toolsService.getTools()) {
        toolSet[aiTool.name] = tool({
            description: aiTool.description,
            inputSchema: aiTool.inputSchema,
            execute: async (params: any) => {
                const result = await aiTool.execute(
                    params,
                    presentationService,
                );
                onToolEvent?.(aiTool.name, params, result);

                const feedback = await buildFeedback(
                    result,
                    presentationService,
                    lintingService,
                );

                const output: ToolModelOutput = {
                    text: formatResultText(aiTool.name, result, feedback),
                    screenshot: result.success ? result.screenshot : undefined,
                };
                return output;
            },
            toModelOutput: (output: ToolModelOutput) => {
                if (output.screenshot) {
                    return {
                        type: 'content',
                        value: [
                            { type: 'text', text: output.text },
                            mediaPartFromDataUrl(output.screenshot),
                        ],
                    };
                }
                return { type: 'text', value: output.text };
            },
        });
    }

    return toolSet;
}

function formatResultText(
    toolName: string,
    result: AIToolResult,
    feedback: string,
): string {
    if (!result.success) {
        return `${toolName} failed: ${result.error ?? 'Unknown error'}`;
    }

    const data =
        result.data !== undefined
            ? ` Result: ${JSON.stringify(result.data)}`
            : '';
    return `${toolName} succeeded.${data}${feedback}`;
}

async function buildFeedback(
    result: AIToolResult,
    presentationService: PresentationService,
    lintingService: LintingService,
): Promise<string> {
    const editedSlideIds = result.editedSlidesIds ?? [];
    if (!result.success || editedSlideIds.length === 0) {
        return '';
    }

    const presentation = presentationService.getPresentation();
    const parts: string[] = [];

    const grids = editedSlideIds
        .map((slideId) => {
            const slide = presentation.slides.find((s) => s.id === slideId);
            return slide
                ? generateSlideGrid(slide, { pixelsPerSquare: 20 })
                : '';
        })
        .filter((grid) => grid.length > 0);

    if (grids.length > 0) {
        parts.push(`Updated slides visual representation:\n\n${grids.join('\n\n')}`);
    }

    const lintingMessage = await lintEditedSlides(
        editedSlideIds,
        presentation,
        lintingService,
    );
    if (lintingMessage) {
        parts.push(lintingMessage);
    }

    return parts.length > 0 ? `\n\n${parts.join('\n\n')}` : '';
}

async function lintEditedSlides(
    editedSlideIds: string[],
    presentation: ReturnType<PresentationService['getPresentation']>,
    lintingService: LintingService,
): Promise<string> {
    const lintingResults = [];
    for (const slideId of editedSlideIds) {
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) continue;
        try {
            lintingResults.push(await lintingService.lintSlide(slide));
        } catch (error) {
            console.warn(`Failed to lint slide ${slideId}:`, error);
        }
    }

    if (lintingResults.length === 0) {
        return '';
    }

    const hasErrors = lintingResults.some((lintResult) => lintResult.hasErrors);
    if (!hasErrors) {
        return 'Linting passed - no issues found with the updated slides.';
    }

    const errorMessages = lintingResults
        .filter((lintResult) => lintResult.hasErrors)
        .map((lintResult) => {
            const slideErrors = lintResult.errors
                .map(
                    (error: { message: string; suggestedFix?: string }) =>
                        `- ${error.message}${error.suggestedFix ? ` (Suggestion: ${error.suggestedFix})` : ''}`,
                )
                .join('\n');
            return `Slide ${lintResult.slideId}:\n${slideErrors}`;
        });

    return `Linting found issues that must be fixed:\n\n${errorMessages.join('\n\n')}`;
}

function mediaPartFromDataUrl(dataUrl: string): {
    type: 'media';
    data: string;
    mediaType: string;
} {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
        return { type: 'media', data: match[2], mediaType: match[1] };
    }
    return { type: 'media', data: dataUrl, mediaType: 'image/png' };
}
