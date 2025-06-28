import axios from 'axios';
import TurndownService from 'turndown';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class GetDataFromUrl extends BaseTool {
  name = 'getDataFromUrl';

  description = 'Get data from a URL and convert HTML to Markdown';

  requiredParams = {
    url: 'The URL to get data from',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    const { url } = params;
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    });
    const { data } = response;

    let markdown = '';

    if (typeof data === 'string' && data.trim().startsWith('<')) {
      try {
        const turndownService = new TurndownService();
        markdown = turndownService.turndown(data);
      } catch (error) {
        console.error('Error converting HTML to Markdown:', error);
      }
    }

    return {
      success: true,
      data: {
        data,
        markdown: markdown || '',
      },
      editedSlidesIds: [],
    };
  }
}
