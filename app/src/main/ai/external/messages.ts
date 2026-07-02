import type { ModelMessage } from 'ai';
import type { Message } from '../../../common/domain/entities/ai-types';
import type { MessageContent } from '../../../common/domain/interfaces/ai-service.interface';

/**
 * Map our internal Message[] to the Vercel AI SDK's ModelMessage[] shape.
 */
export function toModelMessages(messages: Message[]): ModelMessage[] {
    const modelMessages: ModelMessage[] = [];

    for (const message of messages) {
        if (isEmptyContent(message.content)) {
            continue;
        }

        if (message.role === 'user') {
            modelMessages.push({
                role: 'user',
                content: toUserContent(message.content),
            });
        } else if (message.role === 'assistant') {
            modelMessages.push({
                role: 'assistant',
                content: textOf(message.content),
            });
        } else {
            modelMessages.push({
                role: 'system',
                content: textOf(message.content),
            });
        }
    }

    return modelMessages;
}

/**
 * The user/assistant turns to send as prior context, starting at the first
 * user message (the model requires the history to begin with a user turn).
 */
export function conversationHistory(messages: Message[]): ModelMessage[] {
    const userAssistant = toModelMessages(messages).filter(
        (message) => message.role === 'user' || message.role === 'assistant',
    );
    const firstUserIndex = userAssistant.findIndex(
        (message) => message.role === 'user',
    );
    return firstUserIndex === -1 ? [] : userAssistant.slice(firstUserIndex);
}

export function toUserContent(
    content: string | MessageContent[],
):
    | string
    | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> {
    if (typeof content === 'string') {
        return content;
    }

    return content
        .map((part) => {
            if (part.type === 'image_url' && part.image_url?.url) {
                return { type: 'image' as const, image: part.image_url.url };
            }
            return { type: 'text' as const, text: part.text ?? '' };
        })
        .filter((part) => part.type === 'image' || part.text.length > 0);
}

function textOf(content: string | MessageContent[]): string {
    if (typeof content === 'string') {
        return content;
    }

    return content
        .filter((part) => part.type === 'text')
        .map((part) => part.text ?? '')
        .join('\n');
}

function isEmptyContent(content: string | MessageContent[]): boolean {
    if (typeof content === 'string') {
        return content.trim().length === 0;
    }
    return content.length === 0;
}
