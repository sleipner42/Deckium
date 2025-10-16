/**
 * Multi-provider AI service for standalone mode
 * Supports OpenAI, Anthropic, Azure OpenAI, Google AI, and Ollama
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI, { AzureOpenAI } from 'openai';
import { Message } from '../../../common/domain/entities/ai-types';
import {
    IAIService,
    IAIServiceFactory,
} from '../../../common/domain/interfaces/ai-service.interface';
import type { LLMProviderConfig } from '../../../common/domain/interfaces/llm-provider';
import { Logger } from '../../utils/logger';

/**
 * OpenAI Service Implementation
 */
export class OpenAIService implements IAIService {
    private client: OpenAI;
    private model: string;
    private logger: Logger;

    constructor(apiKey: string, model: string) {
        this.client = new OpenAI({ apiKey });
        this.model = model;
        this.logger = Logger.getInstance();
    }

    async chat(
        messages: Message[],
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const formattedMessages = this.formatMessages(messages);

            const response = await this.client.chat.completions.create(
                {
                    model: this.model,
                    messages: formattedMessages as any,
                },
                { signal: abortSignal },
            );

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            this.logger.logSystem('[OpenAI] Chat error', 'error', { error });
            throw error;
        }
    }

    async chatStream(
        messages: Message[],
        onChunk: (chunk: string) => void,
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const formattedMessages = this.formatMessages(messages);

            const stream = await this.client.chat.completions.create(
                {
                    model: this.model,
                    messages: formattedMessages as any,
                    stream: true,
                },
                { signal: abortSignal },
            );

            let completeResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    completeResponse += content;
                    onChunk(content);
                }
            }

            return completeResponse;
        } catch (error) {
            this.logger.logSystem('[OpenAI] Stream error', 'error', { error });
            throw error;
        }
    }

    private formatMessages(messages: Message[]) {
        const userMessages = messages.filter((msg) => msg.role === 'user');
        const latestUserMessageId =
            userMessages.length > 0
                ? userMessages[userMessages.length - 1].id
                : null;

        return messages.map((msg) => {
            const baseMessage = {
                role: msg.role as 'user' | 'assistant' | 'system',
            };

            const isLatestUserMessage = msg.id === latestUserMessageId;

            if (typeof msg.content === 'string') {
                return { ...baseMessage, content: msg.content };
            }

            const isOldMessage = msg.role === 'user' && !isLatestUserMessage;

            return {
                ...baseMessage,
                content: msg.content.map((item) => {
                    if (item.type === 'text') {
                        return { type: 'text', text: item.text };
                    }
                    if (item.type === 'image_url' && item.image_url) {
                        if (isOldMessage) {
                            return {
                                type: 'text',
                                text: '[Image removed to improve performance]',
                            };
                        }
                        return {
                            type: 'image_url',
                            image_url: { url: item.image_url.url },
                        };
                    }
                    return item;
                }),
            };
        });
    }
}

/**
 * Anthropic Service Implementation
 */
export class AnthropicService implements IAIService {
    private client: Anthropic;
    private model: string;
    private logger: Logger;

    constructor(apiKey: string, model: string) {
        this.client = new Anthropic({ apiKey });
        this.model = model;
        this.logger = Logger.getInstance();
    }

