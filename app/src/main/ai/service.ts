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
import { CriticService } from './critic/service';

export class AIService {
  private state: AIState;

  private eventBus: AIEventBus;

  private toolsService: AIToolsService;

  private aiClient: IAIService;

  private presentationService: PresentationService;
  
  private criticService: CriticService | null = null;

  constructor(aiClient: IAIService, presentationService: PresentationService) {
    this.state = new AIState();
    this.eventBus = new AIEventBus();
    this.toolsService = new AIToolsService();
    this.aiClient = aiClient;
    this.presentationService = presentationService;
  }
  
  setCriticService(criticService: CriticService) {
    this.criticService = criticService;
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
      console.log(`Sending message to thread: ${request.threadId}`);
      console.log(`Available threads: ${Array.from(this.state.getThreadIds()).join(', ')}`);
      let thread = this.getThread(request.threadId);

      // If thread not found but there are threads for the same presentation, use the first one
      if (!thread) {
        console.error(`Thread ${request.threadId} not found, looking for alternative threads`);
        
        // Try to find threads for the same presentation if presentationId is provided in the content
        if (request.content && Array.isArray(request.content)) {
          const presentationId = request.content.find(item => 
            item.type === 'text' && item.text && item.text.includes('presentationId'))?.text;
          
          if (presentationId) {
            const threadsForPresentation = this.state.getThreadsForPresentation(presentationId);
            if (threadsForPresentation.length > 0) {
              thread = threadsForPresentation[0];
              console.log(`Using alternative thread ${thread.id} for presentation ${presentationId}`);
            }
          }
        }
        
        // If still no thread, check if there are any threads at all
        if (!thread) {
          const allThreads = Array.from(this.state.getThreadIds());
          if (allThreads.length > 0) {
            thread = this.getThread(allThreads[0]);
            console.log(`Using first available thread: ${thread?.id}`);
          }
        }
        
        // If still no thread, throw error
        if (!thread) {
          console.error(`No suitable thread found for request`);
          throw new Error(`Thread not found: ${request.threadId}`);
        }
      }
      
      console.log(`Using thread ${thread.id} with ${thread.messages.length} messages`);
      

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

    // Check if this is a response to critic or a regular user message
    const isResponseToCritic = updatedThread.messages.some(msg => 
      (msg.role === 'system' && typeof msg.content === 'string' && msg.content.startsWith('[CRITIC]')) ||
      (msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes("implement the changes"))
    );
    
    // Only run critic if this is not a response to a critique and we have slides
    if (!isResponseToCritic && this.criticService && presentation.slides.length > 0) {
      try {
        await this.runCriticOnLatestSlide(updatedThread);
      } catch (error) {
        console.error('Error running critic:', error);
      }
    }

    return updatedThread;
  }
  
  private async runCriticOnLatestSlide(thread: Thread): Promise<void> {
    if (!this.criticService) return;
    
    const presentation = this.presentationService.getPresentation();
    if (!presentation.slides.length) return;
    
    // Get selected slide or last slide
    const selectedSlideId = this.presentationService.getSelectedSlideId();
    const slideId = selectedSlideId || presentation.slides[presentation.slides.length - 1].id;
    
    // Create a critic thread if needed
    let criticThread: Thread | null = null;
    const criticThreads = this.criticService.getThreadsForPresentation(thread.presentationId);
    
    if (criticThreads.length > 0) {
      criticThread = criticThreads[0];
    } else {
      criticThread = this.criticService.createThread("Critic Thread", thread.presentationId);
    }
    
    try {
      // Get critique from the critic service
      const critique = await this.criticService.reviewSlide(criticThread.id, slideId);
      
      // Always get the latest version of the thread
      const latestThread = this.getThread(thread.id);
      if (!latestThread) {
        console.error(`Thread ${thread.id} not found after critic review`);
        return;
      }
      
      // Add the critique as a system message but with a special prefix to display as critic in UI
      const updatedThread = this.state.addMessage(
        latestThread,
        `[CRITIC] I've reviewed the slide and have the following feedback:\n\n${critique}\n\nPlease implement these suggestions to improve the slide.`,
        'system'
      );
      
      // Save the updated thread
      const savedThread = this.saveThread(updatedThread);
      
      // Broadcast the updates
      this.eventBus.broadcastThreadUpdated(savedThread);
      this.eventBus.broadcastMessageReceived(
        savedThread.id,
        critique,
        savedThread
      );
      
      // Now let the AI respond to the critique automatically
      // Always use the saved thread to ensure we have the latest state
      await this.generateAIResponseToCritique(savedThread);
    } catch (error) {
      console.error('Error running critic review:', error);
    }
  }
  
