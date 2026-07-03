import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import type { ToolServices } from '../AITool';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import {
    heightSchema,
    widthSchema,
    xSchema,
    ySchema,
    zIndexSchema,
} from '../utils/schemas';

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export class GenerateImageTool extends BaseTool {
    name = 'generateImage';

    description =
        'Generate a brand-new image with the Gemini Nano Banana image model from a text prompt and place it on a slide. Use this to create custom illustrations, backgrounds, icons, or photos instead of searching stock photos.';

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to add the generated image to'),
        prompt: z
            .string()
            .describe(
                'A detailed description of the image to generate (subject, style, colors, composition)',
            ),
        x: xSchema(" of the image's top-left corner"),
        y: ySchema(" of the image's top-left corner"),
        width: widthSchema(' (defaults to 400)').optional(),
        height: heightSchema(' (defaults to 400)').optional(),
        zIndex: zIndexSchema.optional(),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
        services?: ToolServices,
    ): Promise<AIToolResult> {
        const { slideId, prompt, x, y } = params;

        const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY ||
            services?.settings?.getProviderSettings('google')?.apiKey;
        if (!apiKey) {
            return {
                success: false,
                error: 'Image generation is not configured. Add a Google AI API key in Settings (LLM provider "Google AI") or set GEMINI_API_KEY in the environment.',
            };
        }

        if (!slideId || !prompt) {
            return {
                success: false,
                error: 'slideId and prompt are required',
            };
        }

        if (x === undefined || y === undefined) {
            return {
                success: false,
                error: 'Both x and y position coordinates are required',
            };
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            return {
                success: false,
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        const model = createGoogleGenerativeAI({ apiKey })(IMAGE_MODEL);
        let result: Awaited<ReturnType<typeof generateText>>;
        try {
            result = await generateText({
                model,
                prompt,
                providerOptions: {
                    google: { responseModalities: ['IMAGE'] },
                },
            });
        } catch (error) {
            const detail =
                error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Image generation failed (${IMAGE_MODEL}): ${detail}. This is usually an invalid API key, exhausted quota, or a network problem — the slide was not changed.`,
            };
        }

        const imageFile = result.files.find((file) =>
            file.mediaType?.startsWith('image/'),
        );
        if (!imageFile) {
            return {
                success: false,
                error: 'The model did not return an image. Try a more specific prompt.',
            };
        }

        const dataUrl = `data:${imageFile.mediaType};base64,${imageFile.base64}`;
        const width = params.width !== undefined ? Number(params.width) : 400;
        const height =
            params.height !== undefined ? Number(params.height) : 400;
        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;

        const element = createImage({
            content: dataUrl,
            position: { x: Number(x), y: Number(y) },
            size: { width, height },
            zIndex,
        });

        const updatedSlide = presentationService.addElement(slideId, element);
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add generated image to slide ${slideId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId: updatedSlide.id,
                prompt,
                model: IMAGE_MODEL,
                message: `Generated image added at (${Number(x)}, ${Number(y)}) with size ${width}x${height}.`,
            },
            editedSlidesIds: [updatedSlide.id],
        };
    }
}
