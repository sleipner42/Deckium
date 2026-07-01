import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export class GenerateImageTool extends BaseTool {
    name = 'generateImage';

    description =
        'Generate a brand-new image with the Gemini Nano Banana image model from a text prompt and place it on a slide. Use this to create custom illustrations, backgrounds, icons, or photos instead of searching stock photos.';

    requiredParams = {
        slideId: 'The ID of the slide to add the generated image to',
        prompt: 'A detailed description of the image to generate (subject, style, colors, composition)',
        x: 'The horizontal position in pixels of the top-left corner',
        y: 'The vertical position in pixels of the top-left corner',
    };

    optionalParams = {
        width: 'The width of the image element in pixels (defaults to 400)',
        height: 'The height of the image element in pixels (defaults to 400)',
        zIndex: 'The stacking order of the image (defaults to 1)',
    };

    inputSchema = z.object({
        slideId: z
            .string()
            .describe('The ID of the slide to add the generated image to'),
        prompt: z
            .string()
            .describe(
                'A detailed description of the image to generate (subject, style, colors, composition)',
            ),
        x: z
            .number()
            .describe(
                'The horizontal position in pixels of the top-left corner',
            ),
        y: z
            .number()
            .describe('The vertical position in pixels of the top-left corner'),
        width: z
            .number()
            .optional()
            .describe(
                'The width of the image element in pixels (defaults to 400)',
            ),
        height: z
            .number()
            .optional()
            .describe(
                'The height of the image element in pixels (defaults to 400)',
            ),
        zIndex: z
            .number()
            .optional()
            .describe('The stacking order of the image (defaults to 1)'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, prompt, x, y } = params;

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: 'Image generation is not configured. Set GEMINI_API_KEY in the environment.',
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
                error: `Slide with ID ${slideId} not found`,
            };
        }

        const model = createGoogleGenerativeAI({ apiKey })(IMAGE_MODEL);
        const result = await generateText({
            model,
            prompt,
            providerOptions: {
                google: { responseModalities: ['IMAGE'] },
            },
        });

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
        const width = Number(params.width) || 400;
        const height = Number(params.height) || 400;
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