  private async generateAIResponseToCritique(thread: Thread): Promise<void> {
    try {
      // First, ensure the thread is properly stored in state
      const storedThread = this.saveThread(thread);
      
      // Always get the latest version of the thread
      const latestThread = this.getThread(storedThread.id);
      if (!latestThread) {
        console.error(`Thread ${storedThread.id} not found during AI response generation`);
        // Create a new copy to work with if we can't find the thread
        console.log("Creating a new thread copy for critic response");
        const newThread = { ...storedThread, id: storedThread.id };
        this.saveThread(newThread);
        return;
      }
      
      console.log(`Critic response using thread ${latestThread.id} with ${latestThread.messages.length} messages`);
      
      // Create a filtered list of messages for the AI
      // This will convert any 'critic' role messages to 'system' to avoid API errors
      const filteredMessages = latestThread.messages.map(msg => {
        if (msg.role === 'critic') {
          return {
            ...msg,
            role: 'system' as const
          };
        }
        return msg;
      });
      
      const assistantMessageId = crypto.randomUUID();
      let streamingThread = this.state.addMessageWithState(
        latestThread,
        '',
        'assistant',
        assistantMessageId,
        'streaming'
      );
      
      // Always save and use the result to ensure we have the latest state
      streamingThread = this.saveThread(streamingThread);
      this.eventBus.broadcastThreadUpdated(streamingThread);
      
      let streamingContent = '';
      
      const onChunk = (chunk: string) => {
        streamingContent += chunk;
        streamingThread = this.state.updateMessageContent(
          streamingThread,
          assistantMessageId,
          streamingContent
        );
        this.eventBus.broadcastMessageChunkReceived(
          streamingThread.id,
          assistantMessageId,
          chunk,
          streamingContent
        );
        this.eventBus.broadcastThreadUpdated(streamingThread);
      };
      
      // Use the filtered messages array instead of the thread messages directly
      // This ensures we only send valid roles to the AI
      const aiResponse = await this.aiClient.chatStream(
        filteredMessages,
        onChunk,
        process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'
      );
      
      streamingThread = this.state.setMessageStreamingState(
        streamingThread,
        assistantMessageId,
        'completed'
      );
      
      // Always save and use the result to ensure we have the latest state
      streamingThread = this.saveThread(streamingThread);
      this.eventBus.broadcastThreadUpdated(streamingThread);
      
      // Add a short delay before proceeding with the implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the latest thread state again
      const currentThread = this.getThread(streamingThread.id);
      if (!currentThread) {
        console.error(`Thread ${streamingThread.id} not found after AI response`);
        return;
      }
      
      // Add a system message encouraging the AI to implement the changes
      const presentation = this.presentationService.getPresentation();
      const selectedSlideId = this.presentationService.getSelectedSlideId();
      const slideId = selectedSlideId || (presentation.slides.length > 0 ? presentation.slides[presentation.slides.length - 1].id : 'unknown');
      
      const updatedThread = this.state.addMessage(
        currentThread,
        `Now implement the changes you described to improve slide #${slideId} based on the critique. Use the appropriate tools to update the slide.`,
        'system'
      );
      
      // Always save and use the result to ensure we have the latest state
      const savedThread = this.saveThread(updatedThread);
      
      // Process the AI loop one more time to implement the changes
      // Mark this as a response to critique to prevent further critique loops
      try {
        // Explicitly broadcast the current thread before processing
        this.eventBus.broadcastThreadUpdated(savedThread);
        
        // Small delay to ensure thread state is synchronized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Process the AI response to implement changes
        await this.processAILoopWithStreaming(
          savedThread,
          "Please implement the changes to the slide now."
        );
        
        // Broadcast the current thread ID again after processing
        const finalThread = this.getThread(savedThread.id);
        if (finalThread) {
          console.log(`Final thread after critic cycle: ${finalThread.id} with ${finalThread.messages.length} messages`);
          this.eventBus.broadcastThreadUpdated(finalThread);
        }
      } catch (error) {
        console.error("Error implementing changes:", error);
      }
    } catch (error) {
      console.error('Error generating AI response to critique:', error);
    }
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