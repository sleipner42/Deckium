import {
  AIRequest,
  AIResponse,
  AIToolCall,
  Thread,
} from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import {
  IAIService,
  MessageContent,
} from '../../common/domain/interfaces/ai-service.interface';
import AuthService from '../auth/service';
import { PresentationService } from '../presentation/service';
import { generateSlideGrid } from '../presentation/utils';
import { logger } from '../utils/logger';
import { AIEventBus } from './event-bus';
import { getDeveloperPrompt } from './prompt/systemPrompt';
import { AIState } from './state';
import { AIToolsService } from './tools/tools';

const USE_CRITIC = false;

export class AIService {
  private state: AIState;

  private eventBus: AIEventBus;

  private toolsService: AIToolsService;

  private aiClient: IAIService;

  private presentationService: PresentationService;

  private activeRequests: Map<UUID, AbortController> = new Map();
  
  private processingThreads: Set<UUID> = new Set();

  constructor(
    aiClient: IAIService,
    presentationService: PresentationService,
    authService?: AuthService,
  ) {
    this.state = new AIState();
    this.eventBus = new AIEventBus();
    this.toolsService = new AIToolsService(authService);
    this.aiClient = aiClient;
    this.presentationService = presentationService;
  }

  createThread(title: string, presentationId: UUID): Thread {
    const presentation = this.presentationService.getPresentation();
    const developerPrompt = getDeveloperPrompt(
      presentation,
      this.presentationService,
    );

    const thread = this.state.createThread(
      title,
      presentationId,
      developerPrompt,
    );
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

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    // Prevent multiple simultaneous processing for the same thread
    if (this.processingThreads.has(request.threadId)) {
      console.log(`Thread ${request.threadId} is already being processed, ignoring duplicate request`);
      throw new Error('Thread is already being processed');
    }
    
    this.processingThreads.add(request.threadId);

    // Create abort controller for this request
    const abortController = new AbortController();
    this.activeRequests.set(request.threadId, abortController);

    try {
      logger.logAIRequest('Received AI message request', {
        threadId: request.threadId,
        message: request.message,
        content: request.content,
        contentType: Array.isArray(request.content) ? 'multi-content' : 'text',
        contentLength: request.content
          ? request.content.length
          : request.message?.length || 0,
      });

      console.log(`Sending message to thread: ${request.threadId}`);
      console.log(
        `Available threads: ${Array.from(this.state.getThreadIds()).join(', ')}`,
      );
      const thread = this.getThread(request.threadId);
      if (!thread) {
        console.error(`No suitable thread found for request`);
        throw new Error(`Thread not found: ${request.threadId}`);
      }

      console.log(
        `Using thread ${thread.id} with ${thread.messages.length} messages`,
      );

      // Store the user message but don't add it to thread yet
      let userMessage: string | any;
      let userContent: any;
      
      if (
        request.content &&
        Array.isArray(request.content) &&
        request.content.length > 0
      ) {
        userContent = request.content;
        userMessage = null;
      } else {
        userMessage = request.message;
        userContent = null;
      }

      this.eventBus.broadcastProcessingStarted(thread.id);

      // Add user message and process in one go
      let updatedThread: Thread;
      let startTime: number;
      let endTime: number;
      
      try {
        if (userContent) {
          updatedThread = this.state.addMessage(thread, userContent, 'user');
          logger.logSystem('User message added to thread', 'debug', {
            threadId: thread.id,
            messageType: 'multi-content',
            content: userContent,
          });
        } else {
          updatedThread = this.state.addMessage(thread, userMessage, 'user');
          logger.logSystem('User message added to thread', 'debug', {
            threadId: thread.id,
            messageType: 'text',
            message: userMessage,
          });
        }

        this.saveThread(updatedThread);
        this.eventBus.broadcastThreadUpdated(updatedThread);

        startTime = performance.now();
        updatedThread = await this.processAILoopWithStreaming(updatedThread, false, abortController.signal);
        endTime = performance.now();
        console.log(`Total AI loop processing time: ${endTime - startTime}ms`);
      } catch (error) {
        // If aborted, remove the user message we just added
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          const revertedThread = { ...thread }; // Revert to original state before user message
          this.saveThread(revertedThread);
          this.eventBus.broadcastThreadUpdated(revertedThread);
        }
        throw error;
      }

      const lastAssistantMessage = [...updatedThread.messages]
        .reverse()
        .find((m) => m.role === 'assistant');

      if (!lastAssistantMessage) {
        // If no assistant message, check if this was aborted
        if (abortController.signal.aborted) {
          // Add a cancelled message to show the user what happened
          updatedThread = this.state.addMessage(updatedThread, 'Request was cancelled by user.', 'assistant');
          this.saveThread(updatedThread);
          this.eventBus.broadcastThreadUpdated(updatedThread);
          this.eventBus.broadcastProcessingCompleted(updatedThread.id);
          return {
            message: 'Request was cancelled by user.',
          };
        }
        throw new Error('No response from AI');
      }

      const aiResponse = lastAssistantMessage.content;

      logger.logAIResponse('AI response generated', {
        threadId: updatedThread.id,
        response: aiResponse,
        responseType: typeof aiResponse,
        responseLength:
          typeof aiResponse === 'string'
            ? aiResponse.length
            : JSON.stringify(aiResponse).length,
        processingTimeMs: endTime && startTime ? endTime - startTime : 0,
        messageCount: updatedThread.messages.length,
      });

      this.eventBus.broadcastProcessingCompleted(updatedThread.id);

      return {
        message: aiResponse,
      };
    } catch (error) {
      // Check if this was an abort - this catch handles outer errors
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.log(`Request aborted for thread: ${request.threadId}`);
        this.eventBus.broadcastProcessingCompleted(request.threadId);
        throw error; // Re-throw so the renderer knows it was aborted
      }
      console.error('Error sending message to AI:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      logger.logSystem('AI request failed', 'error', {
        threadId: request.threadId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      this.eventBus.broadcastProcessingError(request.threadId, errorMessage);

      return {
        message: `Error: ${errorMessage}`,
      };
    } finally {
      // Clean up abort controller and processing tracking
      this.activeRequests.delete(request.threadId);
      this.processingThreads.delete(request.threadId);
    }
  }

  abortRequest(threadId: UUID): boolean {
    const abortController = this.activeRequests.get(threadId);
    if (abortController) {
      console.log(`Aborting request for thread: ${threadId}`);
      abortController.abort();
      this.activeRequests.delete(threadId);
      return true;
    }
    console.log(`No active request found for thread: ${threadId}`);
    return false;
  }

  private checkAborted(abortSignal?: AbortSignal, context?: string): void {
    if (abortSignal?.aborted) {
      const message = context ? `Request aborted ${context}` : 'Request was aborted';
      console.log(message);
      const error = new Error('Request was aborted');
      error.name = 'AbortError';
      throw error;
    }
  }

  private async processAILoopWithStreaming(
    thread: Thread,
    responseToCritic = false,
    abortSignal?: AbortSignal,
  ): Promise<Thread> {
    const loopStartTime = performance.now();
    let updatedThread = this.initializeThreadForLoop(thread);
    let iterationCount = 0;
    let consecutiveEmptyIterations = 0;

    const constants = {
      MAX_ITERATIONS: 20,
      MAX_CONSECUTIVE_EMPTY_ITERATIONS: 2,
      DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    };

    while (iterationCount < constants.MAX_ITERATIONS) {
      // Check if request was aborted at start of iteration
      this.checkAborted(abortSignal, 'at start of iteration');

      const iterationStartTime = performance.now();
      console.log(
        `Starting iteration ${iterationCount + 1}/${constants.MAX_ITERATIONS}`,
      );

      try {
        const aiResponse = await this.executeStreamingIteration(
          updatedThread,
          constants.DEPLOYMENT_NAME,
          iterationCount,
          abortSignal,
        );

        // Check if request was aborted after streaming
        this.checkAborted(abortSignal, 'after streaming iteration');

        if (this.isRepeatingResponse(updatedThread.messages, aiResponse)) {
          updatedThread = this.handleRepeatingResponse(updatedThread);
          iterationCount++;
          continue;
        }

        const toolCall = this.toolsService.extractToolCall(aiResponse);

        if (!toolCall) {
          const shouldContinue = this.shouldContinueWithoutToolCall(
            aiResponse,
            consecutiveEmptyIterations,
            constants.MAX_CONSECUTIVE_EMPTY_ITERATIONS,
          );

          if (shouldContinue) {
            updatedThread = this.addContinuationMessage(updatedThread);
            iterationCount++;
            consecutiveEmptyIterations++;
            continue;
          }

          break;
        }

        consecutiveEmptyIterations = 0;
        
        // Check if request was aborted before tool execution
        this.checkAborted(abortSignal, 'before tool execution');
        
        updatedThread = await this.executeToolCallAndUpdateThread(
          updatedThread,
          toolCall,
          iterationCount,
          abortSignal,
        );

        iterationCount++;
        this.logIterationCompletion(iterationCount, iterationStartTime);

        if (iterationCount === constants.MAX_ITERATIONS) {
          updatedThread = this.addMaxIterationsWarning(updatedThread);
        }
      } catch (error) {
        console.error('Error in AI loop:', error);
        updatedThread = this.handleIterationError(updatedThread, error);
        break;
      }
    }

    this.logLoopCompletion(iterationCount, loopStartTime);

    if (!responseToCritic) {
      await this.runAutomaticCritic(updatedThread).catch((error) =>
        console.error('Error running automatic critic:', error),
      );
    }

    return updatedThread;
  }

  private initializeThreadForLoop(thread: Thread): Thread {
    const presentation = this.presentationService.getPresentation();
    const developerPrompt = getDeveloperPrompt(
      presentation,
      this.presentationService,
    );
    return this.state.updateSystemMessage(thread, developerPrompt);
  }

  private async executeStreamingIteration(
    thread: Thread,
    deploymentName: string,
    iterationCount: number,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const assistantMessageId = crypto.randomUUID?.() || Date.now().toString();

    let updatedThread = this.state.addMessageWithState(
      thread,
      '',
      'assistant',
      assistantMessageId,
      'streaming',
    );

    this.logStreamingStart(
      updatedThread.id,
      assistantMessageId,
      iterationCount,
    );
    this.saveThread(updatedThread);
    this.eventBus.broadcastThreadUpdated(updatedThread);

    const streamingState = {
      content: '',
      chunkCount: 0,
    };

    const onChunk = (chunk: string) => {
      streamingState.content += chunk;
      streamingState.chunkCount++;

      if (
        streamingState.chunkCount % 10 === 0 ||
        streamingState.content.length % 500 === 0
      ) {
        this.logStreamingUpdate(
          updatedThread.id,
          assistantMessageId,
          streamingState,
          chunk,
          iterationCount,
        );
      }

      updatedThread = this.state.updateMessageContent(
        updatedThread,
        assistantMessageId,
        streamingState.content,
      );

      this.eventBus.broadcastMessageChunkReceived(
        updatedThread.id,
        assistantMessageId,
        chunk,
        streamingState.content,
      );

      this.eventBus.broadcastThreadUpdated(updatedThread);
    };

    const aiResponse = await this.aiClient.chatStream(
      thread.messages,
      onChunk,
      deploymentName,
      abortSignal,
    );

    this.logStreamingCompletion(
      updatedThread.id,
      assistantMessageId,
      aiResponse,
      streamingState,
      iterationCount,
    );

    updatedThread = this.state.setMessageStreamingState(
      updatedThread,
      assistantMessageId,
      'completed',
    );
    this.eventBus.broadcastThreadUpdated(updatedThread);

    return aiResponse;
  }

  private isRepeatingResponse(messages: any[], aiResponse: string): boolean {
    const lastMessages = messages
      .slice(-4)
      .filter((m) => m.role === 'assistant')
      .map((m) => (typeof m.content === 'string' ? m.content : ''));

    return lastMessages.some(
      (msg) =>
        msg &&
        aiResponse &&
        msg.trim() === aiResponse.trim() &&
        msg.length > 20,
    );
  }

  private handleRepeatingResponse(thread: Thread): Thread {
    console.log(
      'Detected repeating responses, adding variation to break the loop',
    );
    return this.state.addMessage(
      thread,
      "Let's try a different approach. Please continue with the next logical step in creating this presentation.",
      'system',
    );
  }

  private shouldContinueWithoutToolCall(
    aiResponse: string,
    consecutiveEmptyIterations: number,
    maxEmptyIterations: number,
  ): boolean {
    const responseEndSignals = [
      'let me know if',
      'let me know what',
      'anything else',
      'is there anything else',
      'do you want me to',
      'how does that sound',
      'would you like me to',
    ];

    const containsEndSignal = responseEndSignals.some((signal) =>
      aiResponse.toLowerCase().includes(signal.toLowerCase()),
    );

    const isPrematureStop =
      containsEndSignal &&
      !aiResponse.includes('completed') &&
      !aiResponse.includes('finished');

    if (isPrematureStop) {
      console.log(
        'AI seems to be stopping prematurely, encouraging continuation',
      );

      if (consecutiveEmptyIterations >= maxEmptyIterations) {
        console.log(
          `Reached ${maxEmptyIterations} consecutive empty iterations, breaking loop`,
        );
        return false;
      }

      return true;
    }

    return false;
  }

  private addContinuationMessage(thread: Thread): Thread {
    return this.state.addMessage(
      thread,
      'Continue with the task. If you were in the middle of something, please complete it.',
      'system',
    );
  }

  private async executeToolCallAndUpdateThread(
    thread: Thread,
    toolCall: AIToolCall,
    iterationCount: number,
    abortSignal?: AbortSignal,
  ): Promise<Thread> {
    console.log(`Executing tool call: ${toolCall.toolName}`);

    // Check if request was aborted before tool execution
    this.checkAborted(abortSignal, 'during tool execution');

    this.logToolExecutionStart(toolCall, iterationCount);

    const toolResults = await this.toolsService.executeToolCalls(
      [toolCall],
      this.presentationService,
    );

    this.logToolExecutionCompletion(
      toolCall.toolName,
      toolResults,
      iterationCount,
    );

    const toolResultsFormatted =
      this.toolsService.formatToolResults(toolResults);
    let updatedThread = this.addToolResultsToThread(
      thread,
      toolResultsFormatted,
      iterationCount,
    );

    updatedThread = this.addSlideGridsIfNeeded(updatedThread, toolResults);

    return updatedThread;
  }

  private addToolResultsToThread(
    thread: Thread,
    toolResultsFormatted: any,
    iterationCount: number,
  ): Thread {
    if (Array.isArray(toolResultsFormatted)) {
      const textContent = toolResultsFormatted.find(
        (item) => item.type === 'text',
      )?.text;
      let updatedThread = thread;

      if (textContent) {
        updatedThread = this.state.addMessage(
          updatedThread,
          textContent,
          'system',
        );
      }

      const hasImages = toolResultsFormatted.some(
        (item) => item.type === 'image_url',
      );

      if (hasImages) {
        const imageContents = toolResultsFormatted.filter(
          (item) => item.type === 'image_url',
        );
        imageContents.unshift({
          type: 'text',
          text: 'Here is the screenshot from the tool execution:',
        });

        updatedThread = this.state.addMessage(
          updatedThread,
          imageContents as MessageContent[],
          'user',
        );
      }

      const continuationMessage = this.getContinuationMessage(
        hasImages,
        iterationCount,
      );
      return this.state.addMessage(
        updatedThread,
        continuationMessage,
        'system',
      );
    }

    const continuationMessage = this.getSimpleContinuationMessage(
      toolResultsFormatted,
      iterationCount,
    );
    const updatedThread = this.state.addMessage(
      thread,
      toolResultsFormatted,
      'system',
    );
    return this.state.addMessage(updatedThread, continuationMessage, 'system');
  }

  private getContinuationMessage(
    hasImages: boolean,
    iterationCount: number,
  ): string {
    const messages = hasImages
      ? [
          'Tool execution completed successfully. Screenshots have been added to the conversation. Please continue with the task.',
          'The tool has executed successfully and screenshots are added above. What would be the next step to complete this presentation?',
          'Above are the screenshots from the tool execution. Please proceed with the next logical step in this workflow.',
        ]
      : [
          'Tool execution completed successfully. Please continue with the task.',
          'The tool has executed successfully. What would be the next step to complete this presentation?',
          'Tool execution is complete. Please proceed with the next logical step in this workflow.',
        ];

    return messages[iterationCount % messages.length];
  }

  private getSimpleContinuationMessage(
    toolResultsFormatted: string,
    iterationCount: number,
  ): string {
    const continuationMessages = [
      `Tool execution results: ${toolResultsFormatted}. Please continue with the task.`,
      `Here are the results of the tool execution: ${toolResultsFormatted}. What would be the next step?`,
      `The tool has completed with the following results: ${toolResultsFormatted}. Please proceed with the next logical step.`,
    ];
    return continuationMessages[iterationCount % continuationMessages.length];
  }

  private addSlideGridsIfNeeded(thread: Thread, toolResults: any[]): Thread {
    const editedSlides = toolResults.reduce((acc, result) => {
      if (result.editedSlidesIds) {
        acc.push(...result.editedSlidesIds);
      }
      return acc;
    }, [] as string[]);

    if (editedSlides.length === 0) return thread;

    const presentation = this.presentationService.getPresentation();
    const slideGrids = editedSlides.map((slideId: string) => {
      const slide = presentation.slides.find((s) => s.id === slideId);
      return slide ? generateSlideGrid(slide, { pixelsPerSquare: 20 }) : '';
    });

    const slideGridMessage = `Updated slides visual representation:\n\n${slideGrids.join('\n\n')}`;

    console.log(slideGridMessage);

    logger.logSystem('Generated slide grids for edited slides', 'debug', {
      editedSlideIds: editedSlides,
      slideGridCount: slideGrids.length,
    });

    return this.state.addMessage(thread, slideGridMessage, 'system');
  }

  private addMaxIterationsWarning(thread: Thread): Thread {
    const warningMessage =
      'Maximum number of tool call iterations reached. Some actions may not have been completed.';
    return this.state.addMessage(thread, warningMessage, 'system');
  }

  private handleIterationError(thread: Thread, error: unknown): Thread {
    const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    return this.state.addMessage(thread, errorMessage, 'system');
  }

  private logStreamingStart(
    threadId: string,
    messageId: string,
    iteration: number,
  ): void {
    logger.logSystem('AI streaming response started', 'debug', {
      threadId,
      messageId,
      iteration: iteration + 1,
    });
  }

  private logStreamingUpdate(
    threadId: string,
    messageId: string,
    streamingState: { content: string; chunkCount: number },
    chunk: string,
    iteration: number,
  ): void {
    logger.logSystem('AI streaming content update', 'debug', {
      threadId,
      messageId,
      chunkCount: streamingState.chunkCount,
      currentLength: streamingState.content.length,
      recentChunk: chunk,
      iteration: iteration + 1,
    });
  }

  private logStreamingCompletion(
    threadId: string,
    messageId: string,
    aiResponse: string,
    streamingState: { content: string; chunkCount: number },
    iteration: number,
  ): void {
    logger.logAIResponse('AI streaming response completed', {
      threadId,
      messageId,
      response: aiResponse,
      finalLength: aiResponse?.length || 0,
      chunkCount: streamingState.chunkCount,
      iteration: iteration + 1,
    });
  }

  private logToolExecutionStart(toolCall: AIToolCall, iteration: number): void {
    logger.logSystem('Tool execution started', 'debug', {
      toolName: toolCall.toolName,
      toolId: toolCall.toolId,
      params: toolCall.params,
      iteration: iteration + 1,
    });
  }

  private logToolExecutionCompletion(
    toolName: string,
    toolResults: any[],
    iteration: number,
  ): void {
    logger.logSystem('Tool execution completed', 'debug', {
      toolName,
      results: toolResults,
      resultCount: toolResults.length,
      iteration: iteration + 1,
    });
  }

  private logIterationCompletion(
    iterationCount: number,
    iterationStartTime: number,
  ): void {
    const iterationEndTime = performance.now();
    console.log(
      `Iteration ${iterationCount} completed in ${iterationEndTime - iterationStartTime}ms`,
    );
  }

  private logLoopCompletion(
    iterationCount: number,
    loopStartTime: number,
  ): void {
    const loopEndTime = performance.now();
    console.log(
      `AI loop completed after ${iterationCount} iterations in ${loopEndTime - loopStartTime}ms`,
    );
  }

  private async runAutomaticCritic(thread: Thread): Promise<void> {
    const presentation = this.presentationService.getPresentation();
    if (!presentation.slides.length) return;

    // Get selected slide or last slide
    const selectedSlideId = this.presentationService.getSelectedSlideId();
    const slideId =
      selectedSlideId || presentation.slides[presentation.slides.length - 1].id;

    if (USE_CRITIC) {
      console.log('\n\n========  Running automatic critic... ========\n\n');

      try {
        // Execute the critic tool
        const criticToolCall: AIToolCall = {
          toolId: 'critic',
          toolName: 'criticizeSlide',
          params: { slideId },
        };

        const toolResults = await this.toolsService.executeToolCalls(
          [criticToolCall],
          this.presentationService,
        );

        if (toolResults.length > 0 && toolResults[0].result.success) {
          const criticResult = toolResults[0].result.data;

          // Get the latest version of the thread
          const latestThread = this.getThread(thread.id);
          if (!latestThread) {
            console.error(`Thread ${thread.id} not found after critic review`);
            return;
          }

          // Format the criticism and recommendations
          const criticismMessage = `## Slide Feedback\n\n${criticResult.criticism}\n\n### Recommendations:\n${criticResult.recommendations.map((rec: string) => `• ${rec}`).join('\n')}\n\nPlease implement these suggestions to improve the slide.`;

          // Add the critique as a system message
          const updatedThread = this.state.addMessage(
            latestThread,
            criticismMessage,
            'system',
          );

          // Save the updated thread
          const savedThread = this.saveThread(updatedThread);

          // Broadcast the updates
          this.eventBus.broadcastThreadUpdated(savedThread);

          // Auto-generate AI response to implement the changes
          await this.generateAIResponseToCritique(
            savedThread,
            criticismMessage,
          );
        }
      } catch (error) {
        console.error('Error running automatic critic:', error);
      }
    }
  }

  private async generateAIResponseToCritique(
    thread: Thread,
    criticismMessage?: string,
  ): Promise<void> {
    try {
      // Get the latest thread state
      const latestThread = this.getThread(thread.id);
      if (!latestThread) {
        console.error(
          `Thread ${thread.id} not found during AI response generation`,
        );
        return;
      }

      console.log(
        `Generating AI response to criticism for thread ${latestThread.id}`,
      );

      // Add a system message encouraging the AI to implement the changes
      const presentation = this.presentationService.getPresentation();
      const selectedSlideId = this.presentationService.getSelectedSlideId();
      const slideId =
        selectedSlideId ||
        (presentation.slides.length > 0
          ? presentation.slides[presentation.slides.length - 1].id
          : 'unknown');

      const implementationMessage = `Now implement the feedback above to improve slide ${slideId}. Use the appropriate tools to update the slide based on the recommendations.`;

      const updatedThread = this.state.addMessage(
        latestThread,
        implementationMessage,
        'system',
      );

      const savedThread = this.saveThread(updatedThread);
      this.eventBus.broadcastThreadUpdated(savedThread);

      // Trigger the AI loop to implement the changes
      await this.processAILoopWithStreaming(savedThread, true);
    } catch (error) {
      console.error('Error generating AI response to critique:', error);
    }
  }

  onEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(eventName, listener);
  }

  offEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(eventName, listener);
  }
}
