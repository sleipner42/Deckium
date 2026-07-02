import axios from 'axios';
import TurndownService from 'turndown';
import { z } from 'zod';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class GetDataFromUrl extends BaseTool {
    name = 'getDataFromUrl';

    description =
        'Get data from a URL and convert HTML to Markdown. Always use this tool when you get a link with relevant information.';

    inputSchema = z.object({
        url: z.string().describe('The URL to get data from'),
    });

    private extractMainContent(html: string): string {
        const contentSelectors = [
            'article',
            'main',
            '.content',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.story-content',
            '.article-body',
            '.post-body',
            '.content-body',
            'div[data-testid="article-body"]',
            'div[data-testid="story-body"]',
            '.story-body',
            '.article-text',
            '.text-content',
            '.paywall-B064F03B',
            'div[class*="article"]',
            'div[class*="story"]',
            'div[class*="content"]',
        ];

        for (const selector of contentSelectors) {
            const regex = new RegExp(
                `<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`,
                'gi',
            );
            const match = regex.exec(html);
            if (match) {
                return match[1];
            }
        }

        return html;
    }

    private cleanHtml(html: string): string {
        const elementsToRemove = [
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /<style[^>]*>[\s\S]*?<\/style>/gi,
            /<noscript[^>]*>[\s\S]*?<\/noscript>/gi,
            /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
            /<nav[^>]*>[\s\S]*?<\/nav>/gi,
            /<aside[^>]*>[\s\S]*?<\/aside>/gi,
            /<footer[^>]*>[\s\S]*?<\/footer>/gi,
            /<header[^>]*>[\s\S]*?<\/header>/gi,
            /<form[^>]*>[\s\S]*?<\/form>/gi,
            /<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*banner[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*cookie[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*related[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*id="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*data-[^=]*ad[^=]*[^>]*>[\s\S]*?<\/div>/gi,
            /<!--[\s\S]*?-->/g,
        ];

        let cleanedHtml = html;
        for (const regex of elementsToRemove) {
            cleanedHtml = cleanedHtml.replace(regex, '');
        }

        return cleanedHtml;
    }

    private extractMetadata(html: string): {
        title?: string;
        description?: string;
        author?: string;
        publishDate?: string;
    } {
        const metadata: any = {};

        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }

        const metaTags = html.match(/<meta[^>]*>/gi) || [];
        for (const tag of metaTags) {
            const propertyMatch = tag.match(
                /property="([^"]*)"[^>]*content="([^"]*)"/i,
            );
            const nameMatch = tag.match(
                /name="([^"]*)"[^>]*content="([^"]*)"/i,
            );

            if (propertyMatch) {
                const [, property, content] = propertyMatch;
                if (property === 'og:title' && !metadata.title) {
                    metadata.title = content;
                } else if (property === 'og:description') {
                    metadata.description = content;
                } else if (property === 'article:author') {
                    metadata.author = content;
                } else if (property === 'article:published_time') {
                    metadata.publishDate = content;
                }
            }

            if (nameMatch) {
                const [, name, content] = nameMatch;
                if (name === 'description' && !metadata.description) {
                    metadata.description = content;
                } else if (name === 'author' && !metadata.author) {
                    metadata.author = content;
                }
            }
        }

        return metadata;
    }

    protected async executeImpl(
        params: Record<string, any>,
        _presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { url } = params;

        let response: { data: unknown };
        try {
            response = await axios.get(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                },
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response
                    ? `HTTP ${error.response.status} ${error.response.statusText}`
                    : error.message;
                return {
                    success: false,
                    error: `Failed to fetch ${url}: ${status}. The page may be unavailable, blocked, or the URL may be wrong.`,
                };
            }
            throw error;
        }
        const { data } = response;

        let markdown = '';

        if (typeof data === 'string' && data.trim().startsWith('<')) {
            try {
                const metadata = this.extractMetadata(data);
                const mainContent = this.extractMainContent(data);
                const cleanedHtml = this.cleanHtml(mainContent);

                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    hr: '---',
                    bulletListMarker: '-',
                    codeBlockStyle: 'fenced',
                    fence: '```',
                    emDelimiter: '*',
                    strongDelimiter: '**',
                    linkStyle: 'inlined',
                    linkReferenceStyle: 'full',
                });

                turndownService.remove([
                    'script',
                    'style',
                    'noscript',
                    'iframe',
                    'nav',
                    'aside',
                    'footer',
                    'header',
                    'form',
                ]);

                let contentMarkdown = turndownService.turndown(cleanedHtml);

                contentMarkdown = contentMarkdown.replace(/\n{3,}/g, '\n\n');
                contentMarkdown = contentMarkdown.replace(/^\s*\n/gm, '');
                contentMarkdown = contentMarkdown.trim();

                if (
                    metadata.title ||
                    metadata.description ||
                    metadata.author ||
                    metadata.publishDate
                ) {
                    let metadataText = '';
                    if (metadata.title)
                        metadataText += `# ${metadata.title}\n\n`;
                    if (metadata.author)
                        metadataText += `**Author:** ${metadata.author}\n\n`;
                    if (metadata.publishDate)
                        metadataText += `**Published:** ${metadata.publishDate}\n\n`;
                    if (metadata.description)
                        metadataText += `**Description:** ${metadata.description}\n\n`;
                    metadataText += '---\n\n';

                    markdown = metadataText + contentMarkdown;
                } else {
                    markdown = contentMarkdown;
                }
            } catch (error) {
                console.error('Error converting HTML to Markdown:', error);
                return {
                    success: false,
                    error: `Fetched ${url} but failed to convert its HTML content to Markdown: ${error instanceof Error ? error.message : 'unknown error'}`,
                };
            }
        }

        if (!markdown) {
            return {
                success: false,
                error: `Fetched ${url} but could not extract any readable content (the response was empty or not HTML).`,
            };
        }

        return {
            success: true,
            data: {
                markdown,
                url,
            },
            editedSlidesIds: [],
        };
    }
}
