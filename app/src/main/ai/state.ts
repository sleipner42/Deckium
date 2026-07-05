import type { ModelMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { Message, Thread } from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import { MessageContent } from '../../common/domain/interfaces/ai-service.interface';
import { logger } from '../utils/logger';

const MODEL_HISTORY_MEDIA_PLACEHOLDER =
    '[older screenshot removed to conserve context]';

// A tool-result output part carrying inline media (e.g. a screenshot),
// or a user-message image/file part. Kept loose because the exact shape
// varies by provider; we only touch the fields we recognise.
type LoosePart = { type?: string; output?: unknown; [key: string]: unknown };

function stripToolResultMedia(part: LoosePart): LoosePart {
    const output = part.output as
        | { type?: string; value?: unknown }
        | undefined;
    if (!output || output.type !== 'content' || !Array.isArray(output.value)) {
        return part;
    }
    let changed = false;
    const value = output.value.map((entry: LoosePart) => {
        if (entry?.type === 'media') {
            changed = true;
            return { type: 'text', text: MODEL_HISTORY_MEDIA_PLACEHOLDER };
        }
        return entry;
    });
    return changed ? { ...part, output: { ...output, value } } : part;
}

// Replace large inline media in an old message with a text placeholder while
// keeping the message shape valid for replay to the provider.
function stripMediaFromMessage(message: ModelMessage): ModelMessage {
    if (!Array.isArray(message.content)) {
        return message;
    }
    let changed = false;
    const content = message.content.map((rawPart) => {
        const part = rawPart as unknown as LoosePart;
        if (part?.type === 'image' || part?.type === 'file') {
            changed = true;
            return { type: 'text', text: MODEL_HISTORY_MEDIA_PLACEHOLDER };
        }
        if (part?.type === 'tool-result') {
            const stripped = stripToolResultMedia(part);
            if (stripped !== part) {
                changed = true;
            }
            return stripped;
        }
        return part;
    });
    return changed
        ? ({ ...message, content } as unknown as ModelMessage)
        : message;
}

export class AIState {
    // Cap on retained model-history messages per thread (sliding window).
    private static readonly MODEL_HISTORY_WINDOW = 40;

    private threads: Map<UUID, Thread> = new Map<UUID, Thread>();

    // Full ModelMessage history per thread, persisted verbatim from
    // result.response.messages and replayed verbatim on the next run. This is
    // intentionally a separate source of truth from thread.messages: the
    // Thread crosses the IPC boundary to the renderer on every stream delta
    // and must stay small, while this history carries complete tool
    // calls/results (including screenshots) and provider reasoning metadata,
    // kept byte-stable so provider prompt caching works across turns.
    private modelHistories: Map<UUID, ModelMessage[]> = new Map();

    getModelMessages(threadId: UUID): ModelMessage[] {
        return this.modelHistories.get(threadId) ?? [];
    }

    appendModelMessages(threadId: UUID, messages: ModelMessage[]): void {
        if (messages.length === 0) {
            return;
        }
        const history = this.modelHistories.get(threadId) ?? [];
        history.push(...structuredClone(messages));
        this.modelHistories.set(threadId, history);
        this.trimModelHistory(threadId);
    }

    /**
     * Bound the per-thread model history so it can't grow forever. Two guards,
     * both preserving the newest turn intact:
     *  1. Sliding window — retain at most MODEL_HISTORY_WINDOW messages, cutting
     *     at a user-turn boundary so we never begin on an orphaned tool result.
     *  2. Media stripping — replace large base64 image/media payloads (screen-
     *     shots) in every message before the most recent user turn with a short
     *     text placeholder, so old screenshots don't accumulate. The current
     *     turn keeps its media so the in-flight request still sees it.
     */
    trimModelHistory(threadId: UUID): void {
        const history = this.modelHistories.get(threadId);
        if (!history || history.length === 0) {
            return;
        }

        let windowed = history;
        if (history.length > AIState.MODEL_HISTORY_WINDOW) {
            let cut = history.length - AIState.MODEL_HISTORY_WINDOW;
            while (cut < history.length && history[cut].role !== 'user') {
                cut++;
            }
            // No user boundary in the tail: fall back to the raw window.
            if (cut >= history.length) {
                cut = history.length - AIState.MODEL_HISTORY_WINDOW;
            }
            windowed = history.slice(cut);
        }

        let lastUserIndex = -1;
        for (let i = windowed.length - 1; i >= 0; i--) {
            if (windowed[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }
        const boundary = lastUserIndex === -1 ? windowed.length : lastUserIndex;

        const trimmed = windowed.map((message, index) =>
            index < boundary ? stripMediaFromMessage(message) : message,
        );

        this.modelHistories.set(threadId, trimmed);
    }

    replaceModelMessages(threadId: UUID, messages: ModelMessage[]): void {
        this.modelHistories.set(threadId, structuredClone(messages));
    }

    getThreadIds(): Set<UUID> {
        return new Set(this.threads.keys());
    }

    getThread(threadId: UUID): Thread | null {
        return this.threads.get(threadId) || null;
    }

    saveThread(thread: Thread): Thread {
        // Create a deep copy to avoid reference issues
        const threadCopy = JSON.parse(JSON.stringify(thread)) as Thread;

        // Restore Date objects since JSON.parse converts them to strings
        threadCopy.createdAt = new Date(threadCopy.createdAt);
        threadCopy.updatedAt = new Date(threadCopy.updatedAt);
        threadCopy.messages.forEach((msg) => {
            msg.timestamp = new Date(msg.timestamp);
        });

        // Store the thread copy
        this.threads.set(thread.id, threadCopy);

        // Return the copy, not the original
        return threadCopy;
    }

    getThreadsForPresentation(presentationId: UUID): Thread[] {
        return Array.from(this.threads.values()).filter(
            (thread) => thread.presentationId === presentationId,
        );
    }

    deleteThread(threadId: UUID): boolean {
        this.modelHistories.delete(threadId);
        return this.threads.delete(threadId);
    }

    createThread(
        title: string,
        presentationId: UUID,
        developerPrompt: string,
    ): Thread {
        const newThread: Thread = {
            id: uuidv4(),
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            presentationId,
        };

        const threadWithPrompt = this.addMessage(
            newThread,
            developerPrompt,
            'system',
        );

        const threadWithWelcome = this.addMessage(
            threadWithPrompt,
            'Welcome to Deckium Assistant. I can help you create and manage your presentation. Ask me to create slides, suggest content, or help with design.',
            'assistant',
        );

        this.threads.set(threadWithWelcome.id, threadWithWelcome);
        return threadWithWelcome;
    }

    addMessage(
        thread: Thread,
        content: string | MessageContent[],
        role: 'user' | 'assistant' | 'system',
    ): Thread {
        const threadToUpdate = this.threads.get(thread.id) || thread;

        const newMessage: Message = {
            id: uuidv4(),
            content,
            role,
            timestamp: new Date(),
            threadId: thread.id,
        };

        // Log the message being added to the conversation
        logger.logConversation(`Message added to thread [${role}]`, {
            threadId: thread.id,
            messageId: newMessage.id,
            role,
            content,
            contentType: typeof content,
            messageCount: threadToUpdate.messages.length + 1,
        });

        const updatedThread = {
            ...threadToUpdate,
            messages: [...threadToUpdate.messages, newMessage],
            updatedAt: new Date(),
        };

        this.threads.set(updatedThread.id, updatedThread);
        return updatedThread;
    }

    addMessageWithState(
        thread: Thread,
        content: string | MessageContent[],
        role: 'user' | 'assistant' | 'system',
        messageId: string = uuidv4(),
        streamingState: 'streaming' | 'completed' = 'completed',
    ): Thread {
        const threadToUpdate = this.threads.get(thread.id) || thread;

        const newMessage: Message = {
            id: messageId,
            content,
            role,
            timestamp: new Date(),
            threadId: thread.id,
            streamingState,
        };

        // Log the message being added with streaming state
        // Skip logging empty assistant messages that will be filled via streaming
        const shouldLog = !(
            role === 'assistant' &&
            streamingState === 'streaming' &&
            (!content || content === '')
        );

        if (shouldLog) {
            logger.logConversation(
                `Message added to thread [${role}] with state [${streamingState}]`,
                {
                    threadId: thread.id,
                    messageId,
                    role,
                    content,
                    streamingState,
                    contentType: typeof content,
                    messageCount: threadToUpdate.messages.length + 1,
                },
            );
        }

        const updatedThread = {
            ...threadToUpdate,
            messages: [...threadToUpdate.messages, newMessage],
            updatedAt: new Date(),
        };

        this.threads.set(updatedThread.id, updatedThread);
        return updatedThread;
    }

    updateMessageContent(
        thread: Thread,
        messageId: string,
        content: string | MessageContent[],
    ): Thread {
        const threadToUpdate = this.threads.get(thread.id) || thread;

        const messageIndex = threadToUpdate.messages.findIndex(
            (message) => message.id === messageId,
        );

        if (messageIndex === -1) {
            return threadToUpdate;
        }

        const updatedMessages = [...threadToUpdate.messages];
        const originalMessage = updatedMessages[messageIndex];
        updatedMessages[messageIndex] = {
            ...originalMessage,
            content,
        };

        // Content updates during streaming are logged when streaming completes
        // via setMessageStreamingState, so we don't need to log here to avoid spam

        const updatedThread = {
            ...threadToUpdate,
            messages: updatedMessages,
            updatedAt: new Date(),
        };

        this.threads.set(updatedThread.id, updatedThread);
        return updatedThread;
    }

    setMessageStreamingState(
        thread: Thread,
        messageId: string,
        streamingState: 'streaming' | 'completed',
    ): Thread {
        const threadToUpdate = this.threads.get(thread.id) || thread;

        const messageIndex = threadToUpdate.messages.findIndex(
            (message) => message.id === messageId,
        );

        if (messageIndex === -1) {
            return threadToUpdate;
        }

        const updatedMessages = [...threadToUpdate.messages];
        const originalMessage = updatedMessages[messageIndex];
        updatedMessages[messageIndex] = {
            ...originalMessage,
            streamingState,
        };

        // Log completed assistant messages to conversation file
        if (
            streamingState === 'completed' &&
            originalMessage.role === 'assistant' &&
            originalMessage.content
        ) {
            logger.logConversation(
                `Assistant message completed [${originalMessage.role}]`,
                {
                    threadId: thread.id,
                    messageId,
                    role: originalMessage.role,
                    content: originalMessage.content,
                    streamingState,
                    contentType: typeof originalMessage.content,
                    messageCount: updatedMessages.length,
                },
            );
        }

        const updatedThread = {
            ...threadToUpdate,
            messages: updatedMessages,
            updatedAt: new Date(),
        };

        this.threads.set(updatedThread.id, updatedThread);
        return updatedThread;
    }

    updateSystemMessage(thread: Thread, newContent: string): Thread {
        const updatedThread = { ...thread };

        const firstSystemMessageIndex = updatedThread.messages.findIndex(
            (m) => m.role === 'system',
        );

        if (firstSystemMessageIndex >= 0) {
            const updatedMessages = [...updatedThread.messages];
            updatedMessages[firstSystemMessageIndex] = {
                ...updatedMessages[firstSystemMessageIndex],
                content: newContent,
            };

            updatedThread.messages = updatedMessages;
        } else {
            const systemMessage: Message = {
                id: uuidv4(),
                content: newContent,
                role: 'system',
                timestamp: new Date(),
                threadId: thread.id,
            };

            updatedThread.messages = [systemMessage, ...updatedThread.messages];
        }

        this.threads.set(updatedThread.id, updatedThread);
        return updatedThread;
    }
}
