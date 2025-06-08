import { BaseTool } from '../BaseTool';
import {
  AIToolResult,
  AIToolCall,
} from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { ToolsService } from '../builtInTools';

export class CriticTool extends BaseTool {
  name = 'criticizeSlide';

  description =
    "Automatically review and provide feedback on a slide's visual design, content organization, and effectiveness";

  requiredParams = {
    slideId:
      'The ID of the slide to review (optional - if not provided, reviews the current/latest slide)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService,
  ): Promise<AIToolResult> {
    try {
      const presentation = presentationService.getPresentation();

      if (!presentation.slides.length) {
        return {
          success: false,
          error: 'No slides available to review',
        };
      }

      // Determine which slide to review
      let { slideId } = params;
      if (!slideId) {
        // Use selected slide or latest slide
        const selectedSlideId = presentationService.getSelectedSlideId();
        slideId =
          selectedSlideId ||
          presentation.slides[presentation.slides.length - 1].id;
      }

      // Verify slide exists
      const slide = presentation.slides.find((s) => s.id === slideId);
      if (!slide) {
        return {
          success: false,
          error: `Slide with ID ${slideId} not found`,
        };
      }

      // Get slide information using existing tools
      const infoToolCall: AIToolCall = {
        toolId: 'getInfo',
        toolName: 'getAllInfoAboutSlide',
        params: { slideId },
      };

      const screenshotToolCall: AIToolCall = {
        toolId: 'getScreenshot',
        toolName: 'getScreenshotOfSlide',
        params: { slideId },
      };

      // Execute both tool calls to get slide data
      const toolResults = await ToolsService.executeToolCalls(
        [infoToolCall, screenshotToolCall],
        ToolsService.getBuiltInTools(),
        presentationService,
      );

      // Extract slide information from tool results
      let slideInfo = '';
      let hasScreenshot = false;

      for (const result of toolResults) {
        if (
          result.toolName === 'getAllInfoAboutSlide' &&
          result.result.success
        ) {
          slideInfo = result.result.data || '';
        } else if (
          result.toolName === 'getScreenshotOfSlide' &&
          result.result.success
        ) {
          hasScreenshot = true;
        }
      }

      // Generate criticism based on slide content
      const criticism = this.generateCriticism(slide, slideInfo);

      return {
        success: true,
        data: {
          slideId,
          criticism,
          slideInfo,
          hasScreenshot,
          recommendations: this.generateRecommendations(slide, slideInfo),
        },
        editedSlidesIds: [],
      };
    } catch (error) {
      console.error('Error in CriticTool:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private generateCriticism(slide: any, slideInfo: string): string {
    const issues: string[] = [];
    const positives: string[] = [];

    // Analyze elements count
    const elementCount = slide.elements.length;
    if (elementCount === 0) {
      issues.push(
        'The slide is completely empty - it needs content to be effective',
      );
    } else if (elementCount > 8) {
      issues.push(
        'The slide may be overcrowded with too many elements - consider simplifying',
      );
    } else if (elementCount >= 1 && elementCount <= 5) {
      positives.push('Good balance of content - not too cluttered or sparse');
    }

    // Analyze text elements
    const textElements = slide.elements.filter(
      (e: any) => e.type === 'textbox',
    );
    const imageElements = slide.elements.filter((e: any) => e.type === 'image');
    const chartElements = slide.elements.filter(
      (e: any) => e.type === 'barchart',
    );

    if (
      textElements.length === 0 &&
      imageElements.length === 0 &&
      chartElements.length === 0
    ) {
      issues.push('No meaningful content detected');
    }

    // Check for very long text content
    textElements.forEach((element: any, index: number) => {
      if (element.content && element.content.length > 200) {
        issues.push(
          `Text element ${index + 1} is quite long - consider breaking it into smaller chunks`,
        );
      }
      if (
        element.content &&
        element.content.length < 5 &&
        textElements.length === 1
      ) {
        issues.push(
          'Very brief content - consider adding more detail or context',
        );
      }
    });

    // Check font sizes
    const smallTextElements = textElements.filter(
      (e: any) => e.fontSize && e.fontSize < 14,
    );
    if (smallTextElements.length > 0) {
      issues.push(
        'Some text may be too small for presentation viewing - consider larger font sizes',
      );
    }

    // Check for visual variety
    if (
      textElements.length > 0 &&
      imageElements.length === 0 &&
      chartElements.length === 0
    ) {
      issues.push(
        'Consider adding visual elements (images, charts) to make the slide more engaging',
      );
    } else if (imageElements.length > 0 || chartElements.length > 0) {
      positives.push('Good use of visual elements to support the content');
    }

    // Background analysis
    if (slide.background === '#FFFFFF') {
      positives.push('Clean white background provides good contrast');
    }

    let criticism = '## Slide Review\n\n';

    if (positives.length > 0) {
      criticism += '### Strengths:\n';
      positives.forEach((positive) => {
        criticism += `• ${positive}\n`;
      });
      criticism += '\n';
    }

    if (issues.length > 0) {
      criticism += '### Areas for Improvement:\n';
      issues.forEach((issue) => {
        criticism += `• ${issue}\n`;
      });
    } else {
      criticism +=
        '### Areas for Improvement:\n• This slide looks well-structured overall\n';
    }

    return criticism;
  }

  private generateRecommendations(slide: any, slideInfo: string): string[] {
    const recommendations: string[] = [];

    const textElements = slide.elements.filter(
      (e: any) => e.type === 'textbox',
    );
    const imageElements = slide.elements.filter((e: any) => e.type === 'image');

    // Content recommendations
    if (slide.elements.length === 0) {
      recommendations.push(
        'Add a title and main content to give the slide purpose',
      );
      recommendations.push(
        'Consider adding visual elements like images or charts',
      );
    }

    if (textElements.length > 0) {
      const hasTitle = textElements.some(
        (e: any) =>
          e.fontSize && e.fontSize > 20 && e.content && e.content.length < 50,
      );
      if (!hasTitle) {
        recommendations.push(
          "Add a clear, prominent title to establish the slide's main topic",
        );
      }
    }

    if (textElements.length > 3) {
      recommendations.push(
        'Consider consolidating text elements or using bullet points for better organization',
      );
    }

    if (imageElements.length === 0 && textElements.length > 1) {
      recommendations.push(
        'Add relevant images to break up text and increase visual appeal',
      );
    }

    // Visual design recommendations
    recommendations.push(
      'Ensure consistent font sizes and alignment across elements',
    );
    recommendations.push(
      'Use appropriate spacing between elements to avoid clutter',
    );
    recommendations.push(
      'Consider using colors strategically to highlight important information',
    );

    return recommendations;
  }
}
