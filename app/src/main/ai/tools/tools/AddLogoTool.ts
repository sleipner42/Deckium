import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createImage } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { slideNotFound } from '../utils/errors';
import { fetchImage, probeDimensions } from '../utils/image-probe';
import { xSchema, ySchema, zIndexSchema } from '../utils/schemas';

function faviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// The favicon service answers unknown domains with a generic globe icon
// instead of an error. To tell "real logo" from "globe", we fetch the icon
// for a domain that certainly does not exist once and remember its hash.
let defaultIconHash: string | null | undefined;

async function getDefaultIconHash(): Promise<string | null> {
    if (defaultIconHash !== undefined) {
        return defaultIconHash;
    }
    const fetched = await fetchImage(
        faviconUrl('this-domain-does-not-exist-a7f3k9.com'),
    );
    defaultIconHash =
        fetched.ok && fetched.buffer
            ? createHash('sha1').update(fetched.buffer).digest('hex')
            : null;
    return defaultIconHash;
}

export class AddLogoTool extends BaseTool {
    name = 'addLogo';

    description =
        "Add a real company or brand logo to a slide by its website domain (e.g. 'ikea.com', 'spotify.com', 'volvocars.com'). Use this whenever a slide mentions a real company, product, or brand - logos look far more professional than plain text.";

    inputSchema = z.object({
        slideId: z.string().describe('The ID of the slide to add the logo to'),
        domain: z
            .string()
            .describe("The company's website domain, e.g. 'ikea.com'"),
        x: xSchema(" of the logo's top-left corner"),
        y: ySchema(" of the logo's top-left corner"),
        size: z
            .number()
            .optional()
            .describe(
                'The width and height of the square logo in pixels (defaults to 64)',
            ),
        zIndex: zIndexSchema.optional(),
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
                error: slideNotFound(
                    slideId,
                    presentationService.getPresentation(),
                ),
            };
        }

        const normalizedDomain = normalizeDomain(domain);
        const size = params.size !== undefined ? Number(params.size) : 64;
        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;
        const logoUrl = faviconUrl(normalizedDomain);

        const fetched = await fetchImage(logoUrl);
        if (!fetched.ok || !fetched.buffer) {
            return {
                success: false,
                error: `Could not fetch a logo for '${normalizedDomain}' (${fetched.statusText ?? 'network error'}). Check the domain or use generateImage/text instead.`,
            };
        }

        const [logoHash, defaultHash] = [
            createHash('sha1').update(fetched.buffer).digest('hex'),
            await getDefaultIconHash(),
        ];
        if (defaultHash !== null && logoHash === defaultHash) {
            return {
                success: false,
                error: `No logo found for '${normalizedDomain}' — the favicon service returned its generic default icon, which would look wrong on the slide. Check the domain spelling (e.g. 'ikea.com') or use generateImage instead.`,
            };
        }

        const iconDimensions = probeDimensions(fetched.buffer);

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
                message: `Added ${normalizedDomain} logo at (${Number(x)}, ${Number(y)}) sized ${size}x${size}${iconDimensions ? ` (source icon ${iconDimensions.width}x${iconDimensions.height}px)` : ''}.`,
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
