import axios from 'axios';
import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class GetFirstImageFromPexelsTool extends BaseTool {
  name = 'getFirstImageFromPexels';

  description =
    'Search Pexels and get only the first matching image result, perfect for quick image retrieval';

  requiredParams = {
    query: 'The search query for the image',
  };

  optionalParams = {
    orientation: 'The orientation of the image (landscape, portrait, square)',
    size: 'Which size to return (tiny, small, medium, large, large2x, original, portrait, landscape). Default: large',
    color:
      'Dominant color to filter by (e.g., "red", "blue", "green", "black", etc.)',
    minWidth: 'Minimum width of image to return',
    minHeight: 'Minimum height of image to return',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    try {
      const {
        query,
        orientation,
        size = 'large',
        color,
        minWidth,
        minHeight,
      } = params;

      // Validate required parameters
      if (!query) {
        return {
          success: false,
          error: 'Missing required parameter: query is required',
        };
      }

      // Validate size parameter if provided
      const validSizes = [
        'tiny',
        'small',
        'medium',
        'large',
        'large2x',
        'original',
        'portrait',
        'landscape',
      ];
      if (size && !validSizes.includes(size)) {
        return {
          success: false,
          error: `Invalid size parameter. Must be one of: ${validSizes.join(', ')}`,
        };
      }

      // Validate orientation if provided
      if (orientation) {
        const validOrientations = ['landscape', 'portrait', 'square'];
        if (!validOrientations.includes(orientation)) {
          return {
            success: false,
            error: `Invalid orientation parameter. Must be one of: ${validOrientations.join(', ')}`,
          };
        }
      }

      // Get the API key from environment variables
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: 'Pexels API key not found in environment variables',
        };
      }

      // Prepare request parameters
      const requestParams: Record<string, any> = {
        query,
        per_page: 1, // We only need the first result
        page: 1,
      };

      // Add optional parameters if provided
      if (orientation) requestParams.orientation = orientation;
      if (minWidth) requestParams.min_width = minWidth;
      if (minHeight) requestParams.min_height = minHeight;
      if (color) requestParams.color = color;

      // Make the API request to Pexels
      const response = await axios.get('https://api.pexels.com/v1/search', {
        headers: {
          Authorization: apiKey,
        },
        params: requestParams,
      });

      // Check if we got any results
      if (
        !response.data ||
        !response.data.photos ||
        !response.data.photos.length
      ) {
        return {
          success: true,
          data: {
            found: false,
            message: `No images found for query "${query}"`,
            query,
          },
        };
      }

      // Get the first photo
      const photo = response.data.photos[0];

      // Get the requested size URL
      let imageUrl = photo.src.large; // Default to large
      if (size && photo.src[size]) {
        imageUrl = photo.src[size];
      }

      // Return formatted result
      return {
        success: true,
        data: {
          found: true,
          image: {
            id: photo.id,
            url: imageUrl,
            width: photo.width,
            height: photo.height,
            aspectRatio: photo.width / photo.height,
            photographer: photo.photographer,
            photographerUrl: photo.photographer_url,
            photographerId: photo.photographer_id,
            description: photo.alt || `${query} image`,
            sourceUrl: photo.url,
            avgColor: photo.avg_color,
            allSizes: {
              original: photo.src.original,
              large2x: photo.src.large2x,
              large: photo.src.large,
              medium: photo.src.medium,
              small: photo.src.small,
              portrait: photo.src.portrait,
              landscape: photo.src.landscape,
              tiny: photo.src.tiny,
            },
          },
          query,
          message: `Found an image matching "${query}"`,
        },
      };
    } catch (error) {
      console.error('Error fetching first image from Pexels:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? `Error fetching image from Pexels: ${error.message}`
            : 'Unknown error occurred while fetching image from Pexels',
      };
    }
  }
}
