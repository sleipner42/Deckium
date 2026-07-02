import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class AddLogoTool extends BaseTool {
    name = 'addLogo';

    description =
        "Add a real company or brand logo to a slide by its website domain (e.g. 'ikea.com', 'spotify.com', 'volvocars.com'). Use this whenever a slide mentions a real company, product, or brand - logos look far more professional than plain text.";

    requiredParams = {
        slideId: 'The ID of the slide to add the logo to',
        domain: "The company's website domain, e.g. 'ikea.com' or 'spotify.com'",
        x: 'The horizontal position in pixels of the top-left corner',
        y: 'The vertical position in pixels of the top-left corner',
    };

    optionalParams = {
        size: 'The width and height of the square logo in pixels (defaults to 64)',
        zIndex: 'The stacking order of the logo (defaults to 1)',
    };

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the logo to'),
        domain: z
            .string()
            .describe("The company's website domain, e.g. 'ikea.com'"),
        x: z
            .number()
            .describe(
                'The horizontal position in pixels of the top-left corner',
            ),
        y: z
            .number()
            .describe('The vertical position in pixels of the top-left corner'),
        size: z
            .number()
            .optional()
            .describe(
                'The width and height of the square logo in pixels (defaults to 64)',
            ),
        zIndex: z
            .number()
            .optional()
            .describe('The stacking order of the logo (defaults to 1)'),
    });

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { slideId, domain, x, y } = params;

        if (!slideId || !domain) {
            return { success: false, error: 'slideId and domain are required' };
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

        const normalizedDomain = normalizeDomain(domain);
        const size = Number(params.size) || 64;
        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;
        const logoUrl = `https://www.google.com/s2/favicons?domain=${normalizedDomain}&sz=128`;

        const element = createImage({
            content: logoUrl,
            position: { x: Number(x), y: Number(y) },
            size: { width: size, height: size },
            zIndex,
        });

        const updatedSlide = presentationService.addElement(slideId, element);
        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add logo to slide ${slideId}`,
            };
        }

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId: updatedSlide.id,
                domain: normalizedDomain,
                message: `Added ${normalizedDomain} logo at (${Number(x)}, ${Number(y)}) sized ${size}x${size}.`,
            },
            editedSlidesIds: [updatedSlide.id],
        };
    }
}

function normalizeDomain(input: string): string {
    let domain = input.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    domain = domain.split('/')[0].split('?')[0];
    if (!domain.includes('.')) {
        domain = `${domain}.com`;
    }
    return domain;
}