    async chat(
        messages: Message[],
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const { system, messages: anthropicMessages } =
                this.formatMessages(messages);

            const response = await this.client.messages.create(
                {
                    model: this.model,
                    max_tokens: 4096,
                    system,
                    messages: anthropicMessages,
                },
                { signal: abortSignal as any },
            );

            const textContent = response.content.find(
                (block) => block.type === 'text',
            );
            return textContent && 'text' in textContent ? textContent.text : '';
        } catch (error) {
            this.logger.logSystem('[Anthropic] Chat error', 'error', {
                error,
            });
            throw error;
        }
    }

    async chatStream(
        messages: Message[],
        onChunk: (chunk: string) => void,
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const { system, messages: anthropicMessages } =
                this.formatMessages(messages);

            const stream = await this.client.messages.create(
                {
                    model: this.model,
                    max_tokens: 4096,
                    system,
                    messages: anthropicMessages,
                    stream: true,
                },
                { signal: abortSignal as any },
            );

            let completeResponse = '';
            for await (const event of stream) {
                if (
                    event.type === 'content_block_delta' &&
                    event.delta.type === 'text_delta'
                ) {
                    const content = event.delta.text;
                    completeResponse += content;
                    onChunk(content);
                }
            }

            return completeResponse;
        } catch (error) {
            this.logger.logSystem('[Anthropic] Stream error', 'error', {
                error,
            });
            throw error;
        }
    }

    private formatMessages(messages: Message[]) {
        let system = '';
        const anthropicMessages: Array<{
            role: 'user' | 'assistant';
            content: string | Array<{ type: string; [key: string]: any }>;
        }> = [];

        const userMessages = messages.filter((msg) => msg.role === 'user');
        const latestUserMessageId =
            userMessages.length > 0
                ? userMessages[userMessages.length - 1].id
                : null;

        for (const msg of messages) {
            if (msg.role === 'system') {
                system += (system ? '\n\n' : '') + msg.content;
                continue;
            }

            const isLatestUserMessage = msg.id === latestUserMessageId;
            const isOldMessage = msg.role === 'user' && !isLatestUserMessage;

            if (typeof msg.content === 'string') {
                anthropicMessages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                });
            } else {
                const content = msg.content
                    .map((item) => {
                        if (item.type === 'text') {
                            return { type: 'text', text: item.text };
                        }
                        if (item.type === 'image_url' && item.image_url) {
                            if (isOldMessage) {
                                return {
                                    type: 'text',
                                    text: '[Image removed to improve performance]',
                                };
                            }
                            // Convert base64 or URL to Anthropic format
                            const url = item.image_url.url;
                            if (url.startsWith('data:')) {
                                const match = url.match(
                                    /data:image\/(\w+);base64,(.+)/,
                                );
                                if (match) {
                                    return {
                                        type: 'image',
                                        source: {
                                            type: 'base64',
                                            media_type: `image/${match[1]}`,
                                            data: match[2],
                                        },
                                    };
                                }
                            }
                            return {
                                type: 'text',
                                text: '[Image URL not supported]',
                            };
                        }
                        return null;
                    })
                    .filter((item) => item !== null);

                anthropicMessages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: content as any,
                });
            }
        }

        return { system, messages: anthropicMessages };
    }
}

/**
 * Google AI Service Implementation
 */
export class GoogleAIService implements IAIService {
    private client: GoogleGenerativeAI;
    private model: string;
    private logger: Logger;

    constructor(apiKey: string, model: string) {
        this.client = new GoogleGenerativeAI(apiKey);
        this.model = model;
        this.logger = Logger.getInstance();
    }

