import {
  Thread,
  AIRequest,
  AIResponse,
  AIToolCall,
} from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import {
  IAIService,
  MessageContent,
} from '../../common/domain/interfaces/ai-service.interface';
import { AIState } from './state';
import { AIEventBus } from './event-bus';
import { AIToolsService } from './tools/tools';
import { getDeveloperPrompt } from './prompt/systemPrompt';
import { PresentationService } from '../presentation/service';

export class AIService {
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
    const developerPrompt = getDeveloperPrompt(presentation);

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
    try {
      const thread = this.getThread(request.threadId);

      if (!thread) {
        throw new Error(`Thread not found: ${request.threadId}`);
      }

      let updatedThread: Thread;

      if (
        request.content &&
        Array.isArray(request.content) &&
        request.content.length > 0
      ) {
        updatedThread = this.state.addMessage(thread, request.content, 'user');
      } else {
        updatedThread = this.state.addMessage(thread, request.message, 'user');
      }

      this.eventBus.broadcastProcessingStarted(updatedThread.id);

      const startTime = performance.now();
      updatedThread = await this.processAILoopWithStreaming(
        updatedThread,
        request.message,
      );
      const endTime = performance.now();
      console.log(`Total AI loop processing time: ${endTime - startTime}ms`);

      const lastAssistantMessage = [...updatedThread.messages]
        .reverse()
        .find((m) => m.role === 'assistant');

      if (!lastAssistantMessage) {
        throw new Error('No response from AI');
      }

      const aiResponse = lastAssistantMessage.content;

      this.eventBus.broadcastMessageReceived(
        updatedThread.id,
        aiResponse,
        updatedThread,
      );

      this.eventBus.broadcastProcessingCompleted(updatedThread.id);

      return {
        message: aiResponse,
      };
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.eventBus.broadcastProcessingError(request.threadId, errorMessage);

      return {
        message: `Error: ${errorMessage}`,
      };
    }
  }

  private async processAILoopWithStreaming(
    thread: Thread,
    userMessage: string,
  ): Promise<Thread> {
    // console.log(`AI streaming loop started for thread ${thread.id}`);
    const loopStartTime = performance.now();

    let updatedThread = thread;

    // console.time('getPresentation');
    const presentation = this.presentationService.getPresentation();
    // console.timeEnd('getPresentation');

    // console.time('getDeveloperPrompt');
    const developerPrompt = getDeveloperPrompt(presentation);
    // console.timeEnd('getDeveloperPrompt');

    // console.time('updateSystemMessage');
    updatedThread = this.state.updateSystemMessage(
      updatedThread,
      developerPrompt,
    );
    // console.timeEnd('updateSystemMessage');

    let currentMessage = userMessage;
    let iterationCount = 0;
    const MAX_ITERATIONS = 20;
    const MAX_CONSECUTIVE_EMPTY_ITERATIONS = 2;
    let consecutiveEmptyIterations = 0;

    // Add a continuation message to the thread to signal the AI to continue
    const addContinuationMessage = (thread: Thread): Thread => {
      return this.state.addMessage(
        thread,
        'Continue with the task. If you were in the middle of something, please complete it.',
        'system',
      );
    };

    while (iterationCount < MAX_ITERATIONS) {
      const iterationStartTime = performance.now();
      console.log(`Starting iteration ${iterationCount + 1}/${MAX_ITERATIONS}`);

      try {
        const { messages } = updatedThread;
        const deploymentName =
          process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

        // console.time('createAssistantMessageForStreaming');
        const assistantMessageId = crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString();
        // console.log( `Creating streaming message with ID: ${assistantMessageId}`,);

        updatedThread = this.state.addMessageWithState(
          updatedThread,
          '',
          'assistant',
          assistantMessageId,
          'streaming',
        );

        this.saveThread(updatedThread);

        this.eventBus.broadcastThreadUpdated(updatedThread);
        // console.timeEnd('createAssistantMessageForStreaming');

        // console.time('aiClientChatStream');
        // console.log( `Starting streaming request to AI with ${messages.length} messages`,);

        let streamingContent = '';

        const onChunk = (chunk: string) => {
          // console.log(`Received chunk: "${chunk}"`);
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
          messages,
          onChunk,
          deploymentName,
        );
        // console.timeEnd('aiClientChatStream');

        // Check if we're getting the same response repeatedly
        const lastMessages = messages
          .slice(-4)
          .filter((m) => m.role === 'assistant')
          .map((m) => (typeof m.content === 'string' ? m.content : ''));

        const isRepeatingResponse = lastMessages.some(
          (msg) =>
            msg &&
            aiResponse &&
            msg.trim() === aiResponse.trim() &&
            msg.length > 20,
        );

        if (isRepeatingResponse) {
          console.log(
            'Detected repeating responses, adding variation to break the loop',
          );
          updatedThread = this.state.addMessage(
            updatedThread,
            "Let's try a different approach. Please continue with the next logical step in creating this presentation.",
            'system',
          );
          iterationCount++;
          continue;
        }

        // console.time('finalizeStreamingMessage');
        updatedThread = this.state.setMessageStreamingState(
          updatedThread,
          assistantMessageId,
          'completed',
        );
        this.eventBus.broadcastThreadUpdated(updatedThread);
        // console.timeEnd('finalizeStreamingMessage');

        // console.time('extractToolCall');
        const toolCall = this.toolsService.extractToolCall(aiResponse);
        // console.timeEnd('extractToolCall');

        if (!toolCall) {
          // Check if the response indicates the AI is stopping prematurely
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

          if (
            containsEndSignal &&
            !aiResponse.includes('completed') &&
            !aiResponse.includes('finished')
          ) {
            console.log(
              'AI seems to be stopping prematurely, encouraging continuation',
            );
            updatedThread = addContinuationMessage(updatedThread);
            iterationCount++;
            consecutiveEmptyIterations++;

            if (
              consecutiveEmptyIterations >= MAX_CONSECUTIVE_EMPTY_ITERATIONS
            ) {
              console.log(
                `Reached ${MAX_CONSECUTIVE_EMPTY_ITERATIONS} consecutive empty iterations, breaking loop`,
              );
              break;
            }

            continue;
          }

          // console.log( 'No tool call detected and no premature ending, exiting loop',);
          break;
        }

        // Reset empty iterations counter since we got a tool call
        consecutiveEmptyIterations = 0;

        console.log(`Executing tool call: ${toolCall.toolName}`);
        // console.time('executeToolCalls');
        const toolResults = await this.toolsService.executeToolCalls(
          [toolCall],
          this.presentationService,
        );
        // console.timeEnd('executeToolCalls');

        // console.time('formatToolResults');
        const toolResultsFormatted =
          this.toolsService.formatToolResults(toolResults);
        // console.timeEnd('formatToolResults');

        if (Array.isArray(toolResultsFormatted)) {
          const textContent = toolResultsFormatted.find(
            (item) => item.type === 'text',
          )?.text;

          if (textContent) {
            // console.time('addSystemMessage');
            updatedThread = this.state.addMessage(
              updatedThread,
              textContent,
              'system',
            );
            // console.timeEnd('addSystemMessage');
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

            // console.time('addImageMessage');
            updatedThread = this.state.addMessage(
              updatedThread,
              imageContents as MessageContent[],
              'user',
            );
            // console.timeEnd('addImageMessage');

            // Vary continuation messages to avoid getting stuck in loops
            const continuationMessages = [
              'Tool execution completed successfully. Screenshots have been added to the conversation. Please continue with the task.',
              'The tool has executed successfully and screenshots are added above. What would be the next step to complete this presentation?',
              'Above are the screenshots from the tool execution. Please proceed with the next logical step in this workflow.',
            ];
            currentMessage =
              continuationMessages[
                iterationCount % continuationMessages.length
              ];
          } else {
            // Vary continuation messages to avoid getting stuck in loops
            const continuationMessages = [
              'Tool execution completed successfully. Please continue with the task.',
              'The tool has executed successfully. What would be the next step to complete this presentation?',
              'Tool execution is complete. Please proceed with the next logical step in this workflow.',
            ];
            currentMessage =
              continuationMessages[
                iterationCount % continuationMessages.length
              ];
          }

          // Add an explicit continuation message after tool execution
          updatedThread = this.state.addMessage(
            updatedThread,
            currentMessage,
            'system',
          );
        } else {
          // console.time('addSystemMessage');
          updatedThread = this.state.addMessage(
            updatedThread,
            toolResultsFormatted,
            'system',
          );
          // console.timeEnd('addSystemMessage');

          // Vary continuation messages to avoid getting stuck in loops
          const continuationMessages = [
            `Tool execution results: ${toolResultsFormatted}. Please continue with the task.`,
            `Here are the results of the tool execution: ${toolResultsFormatted}. What would be the next step?`,
            `The tool has completed with the following results: ${toolResultsFormatted}. Please proceed with the next logical step.`,
          ];
          currentMessage =
            continuationMessages[iterationCount % continuationMessages.length];

          // Add an explicit continuation message after tool execution
          updatedThread = this.state.addMessage(
            updatedThread,
            currentMessage,
            'system',
          );
        }

        iterationCount++;
        const iterationEndTime = performance.now();
        console.log(
          `Iteration ${iterationCount} completed in ${iterationEndTime - iterationStartTime}ms`,
        );

        if (iterationCount === MAX_ITERATIONS) {
          const warningMessage =
            'Maximum number of tool call iterations reached. Some actions may not have been completed.';
          updatedThread = this.state.addMessage(
            updatedThread,
            warningMessage,
            'system',
          );
        }
      } catch (error) {
        console.error('Error in AI loop:', error);
        const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        updatedThread = this.state.addMessage(
          updatedThread,
          errorMessage,
          'system',
        );
        break;
      }
    }

    const loopEndTime = performance.now();
    console.log(
      `AI loop completed after ${iterationCount} iterations in ${loopEndTime - loopStartTime}ms`,
    );

    return updatedThread;
  }

  private async processAILoop(
    thread: Thread,
    userMessage: string,
  ): Promise<Thread> {
    console.log(`AI loop started for thread ${thread.id}`);
    const loopStartTime = performance.now();

    let updatedThread = thread;

    // console.time('getPresentation');
    const presentation = this.presentationService.getPresentation();
    // console.timeEnd('getPresentation');

    // console.time('getDeveloperPrompt');
    const developerPrompt = getDeveloperPrompt(presentation);
    // console.timeEnd('getDeveloperPrompt');

    // console.time('updateSystemMessage');
    updatedThread = this.state.updateSystemMessage(
      updatedThread,
      developerPrompt,
    );
    // console.timeEnd('updateSystemMessage');

    let currentMessage = userMessage;
    let iterationCount = 0;
    const MAX_ITERATIONS = 20;

    while (iterationCount < MAX_ITERATIONS) {
      const iterationStartTime = performance.now();
      console.log(`Starting iteration ${iterationCount + 1}/${MAX_ITERATIONS}`);

      try {
        const { messages } = updatedThread;
        const deploymentName =
          process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

        // console.time('aiClientChat');
        // console.log(`Sending request to AI with ${messages.length} messages`);
        const aiResponse = await this.aiClient.chat(messages, deploymentName);
        // console.timeEnd('aiClientChat');

        // console.time('addAssistantMessage');
        updatedThread = this.state.addMessage(
          updatedThread,
          aiResponse,
          'assistant',
        );
        // console.timeEnd('addAssistantMessage');

        // console.time('extractToolCall');
        const toolCall = this.toolsService.extractToolCall(aiResponse);
        // console.timeEnd('extractToolCall');

        if (!toolCall) {
          console.log('No tool call detected, exiting loop');
          break;
        }

        console.log(`Executing tool call: ${toolCall.toolName}`);
        // console.time('executeToolCalls');
        const toolResults = await this.toolsService.executeToolCalls(
          [toolCall],
          this.presentationService,
        );
        // console.timeEnd('executeToolCalls');

        // console.time('formatToolResults');
        const toolResultsFormatted =
          this.toolsService.formatToolResults(toolResults);
        // console.timeEnd('formatToolResults');

        if (Array.isArray(toolResultsFormatted)) {
          const textContent = toolResultsFormatted.find(
            (item) => item.type === 'text',
          )?.text;

          if (textContent) {
            // console.time('addSystemMessage');
            updatedThread = this.state.addMessage(
              updatedThread,
              textContent,
              'system',
            );
            // console.timeEnd('addSystemMessage');
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

            console.time('addImageMessage');
            updatedThread = this.state.addMessage(
              updatedThread,
              imageContents as MessageContent[],
              'user',
            );
            console.timeEnd('addImageMessage');
            currentMessage =
              'Tool execution completed successfully. Screenshots have been added to the conversation.';
          } else {
            currentMessage = 'Tool execution completed successfully.';
          }
        } else {
          // console.time('addSystemMessage');
          updatedThread = this.state.addMessage(
            updatedThread,
            toolResultsFormatted,
            'system',
          );
          // console.timeEnd('addSystemMessage');
          currentMessage = `Tool execution results: ${toolResultsFormatted}`;
        }

        iterationCount++;
        const iterationEndTime = performance.now();
        console.log(
          `Iteration ${iterationCount} completed in ${iterationEndTime - iterationStartTime}ms`,
        );

        if (iterationCount === MAX_ITERATIONS) {
          const warningMessage =
            'Maximum number of tool call iterations reached. Some actions may not have been completed.';
          updatedThread = this.state.addMessage(
            updatedThread,
            warningMessage,
            'system',
          );
        }
      } catch (error) {
        console.error('Error in AI loop:', error);
        const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        updatedThread = this.state.addMessage(
          updatedThread,
          errorMessage,
          'system',
        );
        break;
      }
    }

    const loopEndTime = performance.now();
    console.log(
      `AI loop completed after ${iterationCount} iterations in ${loopEndTime - loopStartTime}ms`,
    );

    return updatedThread;
  }

  onEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(eventName, listener);
  }

  offEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(eventName, listener);
  }
}
