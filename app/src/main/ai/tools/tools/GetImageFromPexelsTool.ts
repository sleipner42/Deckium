import axios from 'axios';
import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class GetImageFromPexelsTool extends BaseTool {
  name = 'getImageFromPexels';

  description = 'Search and retrieve images from Pexels API based on query and specifications. Use this to find images, then use addImageFromPexelsResult to add them to a slide.';

  requiredParams = {
    query: 'The search query for the image',
  };

  optionalParams = {
    orientation: 'The orientation of the image (landscape, portrait, square)',
    perPage: 'Number of images to return per page (default: 5, max: 80)',
    page: 'Page number for pagination (default: 1)',
    minWidth: 'Minimum width of images to return (optional)',
    minHeight: 'Minimum height of images to return (optional)',
    color: 'Dominant color to filter by (e.g., "red", "blue", "green", "black", etc.) (optional)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    try {
      const { 
        query, 
        orientation, 
        perPage = 5, 
        page = 1,
        minWidth,
        minHeight,
        color
      } = params;
      
      // Validate required parameters
      if (!query) {
        return {
          success: false,
          error: 'Missing required parameter: query is required',
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
        per_page: Math.min(Math.max(1, perPage), 80), // Ensure perPage is within 1-80
        page: Math.max(1, page), // Ensure page is at least 1
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
      
      // Process the response
      if (!response.data || !response.data.photos || !response.data.photos.length) {
        return {
          success: true,
          data: {
            images: [],
            message: 'No images found for the given query',
            query,
            parameters: requestParams
          },
        };
      }
      
      // Extract detailed image data with all available sizes
      const images = response.data.photos.map((photo: any) => {
        // Include all available image sizes
        return {
          id: photo.id,
          urls: {
            original: photo.src.original,
            large: photo.src.large, // 1000px
            large2x: photo.src.large2x, // 2000px
            medium: photo.src.medium, // 500px
            small: photo.src.small, // 300px
            portrait: photo.src.portrait, // 800x1200px
            landscape: photo.src.landscape, // 1200x800px
            tiny: photo.src.tiny, // 280x200px
          },
          width: photo.width,
          height: photo.height,
          aspectRatio: photo.width / photo.height,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          photographerId: photo.photographer_id,
          alt: photo.alt || query,
          description: photo.alt || `${query} image`,
          sourceUrl: photo.url,
          avgColor: photo.avg_color,
          liked: photo.liked,
        };
      });
      
      return {
        success: true,
        data: {
          images,
          total: response.data.total_results,
          page: response.data.page,
          perPage: response.data.per_page,
          totalPages: Math.ceil(response.data.total_results / response.data.per_page),
          nextPage: response.data.next_page,
          prevPage: response.data.prev_page,
          query,
          parameters: requestParams,
          message: `Found ${images.length} images matching "${query}". Use addImageFromPexelsResult to add one of these images to a slide.`,
        },
      };
    } catch (error) {
      console.error('Error fetching images from Pexels:', error);
      return {
        success: false,
        error: error instanceof Error 
          ? `Error fetching images from Pexels: ${error.message}`
          : 'Unknown error occurred while fetching images from Pexels',
      };
    }
  }
}