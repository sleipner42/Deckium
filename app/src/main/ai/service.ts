import { type ModelMessage, pruneMessages, stepCountIs, streamText } from 'ai';
import {
    AIRequest,
    AIResponse,
    Message,
    Thread,
} from '../../common/domain/entities/ai-types';

import type { UUID } from '../../common/domain/entities/types';
import type { MessageContent } from '../../common/domain/interfaces/ai-service.interface';
import { LintingService } from '../linting/service';
import type { PDFExportService } from '../pdf-export/service';
import { PresentationService } from '../presentation/service';
import { generateSlideGrid } from '../presentation/utils';
import { LLMSettingsService } from '../settings/llm-settings-service';

import { logger } from '../utils/logger';
import { AIEventBus } from './event-bus';
import { conversationHistory, toUserContent } from './external/messages';
import {
    providerOptionsFor,
    resolveModel,
    withCacheBreakpoints,
} from './external/providers';
import { getDeveloperPrompt } from './prompt/systemPrompt';
import {
    diffSnapshots,
    type PresentationSnapshot,
    takeSnapshot,
} from './staleness';
import { AIState } from './state';
import { buildToolSet, type ToolModelOutput } from './tools/tool-adapter';
import { AIToolsService } from './tools/tools';

const MAX_STEPS = 20;

// When the accumulated model history (JSON chars, incl. base64 screenshots)
// exceeds this, prune old reasoning/tool results once. Pruning changes the
// prompt prefix and forfeits the provider cache for one request, so it is a
// size safeguard, not a per-turn default.
const HISTORY_PRUNE_THRESHOLD_CHARS = 400_000;

const STEP_LIMIT_WARNING =
    'System note: only 2 tool steps remain for this request. Finish the most important remaining work and reply with a summary of what is done and what is left.';

const TRUNCATION_NOTICE =
    'I reached the per-request step limit before finishing. Say "continue" and I will pick up where I left off.';

// Generation/agent parameters shared by every streamText call. Add tuning here
// (temperature, maxOutputTokens, …) so all agent settings live in one place.
const AGENT_DEFAULTS = {
    stopWhen: stepCountIs(MAX_STEPS),
} as const;

export class AIService {
    private state: AIState;

    private eventBus: AIEventBus;

    private toolsService: AIToolsService;

    private settings: LLMSettingsService;

    private presentationService: PresentationService;

    private lintingService: LintingService;

    private activeRequests: Map<UUID, AbortController> = new Map();

    private processingThreads: Set<UUID> = new Set();

    // Presentation state as of the end of each thread's last agent turn,
    // used to detect manual user edits between turns.
    private threadSnapshots: Map<UUID, PresentationSnapshot> = new Map();

    // Set after construction (the PDF service needs windows that exist later).
    private pdfExportService?: PDFExportService;

    setPdfExportService(service: PDFExportService): void {
        this.pdfExportService = service;
    }

    constructor(
        settings: LLMSettingsService,
        presentationService: PresentationService,
        lintingService: LintingService,
    ) {
        this.state = new AIState();
        this.eventBus = new AIEventBus();
        this.settings = settings;
        this.presentationService = presentationService;
        this.lintingService = lintingService;
        this.toolsService = new AIToolsService();
        this.createThread('Thread 1', presentationService.getPresentation().id);
    }

