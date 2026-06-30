import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel, type ModelMessage, streamText } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import type { Message } from '../../../common/domain/entities/ai-types';
import type { MessageContent } from '../../../common/domain/interfaces/ai-service.interface';
import type { LLMProviderConfig } from '../../../common/domain/interfaces/llm-provider';

export function resolveModel(config: LLMProviderConfig): LanguageModel {
    switch (config.provider) {
        case 'openai':
            return openAIModel(config);
        case 'anthropic':
            return anthropicModel(config);
        case 'google':
            return googleModel(config);
        case 'azure-openai':
            return azureModel(config);
        case 'ollama':
            return ollamaModel(config);
        default:
            throw new Error(`Unsupported provider: ${config.provider}`);
    }
}

export async function streamChat(
    config: LLMProviderConfig,
    messages: Message[],
    onChunk: (chunk: string) => void,
    abortSignal?: AbortSignal,
): Promise<string> {
    const result = streamText({
        model: resolveModel(config),
        messages: toModelMessages(messages),
        abortSignal,
        providerOptions: providerOptionsFor(config),
    });

    let fullText = '';
    for await (const delta of result.textStream) {
        fullText += delta;
        onChunk(delta);
    }
    return fullText;
}

export function providerOptionsFor(
    config: LLMProviderConfig,
): Record<string, Record<string, any>> | undefined {
    if (config.provider !== 'openai') {
        return undefined;
    }

    const isReasoningModel = /^(gpt-5|o\d)/.test(config.model);
    return {
        openai: {
            store: false,
            ...(isReasoningModel ? { reasoningEffort: 'none' } : {}),
        },
    };
}

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

export function conversationHistory(messages: Message[]): ModelMessage[] {
    const userAssistant = toModelMessages(messages).filter(
        (message) => message.role === 'user' || message.role === 'assistant',
    );
    const firstUserIndex = userAssistant.findIndex(
        (message) => message.role === 'user',
    );
    return firstUserIndex === -1 ? [] : userAssistant.slice(firstUserIndex);
}

function openAIModel(config: LLMProviderConfig): LanguageModel {
    if (!config.apiKey) throw new Error('OpenAI API key is required');
    return createOpenAI({ apiKey: config.apiKey }).responses(config.model);
}

function anthropicModel(config: LLMProviderConfig): LanguageModel {
    if (!config.apiKey) throw new Error('Anthropic API key is required');
    return createAnthropic({ apiKey: config.apiKey })(config.model);
}

function googleModel(config: LLMProviderConfig): LanguageModel {
    if (!config.apiKey) throw new Error('Google AI API key is required');
    return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.model);
}

function azureModel(config: LLMProviderConfig): LanguageModel {
    if (!config.apiKey) throw new Error('Azure OpenAI API key is required');
    if (!config.endpoint) throw new Error('Azure OpenAI endpoint is required');
    if (!config.deployment) {
        throw new Error('Azure OpenAI deployment is required');
    }

    const apiVersion = config.apiVersion || '2024-10-21';
    const resourceName = extractAzureResourceName(config.endpoint);
    const provider = resourceName
        ? createAzure({ apiKey: config.apiKey, resourceName, apiVersion })
        : createAzure({
              apiKey: config.apiKey,
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

function toUserContent(
    content: string | MessageContent[],
): string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> {
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

function extractAzureResourceName(endpoint: string): string | null {
    const match = endpoint.match(/^https?:\/\/([^.]+)\.openai\.azure\.com/);
    return match ? match[1] : null;
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/$/, '');
}
