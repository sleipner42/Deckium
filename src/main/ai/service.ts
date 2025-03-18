import { Thread, AIRequest, AIResponse, AIToolCall } from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import { IAIService, MessageContent } from '../../common/domain/interfaces/ai-service.interface';
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

    const thread = this.state.createThread(title, presentationId, developerPrompt);
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
      
      if (request.content && Array.isArray(request.content) && request.content.length > 0) {
        updatedThread = this.state.addMessage(thread, request.content, 'user');
      } else {
        updatedThread = this.state.addMessage(thread, request.message, 'user');
      }
      
      this.eventBus.broadcastProcessingStarted(updatedThread.id);
      
      const startTime = performance.now();
      updatedThread = await this.processAILoop(updatedThread, request.message);
      const endTime = performance.now();
      console.log(`Total AI loop processing time: ${endTime - startTime}ms`);
      
      const lastAssistantMessage = [...updatedThread.messages]
        .reverse()
        .find(m => m.role === 'assistant');
      
      if (!lastAssistantMessage) {
        throw new Error('No response from AI');
      }
      
      const aiResponse = lastAssistantMessage.content;
      
      this.eventBus.broadcastMessageReceived(
        updatedThread.id,
        aiResponse,
        updatedThread
      );
      
      this.eventBus.broadcastProcessingCompleted(updatedThread.id);

      return {
        message: aiResponse
      };
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.eventBus.broadcastProcessingError(request.threadId, errorMessage);
      
      return {
        message: `Error: ${errorMessage}`
      };
    }
  }

  private async processAILoop(thread: Thread, userMessage: string): Promise<Thread> {
    console.log(`AI loop started for thread ${thread.id}`);
    const loopStartTime = performance.now();
    
    let updatedThread = thread;
    
    console.time('getPresentation');
    const presentation = this.presentationService.getPresentation();
    console.timeEnd('getPresentation');
    
    console.time('getDeveloperPrompt');
    const developerPrompt = getDeveloperPrompt(presentation);
    console.timeEnd('getDeveloperPrompt');
    
    console.time('updateSystemMessage');
    updatedThread = this.state.updateSystemMessage(updatedThread, developerPrompt);
    console.timeEnd('updateSystemMessage');
    
    let currentMessage = userMessage;
    let iterationCount = 0;
    const MAX_ITERATIONS = 20;

    while (iterationCount < MAX_ITERATIONS) {
      const iterationStartTime = performance.now();
      console.log(`Starting iteration ${iterationCount + 1}/${MAX_ITERATIONS}`);
      
      try {
        const messages = updatedThread.messages;
        const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
        
        console.time('aiClientChat');
        console.log(`Sending request to AI with ${messages.length} messages`);
        const aiResponse = await this.aiClient.chat(messages, deploymentName);
        console.timeEnd('aiClientChat');
        
        console.time('addAssistantMessage');
        updatedThread = this.state.addMessage(updatedThread, aiResponse, 'assistant');
        console.timeEnd('addAssistantMessage');
        
        console.time('extractToolCall');
        const toolCall = this.toolsService.extractToolCall(aiResponse);
        console.timeEnd('extractToolCall');
        
        if (!toolCall) {
          console.log('No tool call detected, exiting loop');
          break;
        }
        
        console.log(`Executing tool call: ${toolCall.toolName}`);
        console.time('executeToolCalls');
        const toolResults = await this.toolsService.executeToolCalls([toolCall], this.presentationService);
        console.timeEnd('executeToolCalls');
        
        console.time('formatToolResults');
        const toolResultsFormatted = this.toolsService.formatToolResults(toolResults);
        console.timeEnd('formatToolResults');

        if (Array.isArray(toolResultsFormatted)) {
          const textContent = toolResultsFormatted.find(
            (item) => item.type === 'text'
          )?.text;
          
          if (textContent) {
            console.time('addSystemMessage');
            updatedThread = this.state.addMessage(updatedThread, textContent, 'system');
            console.timeEnd('addSystemMessage');
          }

          const hasImages = toolResultsFormatted.some(
            (item) => item.type === 'image_url'
          );
          
          if (hasImages) {
            const imageContents = toolResultsFormatted.filter(
              (item) => item.type === 'image_url'
            );

            imageContents.unshift({
              type: 'text',
              text: 'Here is the screenshot from the tool execution:',
            });

            console.time('addImageMessage');
            updatedThread = this.state.addMessage(updatedThread, imageContents as MessageContent[], 'user');
            console.timeEnd('addImageMessage');
            currentMessage = 'Tool execution completed successfully. Screenshots have been added to the conversation.';
          } else {
            currentMessage = 'Tool execution completed successfully.';
          }
        } else {
          console.time('addSystemMessage');
          updatedThread = this.state.addMessage(updatedThread, toolResultsFormatted, 'system');
          console.timeEnd('addSystemMessage');
          currentMessage = `Tool execution results: ${toolResultsFormatted}`;
        }

        iterationCount++;
        const iterationEndTime = performance.now();
        console.log(`Iteration ${iterationCount} completed in ${iterationEndTime - iterationStartTime}ms`);

        if (iterationCount === MAX_ITERATIONS) {
          const warningMessage = 'Maximum number of tool call iterations reached. Some actions may not have been completed.';
          updatedThread = this.state.addMessage(updatedThread, warningMessage, 'system');
        }
      } catch (error) {
        console.error('Error in AI loop:', error);
        const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        updatedThread = this.state.addMessage(updatedThread, errorMessage, 'system');
        break;
      }
    }

    const loopEndTime = performance.now();
    console.log(`AI loop completed after ${iterationCount} iterations in ${loopEndTime - loopStartTime}ms`);
    
    return updatedThread;
  }

  onEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(eventName, listener);
  }

  offEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(eventName, listener);
  }
} 