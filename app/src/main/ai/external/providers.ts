import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import type {
    LLMProviderConfig,
    LLMProviderType,
} from '../../../common/domain/interfaces/llm-provider';

type ProviderOptions = Record<string, Record<string, any>>;

/**
 * Everything a single provider needs: how to build its LanguageModel, and any
 * provider-specific options for the streamText call. Co-locating both means a
 * provider's quirks (e.g. OpenAI reasoning effort) live in one place.
 */
interface ProviderAdapter {
    createModel(config: LLMProviderConfig): LanguageModel;
    providerOptions?(config: LLMProviderConfig): ProviderOptions | undefined;
}

const PROVIDERS: Record<LLMProviderType, ProviderAdapter> = {
    openai: {
        createModel: (c) =>
            createOpenAI({ apiKey: requireApiKey(c, 'OpenAI') }).responses(
                c.model,
            ),
        // `store: false` opts out of OpenAI-side response storage. reasoningEffort
        // is only sent when the user selected one in settings: valid values are
        // model-specific (e.g. gpt-5 accepts 'minimal' but not 'none'; gpt-5.5
        // the reverse), so we never guess — an unset value uses the model default.
        providerOptions: (c) => ({
            openai: {
                store: false,
                ...(c.reasoningEffort
                    ? { reasoningEffort: c.reasoningEffort }
                    : {}),
            },
        }),
    },
    anthropic: {
        createModel: (c) =>
            createAnthropic({ apiKey: requireApiKey(c, 'Anthropic') })(c.model),
    },
    google: {
        createModel: (c) =>
            createGoogleGenerativeAI({ apiKey: requireApiKey(c, 'Google AI') })(
                c.model,
            ),
    },
    'azure-openai': {
        createModel: (c) => azureModel(c),
    },
    ollama: {
        createModel: (c) => ollamaModel(c),
    },
};

export function resolveModel(config: LLMProviderConfig): LanguageModel {
    const adapter = PROVIDERS[config.provider];
    if (!adapter) {
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
    return adapter.createModel(config);
}

export function providerOptionsFor(
    config: LLMProviderConfig,
): ProviderOptions | undefined {
    return PROVIDERS[config.provider]?.providerOptions?.(config);
}

function requireApiKey(config: LLMProviderConfig, label: string): string {
    if (!config.apiKey) {
        throw new Error(`${label} API key is required`);
    }
    return config.apiKey;
}

function azureModel(config: LLMProviderConfig): LanguageModel {
    const apiKey = requireApiKey(config, 'Azure OpenAI');
    if (!config.endpoint) throw new Error('Azure OpenAI endpoint is required');
    if (!config.deployment) {
        throw new Error('Azure OpenAI deployment is required');
    }

    const apiVersion = config.apiVersion || '2024-10-21';
    const resourceName = extractAzureResourceName(config.endpoint);
    const provider = resourceName
        ? createAzure({ apiKey, resourceName, apiVersion })
        : createAzure({
              apiKey,
              baseURL: `${trimTrailingSlash(config.endpoint)}/openai/deployments`,
              apiVersion,
          });

    return provider.chat(config.deployment);
}

function ollamaModel(config: LLMProviderConfig): LanguageModel {
    const endpoint = config.endpoint || 'http://localhost:11434';
    return createOllama({ baseURL: `${trimTrailingSlash(endpoint)}/api` })(
        config.model,
    ) as unknown as LanguageModel;
}

function extractAzureResourceName(endpoint: string): string | null {
    const match = endpoint.match(/^https?:\/\/([^.]+)\.openai\.azure\.com/);
    return match ? match[1] : null;
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/$/, '');
}
