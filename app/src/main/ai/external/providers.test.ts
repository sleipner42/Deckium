/**
 * @jest-environment node
 */
import type { LLMProviderConfig } from '../../../common/domain/interfaces/llm-provider';
import { providerToolsFor } from './providers';

const config = (
    overrides: Partial<LLMProviderConfig> = {},
): LLMProviderConfig => ({
    provider: 'openai',
    model: 'gpt-5',
    apiKey: 'test-key',
    ...overrides,
});

describe('providerToolsFor (native web search)', () => {
    it('returns nothing when web search is not enabled', () => {
        expect(
            providerToolsFor(config({ webSearchEnabled: false })),
        ).toBeUndefined();
        expect(providerToolsFor(config({}))).toBeUndefined();
    });

    it('exposes the native tool for supported providers when enabled', () => {
        const openai = providerToolsFor(
            config({ provider: 'openai', webSearchEnabled: true }),
        );
        expect(openai && Object.keys(openai)).toEqual(['web_search']);

        const anthropic = providerToolsFor(
            config({ provider: 'anthropic', webSearchEnabled: true }),
        );
        expect(anthropic && Object.keys(anthropic)).toEqual(['web_search']);

        const google = providerToolsFor(
            config({ provider: 'google', webSearchEnabled: true }),
        );
        expect(google && Object.keys(google)).toEqual(['google_search']);
    });

    it('returns nothing for providers without native web search, even when enabled', () => {
        expect(
            providerToolsFor(
                config({ provider: 'azure-openai', webSearchEnabled: true }),
            ),
        ).toBeUndefined();
        expect(
            providerToolsFor(
                config({ provider: 'ollama', webSearchEnabled: true }),
            ),
        ).toBeUndefined();
    });
});
