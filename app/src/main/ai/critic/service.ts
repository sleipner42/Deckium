import {
  AIRequest,
  AIResponse,
  AIToolCall,
  Thread,
} from '../../../common/domain/entities/ai-types';
import { UUID } from '../../../common/domain/entities/types';
import {
  IAIService,
  MessageContent,
} from '../../../common/domain/interfaces/ai-service.interface';
import { PresentationService } from '../../presentation/service';
import { AIEventBus } from '../event-bus';
import { AIState } from '../state';
import { AIToolsService } from '../tools/tools';
import { CriticPrompt } from './systemPrompt';

export class CriticService {
  private state: AIState;

  private eventBus: AIEventBus;

  private toolsService: AIToolsService;

  private aiClient: IAIService;

  private presentationService: PresentationService;

  constructor(aiClient: IAIService, presentationService: PresentationService) {
    this.state = new AIState();
    this.eventBus = new AIEventBus();
    this.toolsService = new AIToolsService();
    this.aiClient = aiClient;
    this.presentationService = presentationService;
  }

  createThread(title: string, presentationId: UUID): Thread {
    const presentation = this.presentationService.getPresentation();
    const criticPrompt = CriticPrompt;

    const thread = this.state.createThread(title, presentationId, criticPrompt);
    this.eventBus.broadcastThreadCreated(thread);
    return thread;
  }

  getThread(threadId: UUID): Thread | null {
    return this.state.getThread(threadId);
  }

  saveThread(thread: Thread): Thread {
    const savedThread = this.state.saveThread(thread);
    this.eventBus.broadcastThreadUpdated(savedThread);
    return savedThread;
  }

  getThreadsForPresentation(presentationId: UUID): Thread[] {
    return this.state.getThreadsForPresentation(presentationId);
  }

  deleteThread(threadId: UUID): boolean {
    const result = this.state.deleteThread(threadId);
    if (result) {
      this.eventBus.broadcastThreadDeleted(threadId);
    }
    return result;
  }

  async reviewSlide(threadId: UUID, slideId: UUID): Promise<string> {
    try {
      const thread = this.getThread(threadId);
      if (!thread) {
        throw new Error(`Thread not found: ${threadId}`);
      }

      this.eventBus.broadcastProcessingStarted(thread.id);

      // Get information about the slide
      const infoToolCall: AIToolCall = {
        toolId: 'getInfo',
        toolName: 'getAllInfoAboutSlide',
        params: { slideId },
      };

      // Get screenshot of the slide
      const screenshotToolCall: AIToolCall = {
        toolId: 'getScreenshot',
        toolName: 'getScreenshotOfSlide',
        params: { slideId },
      };

      // Execute both tool calls
      const toolResults = await this.toolsService.executeToolCalls(
        [infoToolCall, screenshotToolCall],
        this.presentationService,
      );

      // Format the results
      const formattedResults = this.toolsService.formatToolResults(toolResults);

      let updatedThread: Thread;

      if (Array.isArray(formattedResults)) {
        const textContent = formattedResults.find(
          (item) => item.type === 'text',
        )?.text;

        if (textContent) {
          updatedThread = this.state.addMessage(thread, textContent, 'system');
        }

        const hasImages = formattedResults.some(
          (item) => item.type === 'image_url',
        );

        if (hasImages) {
          const imageContents = formattedResults.filter(
            (item) => item.type === 'image_url',
          );

          imageContents.unshift({
            type: 'text',
            text: 'Slide information and screenshot for review:',
          });

          updatedThread = this.state.addMessage(
            thread,
            imageContents as MessageContent[],
            'user',
          );
        }
      } else {
        updatedThread = this.state.addMessage(
          thread,
          formattedResults,
          'system',
        );
      }

      // Generate the critic review by asking a question
      const reviewRequest =
        'Provide a detailed critique of this slide. Analyze the visual design, content organization, overall effectiveness, and especially aligment and overlap. Identify specific issues and suggest improvements. Focus on actionable feedback that would help improve the slide.';

      updatedThread = this.state.addMessage(
        updatedThread,
        reviewRequest,
        'user',
      );

      // Get AI response
      const assistantMessageId = crypto.randomUUID();
      updatedThread = this.state.addMessageWithState(
        updatedThread,
        '',
        'assistant',
        assistantMessageId,
        'streaming',
      );

      this.saveThread(updatedThread);
      this.eventBus.broadcastThreadUpdated(updatedThread);

      let streamingContent = '';

      const onChunk = (chunk: string) => {
        streamingContent += chunk;

        updatedThread = this.state.updateMessageContent(
          updatedThread,
          assistantMessageId,
          streamingContent,
        );

        this.eventBus.broadcastMessageChunkReceived(
          updatedThread.id,
          assistantMessageId,
          chunk,
          streamingContent,
        );

        this.eventBus.broadcastThreadUpdated(updatedThread);
      };

      const aiResponse = await this.aiClient.chatStream(
        updatedThread.messages,
        onChunk,
        process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
      );

      updatedThread = this.state.setMessageStreamingState(
        updatedThread,
        assistantMessageId,
        'completed',
      );

      this.eventBus.broadcastThreadUpdated(updatedThread);
      this.eventBus.broadcastMessageReceived(
        updatedThread.id,
        aiResponse,
        updatedThread,
      );

      this.eventBus.broadcastProcessingCompleted(updatedThread.id);

      return aiResponse;
    } catch (error) {
      console.error('Error generating critic review:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.eventBus.broadcastProcessingError(threadId, errorMessage);

      return `Error: ${errorMessage}`;
    }
  }

  onEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(eventName, listener);
  }

  offEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(eventName, listener);
  }
}
