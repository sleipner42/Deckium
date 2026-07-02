import { stepCountIs, streamText } from 'ai';
import {
    AIRequest,
    AIResponse,
    Message,
    Thread,
} from '../../common/domain/entities/ai-types';

import type { UUID } from '../../common/domain/entities/types';
import { LintingService } from '../linting/service';
import { PresentationService } from '../presentation/service';
import { LLMSettingsService } from '../settings/llm-settings-service';

import { logger } from '../utils/logger';
import { AIEventBus } from './event-bus';
import { conversationHistory } from './external/messages';
import { providerOptionsFor, resolveModel } from './external/providers';
import { getDeveloperPrompt } from './prompt/systemPrompt';
import { AIState } from './state';
import { buildToolSet } from './tools/tool-adapter';
import { AIToolsService } from './tools/tools';

const MAX_STEPS = 20;

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
        const history = conversationHistory(thread.messages);
        const config = this.settings.getCurrentProvider();
        const model = resolveModel(config);
        const tools = buildToolSet(
            this.toolsService,
            this.presentationService,
            this.lintingService,
        );

        const loop = new AgentLoopState(this.state, this.eventBus, thread);

        const result = streamText({
            // Defaults first so explicit per-call values below always win.
            ...AGENT_DEFAULTS,
            model,
            system,
            messages: history,
            tools,
            abortSignal,
            providerOptions: providerOptionsFor(config),
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

        loop.finalize();
        const workingThread = loop.getThread();
        this.saveThread(workingThread);

        logger.logAIResponse('AI response generated', {
            threadId: workingThread.id,
            messageCount: workingThread.messages.length,
            finalLength: loop.getFinalText().length,
        });

        return { thread: workingThread, finalText: loop.getFinalText() };
    }

    private buildSystemPrompt(): string {
        const presentation = this.presentationService.getPresentation();
        const base = getDeveloperPrompt(presentation);
        const slideContext = this.getCurrentSlideContextMessage();
        return slideContext ? `${base}\n\n${slideContext}` : base;
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
        const status = failed || isFailedOutput(output) ? 'error' : 'done';
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

function isFailedOutput(output: unknown): boolean {
    if (
        output &&
        typeof output === 'object' &&
        typeof (output as { text?: unknown }).text === 'string'
    ) {
        return / failed:/i.test((output as { text: string }).text);
    }
    return false;
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
