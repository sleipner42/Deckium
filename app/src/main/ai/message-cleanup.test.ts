import type { Message, Thread } from '../../common/domain/entities/ai-types';
import {
    cleanupStreamingMessages,
    failRunningToolStep,
    TOOL_PREFIX,
} from './message-cleanup';

function toolStep(status: 'running' | 'done' | 'error'): string {
    return (
        TOOL_PREFIX +
        JSON.stringify({
            name: 'generateImage',
            label: 'Generate image',
            detail: 'a cat',
            status,
        })
    );
}

function message(partial: Partial<Message>): Message {
    return {
        id: partial.id ?? 'id',
        content: partial.content ?? '',
        role: partial.role ?? 'assistant',
        timestamp: new Date(),
        threadId: 't1',
        streamingState: partial.streamingState,
    };
}

function thread(messages: Message[]): Thread {
    return {
        id: 't1',
        title: 'Thread',
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
        presentationId: 'p1',
    };
}

describe('failRunningToolStep', () => {
    it('flips a running tool step to error', () => {
        const settled = failRunningToolStep(toolStep('running'));
        expect(JSON.parse(settled.slice(TOOL_PREFIX.length)).status).toBe(
            'error',
        );
    });

    it('preserves the other encoded fields', () => {
        const data = JSON.parse(
            failRunningToolStep(toolStep('running')).slice(TOOL_PREFIX.length),
        );
        expect(data.name).toBe('generateImage');
        expect(data.label).toBe('Generate image');
        expect(data.detail).toBe('a cat');
    });

    it('leaves already-settled tool steps unchanged', () => {
        expect(failRunningToolStep(toolStep('done'))).toBe(toolStep('done'));
        expect(failRunningToolStep(toolStep('error'))).toBe(toolStep('error'));
    });

    it('ignores non-tool content', () => {
        expect(failRunningToolStep('just a message')).toBe('just a message');
    });

    it('returns malformed tool content unchanged', () => {
        const bad = `${TOOL_PREFIX}{not json`;
        expect(failRunningToolStep(bad)).toBe(bad);
    });
});

describe('cleanupStreamingMessages', () => {
    it('flips a running tool step (system message) to error on abort', () => {
        const result = cleanupStreamingMessages(
            thread([
                message({
                    id: 'step1',
                    role: 'system',
                    content: toolStep('running'),
                }),
            ]),
        );
        const parsed = JSON.parse(
            (result.messages[0].content as string).slice(TOOL_PREFIX.length),
        );
        expect(parsed.status).toBe('error');
    });

    it('leaves done/error tool steps alone', () => {
        const result = cleanupStreamingMessages(
            thread([
                message({ id: 'a', role: 'system', content: toolStep('done') }),
                message({
                    id: 'b',
                    role: 'system',
                    content: toolStep('error'),
                }),
            ]),
        );
        expect(result.messages[0].content).toBe(toolStep('done'));
        expect(result.messages[1].content).toBe(toolStep('error'));
    });

    it('completes a non-empty streaming assistant message', () => {
        const result = cleanupStreamingMessages(
            thread([
                message({
                    id: 'a',
                    role: 'assistant',
                    content: 'partial',
                    streamingState: 'streaming',
                }),
            ]),
        );
        expect(result.messages[0].streamingState).toBe('completed');
    });

    it('drops an empty streaming assistant message', () => {
        const result = cleanupStreamingMessages(
            thread([
                message({
                    id: 'a',
                    role: 'assistant',
                    content: '   ',
                    streamingState: 'streaming',
                }),
            ]),
        );
        expect(result.messages).toHaveLength(0);
    });

    it('handles a mixed thread (running tool + streaming text)', () => {
        const result = cleanupStreamingMessages(
            thread([
                message({ id: 'u', role: 'user', content: 'hi' }),
                message({
                    id: 'step',
                    role: 'system',
                    content: toolStep('running'),
                }),
                message({
                    id: 'txt',
                    role: 'assistant',
                    content: 'thinking',
                    streamingState: 'streaming',
                }),
            ]),
        );
        expect(result.messages).toHaveLength(3);
        expect(
            JSON.parse(
                (result.messages[1].content as string).slice(
                    TOOL_PREFIX.length,
                ),
            ).status,
        ).toBe('error');
        expect(result.messages[2].streamingState).toBe('completed');
    });
});
