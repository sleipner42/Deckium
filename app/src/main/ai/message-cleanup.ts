import type { Message, Thread } from '../../common/domain/entities/ai-types';

// Prefix marking a `role: 'system'` message as a tool step. The rest of the
// content is JSON: { name, label, detail, status }.
export const TOOL_PREFIX = '[TOOL]';

// If an aborted turn left a `[TOOL]...` step at status:'running', it would
// otherwise spin forever. Re-encode any such step as 'error'. Non-tool or
// already-settled steps are returned unchanged.
export function failRunningToolStep(content: string): string {
    if (!content.startsWith(TOOL_PREFIX)) {
        return content;
    }
    try {
        const data = JSON.parse(content.slice(TOOL_PREFIX.length)) as Record<
            string,
            unknown
        >;
        if (data.status !== 'running') {
            return content;
        }
        return TOOL_PREFIX + JSON.stringify({ ...data, status: 'error' });
    } catch {
        return content;
    }
}

// Settle a thread after an aborted turn: complete/drop dangling streaming
// assistant messages and flip any still-'running' tool step to 'error'.
export function cleanupStreamingMessages(thread: Thread): Thread {
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
            if (
                message.role === 'system' &&
                typeof message.content === 'string'
            ) {
                const settled = failRunningToolStep(message.content);
                if (settled !== message.content) {
                    return { ...message, content: settled };
                }
            }
            return message;
        })
        .filter((message): message is Message => message !== null);

    return { ...thread, messages };
}
