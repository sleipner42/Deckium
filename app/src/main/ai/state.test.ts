import type { ModelMessage } from 'ai';
import { AIState } from './state';

// The main process runs on Node (structuredClone is global there); the jsdom
// test environment lacks it, so polyfill for these unit tests.
if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = <T>(value: T): T =>
        JSON.parse(JSON.stringify(value));
}

function screenshotToolMessage(data: string): ModelMessage {
    return {
        role: 'tool',
        content: [
            {
                type: 'tool-result',
                toolCallId: 'call-1',
                toolName: 'getScreenshotOfSlide',
                output: {
                    type: 'content',
                    value: [
                        { type: 'text', text: 'Screenshot attached' },
                        { type: 'media', data, mediaType: 'image/png' },
                    ],
                },
            },
        ],
    } as unknown as ModelMessage;
}

function userText(text: string): ModelMessage {
    return { role: 'user', content: [{ type: 'text', text }] };
}

function newThreadId(state: AIState): string {
    return state.createThread('t', 'p', 'developer prompt').id;
}

describe('AIState model-history bounding', () => {
    const BIG_BASE64 = 'A'.repeat(5000);

    it('keeps media in the most recent turn intact', () => {
        const state = new AIState();
        const id = newThreadId(state);

        state.appendModelMessages(id, [userText('first')]);
        state.appendModelMessages(id, [screenshotToolMessage(BIG_BASE64)]);

        const history = state.getModelMessages(id);
        const toolMsg = history[history.length - 1];
        const mediaPart = (toolMsg.content as any[])[0].output.value[1];
        expect(mediaPart.type).toBe('media');
        expect(mediaPart.data).toBe(BIG_BASE64);
    });

    it('strips media from turns before the most recent user message', () => {
        const state = new AIState();
        const id = newThreadId(state);

        state.appendModelMessages(id, [userText('first')]);
        state.appendModelMessages(id, [screenshotToolMessage(BIG_BASE64)]);
        // A new user turn begins: the earlier screenshot is now "old".
        state.appendModelMessages(id, [userText('second')]);

        const history = state.getModelMessages(id);
        const toolMsg = history.find((m) => m.role === 'tool');
        const parts = (toolMsg?.content as any[])[0].output.value;
        // The media entry is replaced with a text placeholder.
        expect(parts.some((p: any) => p.type === 'media')).toBe(false);
        expect(
            parts.some(
                (p: any) =>
                    p.type === 'text' &&
                    /removed to conserve context/.test(p.text),
            ),
        ).toBe(true);
        // The current turn's user message is untouched.
        expect(history[history.length - 1]).toEqual(userText('second'));
    });

    it('caps retained messages to the sliding window at a user boundary', () => {
        const state = new AIState();
        const id = newThreadId(state);

        for (let i = 0; i < 60; i++) {
            const role = i % 2 === 0 ? 'user' : 'assistant';
            state.appendModelMessages(id, [
                { role, content: [{ type: 'text', text: `m${i}` }] },
            ] as ModelMessage[]);
        }

        const history = state.getModelMessages(id);
        expect(history.length).toBeLessThanOrEqual(40);
        // Never begins on an orphaned tool result: cut lands on a user turn.
        expect(history[0].role).toBe('user');
    });
});