    async chat(
        messages: Message[],
        _deploymentName?: string,
        _abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const model = this.client.getGenerativeModel({
                model: this.model,
            });

            const { system, history, lastMessage } =
                this.formatMessages(messages);

            const chat = model.startChat({
                history,
                systemInstruction: system,
            });

            const result = await chat.sendMessage(lastMessage);
            return result.response.text();
        } catch (error) {
            this.logger.logSystem('[Google AI] Chat error', 'error', {
                error,
            });
            throw error;
        }
    }

    async chatStream(
        messages: Message[],
        onChunk: (chunk: string) => void,
        _deploymentName?: string,
        _abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const model = this.client.getGenerativeModel({
                model: this.model,
            });

            const { system, history, lastMessage } =
                this.formatMessages(messages);

            const chat = model.startChat({
                history,
                systemInstruction: system,
            });

            const result = await chat.sendMessageStream(lastMessage);

            let completeResponse = '';
            for await (const chunk of result.stream) {
                const content = chunk.text();
                completeResponse += content;
                onChunk(content);
            }

            return completeResponse;
        } catch (error) {
            this.logger.logSystem('[Google AI] Stream error', 'error', {
                error,
            });
            throw error;
        }
    }

    private formatMessages(messages: Message[]) {
        let system = '';
        const history: Array<{
            role: 'user' | 'model';
            parts: string;
        }> = [];
        let lastMessage = '';

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            if (msg.role === 'system') {
                system += (system ? '\n\n' : '') + msg.content;
                continue;
            }

            const content =
                typeof msg.content === 'string'
                    ? msg.content
                    : msg.content
                          .map((item) =>
                              item.type === 'text' ? item.text || '' : '',
                          )
                          .join('');

            if (i === messages.length - 1) {
                lastMessage = content;
            } else {
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: content,
                });
            }
        }

        return { system, history, lastMessage };
    }
}

/**
 * Ollama Service Implementation (local models)
 */
export class OllamaService implements IAIService {
    private endpoint: string;
    private model: string;
    private logger: Logger;

    constructor(endpoint: string, model: string) {
        this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
        this.model = model;
        this.logger = Logger.getInstance();
    }

    async chat(
        messages: Message[],
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const formattedMessages = this.formatMessages(messages);

            const response = await fetch(`${this.endpoint}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: formattedMessages,
                    stream: false,
                }),
                signal: abortSignal,
            });

            if (!response.ok) {
                throw new Error(
                    `Ollama request failed: ${response.statusText}`,
                );
            }

            const data = await response.json();
            return data.message?.content || '';
        } catch (error) {
            this.logger.logSystem('[Ollama] Chat error', 'error', { error });
            throw error;
        }
    }

    async chatStream(
        messages: Message[],
        onChunk: (chunk: string) => void,
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const formattedMessages = this.formatMessages(messages);

            const response = await fetch(`${this.endpoint}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: formattedMessages,
                    stream: true,
                }),
                signal: abortSignal,
            });

            if (!response.ok) {
                throw new Error(
                    `Ollama request failed: ${response.statusText}`,
                );
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let completeResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter((line) => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        const content = data.message?.content || '';
                        if (content) {
                            completeResponse += content;
                            onChunk(content);
                        }
                    } catch (_e) {
                        // Skip invalid JSON lines
                    }
                }
            }

            return completeResponse;
        } catch (error) {
            this.logger.logSystem('[Ollama] Stream error', 'error', { error });
            throw error;
        }
    }

    private formatMessages(messages: Message[]) {
        return messages.map((msg) => ({
            role: msg.role,
            content:
                typeof msg.content === 'string'
                    ? msg.content
                    : msg.content
                          .map((item) =>
                              item.type === 'text' ? item.text || '' : '',
                          )
                          .join(''),
        }));
    }
}

/**
 * Azure OpenAI Service (updated for standalone mode)
 */
export class StandaloneAzureOpenAIService implements IAIService {
    private client: AzureOpenAI;
    private deployment: string;
    private logger: Logger;

    constructor(apiKey: string, endpoint: string, deployment: string) {
        this.client = new AzureOpenAI({
            apiKey,
            endpoint,
            apiVersion: '2024-10-21',
        });
        this.deployment = deployment;
        this.logger = Logger.getInstance();
    }

