/**
 * @jest-environment node
 */
import { streamText } from 'ai';
import { AIService } from './service';

// The provider/model/tool builders only produce inputs to streamText, which we
// mock — so stub them to trivial values and drive the loop through streamText.
jest.mock('ai', () => ({
    streamText: jest.fn(),
    stepCountIs: jest.fn(() => ({})),
    pruneMessages: jest.fn((arg) => arg.messages ?? arg),
}));
jest.mock('./external/providers', () => ({
    resolveModel: jest.fn(() => ({})),
    withCacheBreakpoints: jest.fn((messages) => messages),
    providerOptionsFor: jest.fn(() => ({})),
}));
jest.mock('./tools/tool-adapter', () => ({
    buildToolSet: jest.fn(() => ({})),
}));
// Stub the tools service so importing it doesn't pull in main.ts / electron app.
jest.mock('./tools/tools', () => ({
    AIToolsService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('./prompt/systemPrompt', () => ({
    getDeveloperPrompt: jest.fn(() => 'dev-prompt'),
}));
jest.mock('../utils/logger', () => ({
    // Any log method is a no-op spy.
    logger: new Proxy({}, { get: () => jest.fn() }),
}));
jest.mock('electron', () => ({
    BrowserWindow: { getAllWindows: jest.fn(() => []) },
    ipcMain: { handle: jest.fn(), on: jest.fn() },
}));

const streamTextMock = streamText as jest.Mock;

type StreamPart =
    | { type: 'text-delta'; text: string }
    | {
          type: 'tool-call';
          toolCallId: string;
          toolName: string;
          input: unknown;
      }
    | { type: 'tool-result'; toolCallId: string; output: unknown };

// Build the object streamText() returns: an async `fullStream` plus resolved
// promises for steps/finishReason/response. `beforeParts`, if given, gates the
// stream so a turn can be observed mid-flight.
function makeStream(opts: {
    parts?: StreamPart[];
    messages?: unknown[];
    finishReason?: string;
    beforeParts?: Promise<void>;
    signal?: AbortSignal;
}) {
    const {
        parts = [],
        messages = [],
        finishReason = 'stop',
        beforeParts,
        signal,
    } = opts;
    return {
        fullStream: (async function* () {
            if (signal) {
                await new Promise<void>((resolve, reject) => {
                    signal.addEventListener('abort', () =>
                        reject(
                            Object.assign(new Error('operation was aborted'), {
                                name: 'AbortError',
                            }),
                        ),
                    );
                    if (beforeParts) beforeParts.then(resolve);
                });
            } else if (beforeParts) {
                await beforeParts;
            }
            for (const part of parts) yield part;
        })(),
        steps: Promise.resolve([{}]),
        finishReason: Promise.resolve(finishReason),
        response: Promise.resolve({ messages }),
    };
}

function makePresentation() {
    return {
        id: 'pres-1',
        title: 'Deck',
        slides: [{ id: 'slide-1', elements: [], background: '#FFFFFF' }],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
    };
}

function makeService() {
    const presentationService = {
        getPresentation: jest.fn(makePresentation),
        getSelectedSlideId: jest.fn(() => null),
        beginTransaction: jest.fn(),
        endTransaction: jest.fn(),
    };
    const settings = {
        getCurrentProvider: jest.fn(() => ({
            provider: 'openai',
            model: 'gpt',
            apiKey: 'k',
        })),
    };
    const lintingService = {};
    const service = new AIService(
        settings as never,
        presentationService as never,
        lintingService as never,
    );
    return { service, presentationService };
}

beforeEach(() => {
    streamTextMock.mockReset();
});

describe('AIService thread management', () => {
    it('creates, reads, and deletes threads', () => {
        const { service } = makeService();

        const thread = service.createThread('My chat', 'pres-1');
        expect(service.getThread(thread.id)).not.toBeNull();
        expect(
            service.getThreadsForPresentation('pres-1').map((t) => t.id),
        ).toContain(thread.id);

        expect(service.deleteThread(thread.id)).toBe(true);
        expect(service.getThread(thread.id)).toBeNull();
    });

    it('reports no processing and no abortable request when idle', () => {
        const { service } = makeService();
        expect(service.isProcessing()).toBe(false);
        expect(service.abortRequest('nope' as never)).toBe(false);
    });
});

describe('AIService.sendMessage', () => {
    it('runs a turn, returns the streamed text, and toggles processing', async () => {
        const { service, presentationService } = makeService();
        const thread = service.createThread('T', 'pres-1');
        streamTextMock.mockReturnValue(
            makeStream({
                parts: [{ type: 'text-delta', text: 'Hello world' }],
            }),
        );

        const response = await service.sendMessage({
            threadId: thread.id,
            message: 'hi',
        } as never);

        expect(response.message).toBe('Hello world');
        expect(service.isProcessing()).toBe(false);
        // Every edit in the turn is grouped into exactly one undo step.
        expect(presentationService.beginTransaction).toHaveBeenCalledTimes(1);
        expect(presentationService.endTransaction).toHaveBeenCalledTimes(1);
    });

    it('locks the thread while a turn is in flight (B1)', async () => {
        const { service } = makeService();
        const thread = service.createThread('T', 'pres-1');

        let release!: () => void;
        const gate = new Promise<void>((r) => {
            release = r;
        });
        streamTextMock.mockReturnValue(makeStream({ beforeParts: gate }));

        const inFlight = service.sendMessage({
            threadId: thread.id,
            message: 'hi',
        } as never);

        // sendMessage marks the thread processing before its first await.
        expect(service.isProcessing()).toBe(true);
        await expect(
            service.sendMessage({
                threadId: thread.id,
                message: 'again',
            } as never),
        ).rejects.toThrow('already being processed');

        release();
        await inFlight;
        expect(service.isProcessing()).toBe(false);
    });

    it('cancels cleanly on abort and still closes the transaction', async () => {
        const { service, presentationService } = makeService();
        const thread = service.createThread('T', 'pres-1');

        streamTextMock.mockImplementation(
            (opts: { abortSignal: AbortSignal }) =>
                makeStream({ signal: opts.abortSignal }),
        );

        const inFlight = service.sendMessage({
            threadId: thread.id,
            message: 'hi',
        } as never);

        expect(service.abortRequest(thread.id)).toBe(true);
        const response = await inFlight;

        expect(response.message).toBe('Request was cancelled by user.');
        expect(service.isProcessing()).toBe(false);
        // The transaction opened for the turn is closed even on abort.
        expect(presentationService.endTransaction).toHaveBeenCalledTimes(1);
    });

    it('rejects a request for an unknown thread', async () => {
        const { service } = makeService();
        streamTextMock.mockReturnValue(makeStream({}));

        const response = await service.sendMessage({
            threadId: 'missing' as never,
            message: 'hi',
        } as never);

        expect(response.message).toMatch(/Error:.*Thread not found/);
        expect(service.isProcessing()).toBe(false);
    });
});
