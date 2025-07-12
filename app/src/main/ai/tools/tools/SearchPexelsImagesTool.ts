import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import AuthService from '../../../auth/service';
import {
    PexelsBackendService,
    type PexelsSearchRequest,
} from '../../external/pexels-backend-service';
import { BaseTool } from '../BaseTool';

export class SearchPexelsImagesTool extends BaseTool {
    name = 'searchPexelsImages';

    description =
        'Search for high-quality stock images using Pexels API and return multiple image options with detailed metadata. Use this to find images before deciding which one to add to the presentation, using the addImageFromUrl tool.';

    requiredParams = {
        query: 'The search terms to find relevant images (e.g., "sunset beach", "business meeting", "oil refinery middle east")',
    };

    optionalParams = {
        count: 'Number of image results to return (1-15, defaults to 10)',
        orientation:
            'Filter images by aspect ratio - "landscape" for wide images, "portrait" for tall images, "square" for equal dimensions. Leave empty to allow any orientation.',
        min_width:
            'Minimum image width in pixels (useful for ensuring quality)',
        min_height:
            'Minimum image height in pixels (useful for ensuring quality)',
        color: 'Filter by dominant color (e.g., "red", "blue", "green", "black", "white")',
    };

    private pexelsService: PexelsBackendService;

    constructor(authService?: AuthService) {
        super();
        const auth = authService || new AuthService();
        this.pexelsService = new PexelsBackendService(auth);
    }

    protected async executeImpl(
        params: Record<string, any>,
    ): Promise<AIToolResult> {
        try {
            const {
                query,
                count = 10,
                orientation,
                min_width,
                min_height,
                color,
            } = params;

            if (!query) {
                return {
                    success: false,
                    error: 'Search query is required',
                };
            }

            // Validate parameters
            const requestedCount = Number(count);
            if (
                isNaN(requestedCount) ||
                requestedCount < 1 ||
                requestedCount > 15
            ) {
                return {
                    success: false,
                    error: 'Count must be a number between 1 and 15',
                };
            }

            if (orientation) {
                const validOrientations = ['landscape', 'portrait', 'square'];
                if (!validOrientations.includes(orientation)) {
                    return {
                        success: false,
                        error: `Invalid orientation. Must be one of: ${validOrientations.join(', ')}`,
                    };
                }
            }

            const searchRequest: PexelsSearchRequest = {
                query,
                per_page: requestedCount,
                page: 1,
                ...(orientation && { orientation }),
                ...(min_width && { min_width: Number(min_width) }),
                ...(min_height && { min_height: Number(min_height) }),
                ...(color && { color }),
            };

            const images =
                await this.pexelsService.searchMultipleImages(searchRequest);

            if (!images || images.length === 0) {
                return {
                    success: true,
                    data: {
                        message: `No images found for "${query}". Try different search terms or adjust filters.`,
                        images: [],
                        totalFound: 0,
                    },
                };
            }

            // Format image data for the AI to evaluate
            const imageOptions = images.map((img, index) => ({
                index,
                id: img.id,
                description: img.description || img.alt || 'No description',
                alt: img.alt,
                photographer: img.photographer,
                photographerUrl: img.photographer_url,
                sourceUrl: img.source_url,
                width: img.width,
                height: img.height,
                aspectRatio: img.aspect_ratio,
                avgColor: img.avg_color,
                urls: {
                    small: img.urls.small,
                    medium: img.urls.medium,
                    large: img.urls.large,
                    original: img.urls.original,
                },
            }));

            const message =
                `Found ${images.length} images for "${query}":\n\n` +
                imageOptions
                    .map(
                        (opt, idx) =>
                            `${idx + 1}. ${opt.description}\n` +
                            `   - Photographer: ${opt.photographer}\n` +
                            `   - Dimensions: ${opt.width}×${opt.height} (${opt.aspectRatio.toFixed(2)} ratio)\n` +
                            `   - Dominant color: ${opt.avgColor}\n` +
                            `   - Large image URL: ${opt.urls.large}\n`,
                    )
                    .join('\n') +
                '\nTo add one of these images to your presentation, use the "addImageFromUrl" tool with the URL of your chosen image.';

            return {
                success: true,
                data: {
                    message,
                    query,
                    images: imageOptions,
                    totalFound: images.length,
                },
            };
        } catch (error) {
            console.error('Error searching Pexels images:', error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? `Error searching images: ${error.message}`
                        : 'Unknown error occurred while searching images',
            };
        }
    }
}