    createThread(title: string, presentationId: UUID): Thread {
        const developerPrompt = getDeveloperPrompt();

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
            this.threadSnapshots.delete(threadId);
            this.eventBus.broadcastThreadDeleted(threadId);
        }
        return result;
    }

    async sendMessage(request: AIRequest): Promise<AIResponse> {
        if (this.processingThreads.has(request.threadId)) {
            throw new Error('Thread is already being processed');
        }

        this.processingThreads.add(request.threadId);
        const abortController = new AbortController();
        this.activeRequests.set(request.threadId, abortController);

        try {
            const thread = this.getThread(request.threadId);
            if (!thread) {
                throw new Error(`Thread not found: ${request.threadId}`);
            }

            logger.logAIRequest('Received AI message request', {
                threadId: request.threadId,
                message: request.message,
                contentType: Array.isArray(request.content)
                    ? 'multi-content'
                    : 'text',
            });

            const userContent =
                request.content && request.content.length > 0
                    ? request.content
                    : request.message;

            this.eventBus.broadcastProcessingStarted(thread.id);

            // The model-facing user message carries a per-turn context block
            // (volatile presentation state + any user edits since the last
            // turn); the UI message stays exactly what the user typed.
            this.state.appendModelMessages(thread.id, [
                this.buildModelUserMessage(thread.id, userContent),
            ]);

            let updatedThread = this.state.addMessage(
                thread,
                userContent,
                'user',
            );
            this.saveThread(updatedThread);

            const result = await this.runAgentLoop(
                updatedThread,
                abortController.signal,
            );
            updatedThread = result.thread;

            this.eventBus.broadcastProcessingCompleted(updatedThread.id);
            return { message: result.finalText };
        } catch (error) {
            return this.handleSendMessageError(request.threadId, error);
        } finally {
            this.activeRequests.delete(request.threadId);
            this.processingThreads.delete(request.threadId);
        }
    }

    abortRequest(threadId: UUID): boolean {
        const abortController = this.activeRequests.get(threadId);
        if (abortController) {
            abortController.abort();
            this.activeRequests.delete(threadId);
            return true;
        }
        return false;
    }

    onEvent(eventName: string, listener: (...args: any[]) => void): void {
        this.eventBus.on(eventName, listener);
    }

    offEvent(eventName: string, listener: (...args: any[]) => void): void {
        this.eventBus.off(eventName, listener);
    }

    private async runAgentLoop(
        thread: Thread,
        abortSignal: AbortSignal,
    ): Promise<{ thread: Thread; finalText: string }> {
        const system = this.buildSystemPrompt();
        const storedHistory = this.state.getModelMessages(thread.id);
        // Fallback for threads that predate the model-message store: replay
        // the plain-text conversation instead.
        const history =
            storedHistory.length > 0
                ? storedHistory
                : conversationHistory(thread.messages);
        const config = this.settings.getCurrentProvider();
        const model = resolveModel(config);
        const tools = buildToolSet(
            this.toolsService,
            this.presentationService,
            this.lintingService,
            {
                settings: this.settings,
                pdfExport: this.pdfExportService,
            },
        );

        const loop = new AgentLoopState(this.state, this.eventBus, thread);

        // Cumulative response messages from the last completed step; persisted
        // in `finally` so completed tool calls/results survive an abort. A
        // step's messages always contain paired tool-call/tool-result parts,
        // so the stored history never ends on an orphaned tool call.
        let capturedMessages: ModelMessage[] = [];
        let truncated = false;

        // Group every presentation edit made by this AI turn into a single
        // undo step, including partial edits from aborted or failed turns.
        this.presentationService.beginTransaction();
        try {
            const result = streamText({
                // Defaults first so explicit per-call values below always win.
                ...AGENT_DEFAULTS,
                model,
                system,
                messages: withCacheBreakpoints(history, config.provider),
                tools,
                abortSignal,
                providerOptions: providerOptionsFor(config),
                onStepFinish: (step) => {
                    capturedMessages = step.response.messages;
                },
                prepareStep: ({ stepNumber, messages }) =>
                    stepNumber === MAX_STEPS - 2
                        ? {
                              messages: [
                                  ...messages,
                                  {
                                      role: 'user' as const,
                                      content: STEP_LIMIT_WARNING,
                                  },
                              ],
                          }
                        : undefined,
            });

            for await (const part of result.fullStream) {
                if (part.type === 'text-delta') {
                    loop.appendText(part.text);
                } else if (part.type === 'tool-call') {
                    loop.onToolCall(part.toolCallId, part.toolName, part.input);
                } else if (part.type === 'tool-result') {
                    loop.onToolResult(part.toolCallId, part.output);
                } else if (part.type === 'tool-error') {
                    loop.onToolResult(part.toolCallId, undefined, true);
                } else if (part.type === 'error') {
                    throw part.error;
                }
            }

            const [steps, finishReason, response] = await Promise.all([
                result.steps,
                result.finishReason,
                result.response,
            ]);
            capturedMessages = response.messages;
            truncated =
                steps.length >= MAX_STEPS && finishReason === 'tool-calls';
        } finally {
            this.presentationService.endTransaction();
            if (capturedMessages.length > 0) {
                this.state.appendModelMessages(thread.id, capturedMessages);
                this.pruneHistoryIfNeeded(thread.id);
            }
            // Remember what the presentation looked like when the agent
            // stopped, so the next turn can report user edits made since.
            this.threadSnapshots.set(
                thread.id,
                takeSnapshot(this.presentationService.getPresentation()),
            );
        }

        loop.finalize();
        let workingThread = loop.getThread();
        let finalText = loop.getFinalText();

        if (truncated) {
            workingThread = this.state.addMessage(
                workingThread,
                TRUNCATION_NOTICE,
                'assistant',
            );
            finalText =
                finalText === 'Done.'
                    ? TRUNCATION_NOTICE
                    : `${finalText}\n\n${TRUNCATION_NOTICE}`;
        }

        this.saveThread(workingThread);

        logger.logAIResponse('AI response generated', {
            threadId: workingThread.id,
            messageCount: workingThread.messages.length,
            finalLength: finalText.length,
            truncated,
        });

        return { thread: workingThread, finalText };
    }

    // The system prompt is deliberately constant: any per-turn state in it
    // would change the prompt prefix every request and defeat provider prompt
    // caching. Volatile context travels in the user message instead (see
    // buildModelUserMessage).
    private buildSystemPrompt(): string {
        return getDeveloperPrompt();
    }

    /**
     * Build the model-facing user message: a `[Context: ...]` block with the
     * volatile presentation state (slide list, current slide) and — when the
     * user manually edited the presentation since the agent's last turn — a
     * summary of those edits plus fresh grids for the changed slides.
     */
    private buildModelUserMessage(
        threadId: UUID,
        userContent: string | MessageContent[],
    ): ModelMessage {
        const presentation = this.presentationService.getPresentation();
        const parts: string[] = [];

        const slideList = presentation.slides
            .map((slide, index) => `${index + 1}: ${slide.id}`)
            .join(', ');
        parts.push(
            `Presentation status: ${presentation.slides.length} slide(s). Slide IDs in order: ${slideList || 'none'}.`,
        );

        const slideContext = this.getCurrentSlideContextMessage();
        if (slideContext) {
            parts.push(slideContext);
        }

        const snapshot = this.threadSnapshots.get(threadId);
        if (snapshot) {
            const diff = diffSnapshots(snapshot, takeSnapshot(presentation));
            if (diff) {
                parts.push(
                    `The user manually edited the presentation since your last turn:\n${diff.summary}`,
                );
                for (const slideId of diff.changedSlideIds) {
                    const slide = presentation.slides.find(
                        (s) => s.id === slideId,
                    );
                    if (slide) {
                        parts.push(
                            generateSlideGrid(slide, { pixelsPerSquare: 20 }),
                        );
                    }
                }
            }
        }

        const contextBlock = `[Context: current presentation state — not written by the user]\n${parts.join('\n\n')}`;

        const content = toUserContent(userContent);
        const contentParts =
            typeof content === 'string'
                ? [{ type: 'text' as const, text: content }]
                : content;

        return {
            role: 'user',
            content: [
                { type: 'text' as const, text: contextBlock },
                ...contentParts,
            ],
        };
    }

    private pruneHistoryIfNeeded(threadId: UUID): void {
        const history = this.state.getModelMessages(threadId);
        const approxChars = JSON.stringify(history).length;
        if (approxChars <= HISTORY_PRUNE_THRESHOLD_CHARS) {
            return;
        }
        const pruned = pruneMessages({
            messages: history,
            reasoning: 'before-last-message',
            toolCalls: 'before-last-4-messages',
        });
        this.state.replaceModelMessages(threadId, pruned);
        logger.logSystem('Pruned model history', 'info', {
            threadId,
            beforeChars: approxChars,
            afterChars: JSON.stringify(pruned).length,
        });
    }

    private handleSendMessageError(threadId: UUID, error: unknown): AIResponse {
        if (isAbortError(error)) {
            const currentThread = this.getThread(threadId);
            if (currentThread) {
                this.saveThread(cleanupStreamingMessages(currentThread));
            }
            this.eventBus.broadcastProcessingCompleted(threadId);
            return { message: 'Request was cancelled by user.' };
        }

        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
        logger.logSystem('AI request failed', 'error', {
            threadId,
            error: errorMessage,
        });
        this.eventBus.broadcastProcessingError(threadId, errorMessage);
        return { message: `Error: ${errorMessage}` };
    }

    private getCurrentSlideContextMessage(): string | null {
        const presentation = this.presentationService.getPresentation();
        const currentSlideId = this.presentationService.getSelectedSlideId();

        if (!currentSlideId) {
            return null;
        }

        const currentSlide = presentation.slides?.find(
            (slide) => slide.id === currentSlideId,
        );
        if (!currentSlide) {
            return null;
        }

        const slideIndex = presentation.slides.indexOf(currentSlide) + 1;
        const elementCount = currentSlide.elements?.length || 0;

        let slideContext = `## CURRENT SLIDE CONTEXT\n`;
        slideContext += `**Currently Viewing**: Slide ${slideIndex} (ID: ${currentSlideId}) out of ${presentation.slides.length} slides\n`;
        slideContext += `**Elements on this slide**: ${elementCount} element${elementCount !== 1 ? 's' : ''}`;

        if (elementCount > 0) {
            const typeCount: Record<string, number> = {};
            for (const element of currentSlide.elements) {
                typeCount[element.type] = (typeCount[element.type] || 0) + 1;
            }
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

class AgentLoopState {
    private thread: Thread;

    private currentAssistantId: string | null = null;

    private currentContent = '';

    private finalText = '';

    private toolStepIds: Map<string, string> = new Map();

    constructor(
        private state: AIState,
        private eventBus: AIEventBus,
        thread: Thread,
    ) {
        this.thread = thread;
    }

    appendText(delta: string): void {
        this.ensureAssistantMessage();
        this.currentContent += delta;
        this.thread = this.state.updateMessageContent(
            this.thread,
            this.currentAssistantId as string,
            this.currentContent,
        );
        this.eventBus.broadcastMessageChunkReceived(
            this.thread.id,
            this.currentAssistantId as string,
            delta,
            this.currentContent,
        );
        this.eventBus.broadcastThreadUpdated(this.thread);
    }

    onToolCall(toolCallId: string, toolName: string, input: unknown): void {
        this.closeAssistantMessage();
        const stepId = crypto.randomUUID();
        this.toolStepIds.set(toolCallId, stepId);
        this.thread = this.state.addMessageWithState(
            this.thread,
            encodeToolStep(toolName, input, 'running'),
            'system',
            stepId,
        );
        this.eventBus.broadcastThreadUpdated(this.thread);
    }

    onToolResult(toolCallId: string, output: unknown, failed = false): void {
        const stepId = this.toolStepIds.get(toolCallId);
        if (!stepId) {
            return;
        }
        const status =
            failed || (output as ToolModelOutput | undefined)?.success === false
                ? 'error'
                : 'done';
        this.thread = this.state.updateMessageContent(
            this.thread,
            stepId,
            updateToolStepStatus(this.thread, stepId, status),
        );
        this.eventBus.broadcastThreadUpdated(this.thread);
    }

    finalize(): void {
        this.closeAssistantMessage();
    }

    getThread(): Thread {
        return this.thread;
    }

    getFinalText(): string {
        return this.finalText || 'Done.';
    }

    private ensureAssistantMessage(): void {
        if (this.currentAssistantId === null) {
            this.currentAssistantId = crypto.randomUUID();
            this.currentContent = '';
            this.thread = this.state.addMessageWithState(
                this.thread,
                '',
                'assistant',
                this.currentAssistantId,
                'streaming',
            );
            this.eventBus.broadcastThreadUpdated(this.thread);
        }
    }

    private closeAssistantMessage(): void {
        if (this.currentAssistantId === null) {
            return;
        }
        if (this.currentContent.trim().length > 0) {
            this.finalText = this.currentContent;
        }
        this.thread = this.state.setMessageStreamingState(
            this.thread,
            this.currentAssistantId,
            'completed',
        );
        this.eventBus.broadcastThreadUpdated(this.thread);
        this.currentAssistantId = null;
        this.currentContent = '';
    }
}

const TOOL_PREFIX = '[TOOL]';

function encodeToolStep(
    name: string,
    input: unknown,
    status: 'running' | 'done' | 'error',
): string {
    return (
        TOOL_PREFIX +
        JSON.stringify({
            name,
            label: humanizeToolName(name),
            detail: toolDetail(input),
            status,
        })
    );
}

function updateToolStepStatus(
    thread: Thread,
    stepId: string,
    status: 'running' | 'done' | 'error',
): string {
    const message = thread.messages.find((m) => m.id === stepId);
    let data: Record<string, unknown> = { status };
    if (
        message &&
        typeof message.content === 'string' &&
        message.content.startsWith(TOOL_PREFIX)
    ) {
        try {
            data = {
                ...JSON.parse(message.content.slice(TOOL_PREFIX.length)),
                status,
            };
        } catch {
            data = { status };
        }
    }
    return TOOL_PREFIX + JSON.stringify(data);
}

function humanizeToolName(name: string): string {
    const spaced = name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function toolDetail(input: unknown): string {
    if (!input || typeof input !== 'object') {
        return '';
    }
    const fields = input as Record<string, unknown>;
    const candidate =
        fields.prompt ??
        fields.content ??
        fields.query ??
        fields.title ??
        fields.text ??
        fields.expression;
    if (typeof candidate !== 'string') {
        return '';
    }
    const plain = candidate
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return plain.length > 70 ? `${plain.slice(0, 70)}…` : plain;
}

function isAbortError(error: unknown): boolean {
    return (
        error instanceof Error &&
        (error.name === 'AbortError' ||
            error.name === 'ResponseAborted' ||
            error.message.toLowerCase().includes('abort'))
    );
}

function cleanupStreamingMessages(thread: Thread): Thread {
    const messages: Message[] = thread.messages
        .map((message) => {
            if (
                message.role === 'assistant' &&
                message.streamingState === 'streaming'
            ) {
                if (
                    typeof message.content === 'string' &&
                    message.content.trim().length === 0
                ) {
                    return null;
                }
                return { ...message, streamingState: 'completed' as const };
            }
            return message;
        })
        .filter((message): message is Message => message !== null);

    return { ...thread, messages };
}