    async chat(
        messages: Message[],
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const formattedMessages = this.formatMessages(messages);

            const response = await this.client.chat.completions.create(
                {
                    model: this.deployment,
                    messages: formattedMessages as any,
                },
                { signal: abortSignal },
            );

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            this.logger.logSystem('[Azure OpenAI] Chat error', 'error', {
                error,
            });
            throw error;
        }
    }

    async chatStream(
        messages: Message[],
        onChunk: (chunk: string) => void,
        _deploymentName?: string,
        abortSignal?: AbortSignal,
    ): Promise<string> {
        try {
            const formattedMessages = this.formatMessages(messages);

            const stream = await this.client.chat.completions.create(
                {
                    model: this.deployment,
                    messages: formattedMessages as any,
                    stream: true,
                },
                { signal: abortSignal },
            );

            let completeResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    completeResponse += content;
                    onChunk(content);
                }
            }

            return completeResponse;
        } catch (error) {
            this.logger.logSystem('[Azure OpenAI] Stream error', 'error', {
                error,
            });
            throw error;
        }
    }

    private formatMessages(messages: Message[]) {
        const userMessages = messages.filter((msg) => msg.role === 'user');
        const latestUserMessageId =
            userMessages.length > 0
                ? userMessages[userMessages.length - 1].id
                : null;

        return messages.map((msg) => {
            const baseMessage = {
                role: msg.role as 'user' | 'assistant' | 'system',
            };

            const isLatestUserMessage = msg.id === latestUserMessageId;

            if (typeof msg.content === 'string') {
                return { ...baseMessage, content: msg.content };
            }

            const isOldMessage = msg.role === 'user' && !isLatestUserMessage;

            return {
                ...baseMessage,
                content: msg.content.map((item) => {
                    if (item.type === 'text') {
                        return { type: 'text', text: item.text };
                    }
                    if (item.type === 'image_url' && item.image_url) {
                        if (isOldMessage) {
                            return {
                                type: 'text',
                                text: '[Image removed to improve performance]',
                            };
                        }
                        return {
                            type: 'image_url',
                            image_url: { url: item.image_url.url },
                        };
                    }
                    return item;
                }),
            };
        });
    }
}

/**
 * Factory for creating multi-provider AI services based on configuration
 */
export class MultiProviderAIServiceFactory implements IAIServiceFactory {
    constructor(private config: LLMProviderConfig) {}

    createService(): IAIService {
        const logger = Logger.getInstance();

        switch (this.config.provider) {
            case 'openai':
                if (!this.config.apiKey) {
                    throw new Error('OpenAI API key is required');
                }
                logger.logSystem(
                    `Creating OpenAI service with model: ${this.config.model}`,
                    'info',
                );
                return new OpenAIService(this.config.apiKey, this.config.model);

            case 'anthropic':
                if (!this.config.apiKey) {
                    throw new Error('Anthropic API key is required');
                }
                logger.logSystem(
                    `Creating Anthropic service with model: ${this.config.model}`,
                    'info',
                );
                return new AnthropicService(
                    this.config.apiKey,
                    this.config.model,
                );

            case 'azure-openai':
                if (
                    !this.config.apiKey ||
                    !this.config.endpoint ||
                    !this.config.deployment
                ) {
                    throw new Error(
                        'Azure OpenAI requires apiKey, endpoint, and deployment',
                    );
                }
                logger.logSystem(
                    `Creating Azure OpenAI service with deployment: ${this.config.deployment}`,
                    'info',
                );
                return new StandaloneAzureOpenAIService(
                    this.config.apiKey,
                    this.config.endpoint,
                    this.config.deployment,
                );

            case 'google':
                if (!this.config.apiKey) {
                    throw new Error('Google AI API key is required');
                }
                logger.logSystem(
                    `Creating Google AI service with model: ${this.config.model}`,
                    'info',
                );
                return new GoogleAIService(
                    this.config.apiKey,
                    this.config.model,
                );

            case 'ollama':
                if (!this.config.endpoint) {
                    throw new Error('Ollama endpoint is required');
                }
                logger.logSystem(
                    `Creating Ollama service at ${this.config.endpoint} with model: ${this.config.model}`,
                    'info',
                );
                return new OllamaService(
                    this.config.endpoint,
                    this.config.model,
                );

            default:
                throw new Error(
                    `Unsupported provider: ${this.config.provider}`,
                );
        }
    }
}
