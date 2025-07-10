import {
    AIRequest,
    AIResponse,
    AIToolCall,
    Thread,
} from '../../common/domain/entities/ai-types';

import type { UUID } from '../../common/domain/entities/types';
import type {
    IAIService,
    MessageContent,
} from '../../common/domain/interfaces/ai-service.interface';
import AuthService from '../auth/service';
import { LintingService } from '../linting/service';
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

    private lintingService: LintingService;

    private activeRequests: Map<UUID, AbortController> = new Map();

    private processingThreads: Set<UUID> = new Set();

    constructor(
        aiClient: IAIService,
        presentationService: PresentationService,
        lintingService: LintingService,
        authService?: AuthService,
    ) {
        this.state = new AIState();
        this.eventBus = new AIEventBus();
        this.toolsService = new AIToolsService(authService);
        this.aiClient = aiClient;
        this.presentationService = presentationService;
        this.lintingService = lintingService;
        this.createThread('Thread 1', presentationService.getPresentation().id);
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
        if (this.processingThreads.has(request.threadId)) {
            console.log(
                `Thread ${request.threadId} is already being processed, ignoring duplicate request`,
            );
            throw new Error('Thread is already being processed');
        }

        this.processingThreads.add(request.threadId);

        const abortController = new AbortController();
        this.activeRequests.set(request.threadId, abortController);

        try {
            logger.logAIRequest('Received AI message request', {
                threadId: request.threadId,
                message: request.message,
                content: request.content,
                contentType: Array.isArray(request.content)
                    ? 'multi-content'
                    : 'text',
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

            let updatedThread: Thread;
            let startTime: number;
            let endTime: number;

            try {
                // Add current slide context before user message
                const currentSlideContext =
                    this.getCurrentSlideContextMessage();
                if (currentSlideContext) {
                    updatedThread = this.state.addMessage(
                        thread,
                        currentSlideContext,
                        'system',
                    );
                } else {
                    updatedThread = thread;
                }

                if (userContent) {
                    updatedThread = this.state.addMessage(
                        updatedThread,
                        userContent,
                        'user',
                    );
                    logger.logSystem('User message added to thread', 'debug', {
                        threadId: thread.id,
                        messageType: 'multi-content',
                        content: userContent,
                    });
                } else {
                    updatedThread = this.state.addMessage(
                        updatedThread,
                        userMessage,
                        'user',
                    );
                    logger.logSystem('User message added to thread', 'debug', {
                        threadId: thread.id,
                        messageType: 'text',
                        message: userMessage,
                    });
                }

                this.saveThread(updatedThread);
                this.eventBus.broadcastThreadUpdated(updatedThread);

                startTime = performance.now();
                updatedThread = await this.processAILoopWithStreaming(
                    updatedThread,
                    false,
                    abortController.signal,
                );
                endTime = performance.now();
                console.log(
                    `Total AI loop processing time: ${endTime - startTime}ms`,
                );
            } catch (error) {
                if (
                    error instanceof Error &&
                    (error.name === 'AbortError' ||
                        error.message.includes('aborted'))
                ) {
                    const revertedThread = { ...thread };
                    this.saveThread(revertedThread);
                    this.eventBus.broadcastThreadUpdated(revertedThread);
                }
                throw error;
            }

            const lastAssistantMessage = [...updatedThread.messages]
                .reverse()
                .find((m) => m.role === 'assistant');

            if (!lastAssistantMessage) {
                if (abortController.signal.aborted) {
                    updatedThread = this.state.addMessage(
                        updatedThread,
                        'Request was cancelled by user.',
                        'assistant',
                    );
                    this.saveThread(updatedThread);
                    this.eventBus.broadcastThreadUpdated(updatedThread);
                    this.eventBus.broadcastProcessingCompleted(
                        updatedThread.id,
                    );
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
                processingTimeMs:
                    endTime && startTime ? endTime - startTime : 0,
                messageCount: updatedThread.messages.length,
            });

            this.eventBus.broadcastProcessingCompleted(updatedThread.id);

            return {
                message: aiResponse,
            };
        } catch (error) {
            if (
                error instanceof Error &&
                (error.name === 'AbortError' ||
                    error.message.includes('aborted'))
            ) {
                console.log(`Request aborted for thread: ${request.threadId}`);

                const currentThread = this.getThread(request.threadId);
                if (currentThread) {
                    const cleanedMessages = currentThread.messages
                        .map((m) => {
                            if (
                                m.role === 'assistant' &&
                                m.streamingState === 'streaming'
                            ) {
                                if (
                                    !m.content ||
                                    m.content.toString().trim() === ''
                                ) {
                                    return null;
                                } else {
                                    return {
                                        ...m,
                                        streamingState: 'completed' as const,
                                    };
                                }
                            }
                            return m;
                        })
                        .filter((m) => m !== null);

                    const cleanedThread = {
                        ...currentThread,
                        messages: cleanedMessages,
                    };
                    this.saveThread(cleanedThread);
                    this.eventBus.broadcastThreadUpdated(cleanedThread);
                }

                this.eventBus.broadcastProcessingCompleted(request.threadId);
                throw error;
            }
            console.error('Error sending message to AI:', error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred';

            logger.logSystem('AI request failed', 'error', {
                threadId: request.threadId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });

            this.eventBus.broadcastProcessingError(
                request.threadId,
                errorMessage,
            );

            return {
                message: `Error: ${errorMessage}`,
            };
        } finally {
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
            const message = context
                ? `Request aborted ${context}`
                : 'Request was aborted';
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
        let _consecutiveEmptyIterations = 0;
        let shouldBreakOnEmpty = false;

        const constants = {
            MAX_ITERATIONS: 20,
            MAX_CONSECUTIVE_EMPTY_ITERATIONS: 2,
            DEPLOYMENT_NAME:
                process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
        };

        while (iterationCount < constants.MAX_ITERATIONS) {
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

                this.checkAborted(abortSignal, 'after streaming iteration');

                if (
                    this.isRepeatingResponse(updatedThread.messages, aiResponse)
                ) {
                    updatedThread = this.handleRepeatingResponse(updatedThread);
                    iterationCount++;
                    continue;
                }

                const toolCall = this.toolsService.extractToolCall(aiResponse);

                if (!toolCall) {
                    // Check if there was a parsing error that we should report
                    const parsingError =
                        this.toolsService.getLastParsingError();

                    if (parsingError) {
                        // Provide detailed feedback about the JSON parsing error
                        const errorMessage = `JSON parsing error detected in your tool call. Here's what went wrong:

**Error**: ${parsingError.error}

**What was extracted**: ${parsingError.rawMatch}

**Common issues and solutions**:
1. **Missing closing braces**: Ensure all { and } are properly matched
2. **Missing quotes**: All strings must be wrapped in double quotes
3. **Invalid JSON syntax**: Check for trailing commas, missing commas, or invalid characters
4. **Nested objects**: Make sure nested braces are properly closed

**Expected format**: {"tool": "toolName", "params": {"param1": "value1", "param2": "value2"}}

Please try again with valid JSON formatting.`;

                        updatedThread = this.state.addMessage(
                            updatedThread,
                            errorMessage,
                            'system',
                        );
                        iterationCount++;
                        continue;
                    }

                    if (shouldBreakOnEmpty) {
                        break;
                    }

                    updatedThread = this.state.addMessage(
                        updatedThread,
                        'Please go ahead with your task, otherwise respond with empty space',
                        'system',
                    );

                    shouldBreakOnEmpty = true;
                    iterationCount++;
                    continue;
                }

                shouldBreakOnEmpty = false;
                _consecutiveEmptyIterations = 0;

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
        const developerPrompt = getDeveloperPrompt(presentation);
        return this.state.updateSystemMessage(thread, developerPrompt);
    }

    private async executeStreamingIteration(
        thread: Thread,
        deploymentName: string,
        iterationCount: number,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        const assistantMessageId =
            crypto.randomUUID?.() || Date.now().toString();

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

        await new Promise((resolve) => setTimeout(resolve, 300));

        this.checkAborted(abortSignal, 'after tool execution delay');

        const toolResultsFormatted =
            this.toolsService.formatToolResults(toolResults);
        let updatedThread = this.addToolResultsToThread(
            thread,
            toolResultsFormatted,
            iterationCount,
        );

        updatedThread = this.addSlideGridsIfNeeded(updatedThread, toolResults);

        updatedThread = await this.runLintingOnEditedSlides(
            updatedThread,
            toolResults,
        );

        return updatedThread;
    }

    private async runLintingOnEditedSlides(
        thread: Thread,
        toolResults: any[],
    ): Promise<Thread> {
        const editedSlides = toolResults.reduce((acc, result) => {
            if (result.editedSlidesIds) {
                acc.push(...result.editedSlidesIds);
            }
            return acc;
        }, [] as string[]);

        if (editedSlides.length === 0) return thread;

        const presentation = this.presentationService.getPresentation();
        const lintingResults = [];

        for (const slideId of editedSlides) {
            const slide = presentation.slides.find((s) => s.id === slideId);
            if (slide) {
                try {
                    const lintingResult =
                        await this.lintingService.lintSlide(slide);
                    lintingResults.push(lintingResult);
                } catch (error) {
                    console.warn(`Failed to lint slide ${slideId}:`, error);
                }
            }
        }

        if (lintingResults.length === 0) return thread;

        const lintingMessage = this.formatLintingResults(lintingResults);

        if (lintingMessage.trim()) {
            return this.state.addMessage(thread, lintingMessage, 'system');
        }

        return thread;
    }

    private formatLintingResults(lintingResults: any[]): string {
        const hasErrors = lintingResults.some((result) => result.hasErrors);

        if (!hasErrors) {
            return 'Linting completed successfully - no issues found with the updated slides.';
        }

        const errorMessages = [];

        for (const result of lintingResults) {
            if (result.hasErrors) {
                const slideErrors = result.errors
                    .map(
                        (error: any) =>
                            `- ${error.message}${error.suggestedFix ? ` (Suggestion: ${error.suggestedFix})` : ''}`,
                    )
                    .join('\n');

                errorMessages.push(`Slide ${result.slideId}:\n${slideErrors}`);
            }
        }

        return `Linting found the following issues:\n\n${errorMessages.join('\n\n')}`;
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
        return this.state.addMessage(
            updatedThread,
            continuationMessage,
            'system',
        );
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
        return continuationMessages[
            iterationCount % continuationMessages.length
        ];
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
            return slide
                ? generateSlideGrid(slide, { pixelsPerSquare: 20 })
                : '';
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

    private logToolExecutionStart(
        toolCall: AIToolCall,
        iteration: number,
    ): void {
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

        const selectedSlideId = this.presentationService.getSelectedSlideId();
        const slideId =
            selectedSlideId ||
            presentation.slides[presentation.slides.length - 1].id;

        if (USE_CRITIC) {
            console.log(
                '\n\n========  Running automatic critic... ========\n\n',
            );

            try {
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

                    const latestThread = this.getThread(thread.id);
                    if (!latestThread) {
                        console.error(
                            `Thread ${thread.id} not found after critic review`,
                        );
                        return;
                    }

                    const criticismMessage = `## Slide Feedback\n\n${criticResult.criticism}\n\n### Recommendations:\n${criticResult.recommendations.map((rec: string) => `• ${rec}`).join('\n')}\n\nPlease implement these suggestions to improve the slide.`;

                    const updatedThread = this.state.addMessage(
                        latestThread,
                        criticismMessage,
                        'system',
                    );

                    const savedThread = this.saveThread(updatedThread);

                    this.eventBus.broadcastThreadUpdated(savedThread);

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
        _criticismMessagee?: string,
    ): Promise<void> {
        try {
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

            const presentation = this.presentationService.getPresentation();
            const selectedSlideId =
                this.presentationService.getSelectedSlideId();
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

    private getCurrentSlideContextMessage(): string | null {
        const presentation = this.presentationService.getPresentation();
        const currentSlideId = this.presentationService.getSelectedSlideId();

        if (!currentSlideId) {
            console.log('No current slide ID found');
            return null;
        }

        const currentSlide = presentation.slides?.find(
            (slide) => slide.id === currentSlideId,
        );

        if (!currentSlide) {
            console.error('Current slide not found:', currentSlideId);
            return null;
        }

        const slideIndex = presentation.slides?.indexOf(currentSlide) + 1 || 0;
        const elementCount = currentSlide.elements?.length || 0;

        let slideContext = `## CURRENT SLIDE CONTEXT\n`;
        slideContext += `**Currently Viewing**: Slide ${slideIndex} (ID: ${currentSlideId}) out of ${presentation.slides.length} slides\n`;
        slideContext += `**Elements on this slide**: ${elementCount} element${elementCount !== 1 ? 's' : ''}`;
        console.log('Adding: ', slideContext);

        if (elementCount > 0) {
            const elementTypes = currentSlide.elements.map((el) => el.type);
            const typeCount: Record<string, number> = {};
            elementTypes.forEach((type) => {
                typeCount[type] = (typeCount[type] || 0) + 1;
            });

            const typeSummary = Object.entries(typeCount)
                .map(
                    ([type, count]) =>
                        `${count} ${type}${count !== 1 ? 's' : ''}`,
                )
                .join(', ');

            slideContext += ` (${typeSummary})`;
        }

        slideContext += `\n**Note**: When the user refers to "this slide" or "current slide", they mean slide ${slideIndex}`;

        return slideContext;
    }
}
