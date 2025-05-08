import { AzureOpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Message } from '../../../common/domain/entities/ai-types';
import {
  IAIService,
  IAIServiceFactory,
  IAIModelClient,
  MessageContent,
} from '../../../common/domain/interfaces/ai-service.interface';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  // console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found in the project root directory.');
  dotenv.config();
}

export class AzureOpenAIService implements IAIService {
  private client: AzureOpenAI;

  constructor(client: AzureOpenAI) {
    this.client = client;
  }

  async chat(messages: Message[], deploymentName?: string): Promise<string> {
    const overallStartTime = performance.now();
    // console.log( `[AzureOpenAI] Starting chat request with ${messages.length} messages`,);

    try {
      const formatStartTime = performance.now();

      const userMessages = messages.filter((msg) => msg.role === 'user');
      const latestUserMessageId =
        userMessages.length > 0
          ? userMessages[userMessages.length - 1].id
          : null;

      const formattedMessages = messages.map((msg, index, allMessages) => {
        const baseMessage = {
          role: msg.role as 'user' | 'assistant' | 'system',
        };

        const isLatestUserMessage = msg.id === latestUserMessageId;

        if (typeof msg.content === 'string') {
          return {
            ...baseMessage,
            content: msg.content,
          };
        }
        // For older messages, filter out image content to reduce payload size
        const isOldMessage = msg.role === 'user' && !isLatestUserMessage;

        return {
          ...baseMessage,
          content: msg.content.map((item) => {
            if (item.type === 'text') {
              return { type: 'text', text: item.text };
            }
            if (item.type === 'image_url' && item.image_url) {
              // Only include images in the latest user message
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

      const formatEndTime = performance.now();
      // console.log( `[AzureOpenAI] Message formatting took ${formatEndTime - formatStartTime}ms`,);

      const originalSize = JSON.stringify(messages).length;
      const optimizedSize = JSON.stringify(formattedMessages).length;
      const sizeSaved = originalSize - optimizedSize;

      // console.log(
      //   `[AzureOpenAI] Payload optimization: Original ${(originalSize / 1024).toFixed(2)} KB → Optimized ${(optimizedSize / 1024).toFixed(2)} KB (${(sizeSaved / 1024).toFixed(2)} KB saved, ${((sizeSaved / originalSize) * 100).toFixed(2)}%)`,);

      const modelName = 'gpt-4.1-mini';
      // console.log(`[AzureOpenAI] Using deployment: ${modelName}`);

      let requestSize = 0;
      try {
        requestSize = JSON.stringify(formattedMessages).length;
        // console.log( `[AzureOpenAI] Request payload size: ${(requestSize / 1024).toFixed(2)} KB`,);
      } catch (err) {
        console.log(`[AzureOpenAI] Could not calculate request size: ${err}`);
      }

      const apiCallStartTime = performance.now();
      // console.log( `[AzureOpenAI] Sending request to Azure OpenAI API at ${new Date().toISOString()}`,);
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: formattedMessages as any,
      });
      const apiCallEndTime = performance.now();
      const apiCallDuration = apiCallEndTime - apiCallStartTime;
      // console.log(`[AzureOpenAI] API call took ${apiCallDuration}ms`);

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from AI service');
      }

      const processingStartTime = performance.now();
      const aiResponse = response.choices[0].message?.content || '';
      const processingEndTime = performance.now();

      // console.log( `[AzureOpenAI] Response processing took ${processingEndTime - processingStartTime}ms`,);
      // console.log( `[AzureOpenAI] Received response from Azure OpenAI. Response length: ${aiResponse.length} characters`,);

      if (response.usage) {
        console.log(
          `[AzureOpenAI] Token usage - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`,
        );
      }

      const overallEndTime = performance.now();
      // console.log( `[AzureOpenAI] Total request time: ${overallEndTime - overallStartTime}ms`,);

      return aiResponse;
    } catch (error) {
      const overallEndTime = performance.now();
      console.error(
        `[AzureOpenAI] Error sending message to Azure OpenAI (after ${overallEndTime - overallStartTime}ms):`,
        error,
      );
      throw error;
    }
  }

  async chatStream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    deploymentName?: string,
  ): Promise<string> {
    const overallStartTime = performance.now();
    // console.log( `[AzureOpenAI] Starting streaming chat request with ${messages.length} messages`,);

    try {
      const formatStartTime = performance.now();

      const userMessages = messages.filter((msg) => msg.role === 'user');
      const latestUserMessageId =
        userMessages.length > 0
          ? userMessages[userMessages.length - 1].id
          : null;

      const formattedMessages = messages.map((msg) => {
        const baseMessage = {
          role: msg.role as 'user' | 'assistant' | 'system',
        };

        const isLatestUserMessage = msg.id === latestUserMessageId;

        if (typeof msg.content === 'string') {
          return {
            ...baseMessage,
            content: msg.content,
          };
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

      const formatEndTime = performance.now();
      // console.log( `[AzureOpenAI] Message formatting took ${formatEndTime - formatStartTime}ms`,);

      const modelName = 'gpt-4.1-mini';
      // console.log(`[AzureOpenAI] Using deployment for streaming: ${modelName}`);

      const apiCallStartTime = performance.now();
      // console.log( `[AzureOpenAI] Sending streaming request to Azure OpenAI API at ${new Date().toISOString()}`,);

      try {
        const stream = await this.client.chat.completions.create({
          model: modelName,
          messages: formattedMessages as any,
          stream: true,
        });

        let completeResponse = '';

        // console.log('[AzureOpenAI] Stream created, processing chunks...');

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // console.log(`[AzureOpenAI] Received chunk: "${content}"`);
            completeResponse += content;
            onChunk(content);
          }
        }

        const apiCallEndTime = performance.now();
        const apiCallDuration = apiCallEndTime - apiCallStartTime;
        // console.log( `[AzureOpenAI] Streaming API call completed in ${apiCallDuration}ms`,);
        // console.log( `[AzureOpenAI] Total streamed response length: ${completeResponse.length} characters`,);

        const overallEndTime = performance.now();
        // console.log( `[AzureOpenAI] Total streaming request time: ${overallEndTime - overallStartTime}ms`,);

        return completeResponse;
      } catch (streamError) {
        console.error('[AzureOpenAI] Error during streaming:', streamError);
        throw streamError;
      }
    } catch (error) {
      const overallEndTime = performance.now();
      console.error(
        `[AzureOpenAI] Error in streaming chat (after ${overallEndTime - overallStartTime}ms):`,
        error,
      );
      throw error;
    }
  }
}

export class AzureOpenAIServiceFactory implements IAIServiceFactory {
  createService(): IAIService {
    const initStartTime = performance.now();
    // console.log('[AzureOpenAI] Initializing service...');

    try {
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

      // console.log('[AzureOpenAI] Configuration:');
      // console.log(`[AzureOpenAI] Endpoint: ${endpoint ? 'Set' : 'Not set'}`);
      // console.log( `[AzureOpenAI] API Key: ${apiKey ? 'Set (hidden)' : 'Not set'}`,);
      // console.log( `[AzureOpenAI] Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set (using default: gpt-4o-mini)'}`,);

      if (!apiKey || !endpoint) {
        throw new Error(
          'Azure OpenAI credentials not found in environment variables',
        );
      }

      const createClientStartTime = performance.now();
      const client = new AzureOpenAI({
        apiKey,
        endpoint,
        apiVersion: '2024-10-21',
      });
      const createClientEndTime = performance.now();

      // console.log( `[AzureOpenAI] Client creation took ${createClientEndTime - createClientStartTime}ms`,);
      // console.log('[AzureOpenAI] Client initialized successfully');

      const initEndTime = performance.now();
      // console.log( `[AzureOpenAI] Total initialization time: ${initEndTime - initStartTime}ms`,);

      return new AzureOpenAIService(client);
    } catch (error) {
      const initEndTime = performance.now();
      console.error(
        `[AzureOpenAI] Failed to initialize client (after ${initEndTime - initStartTime}ms):`,
        error,
      );
      throw error;
    }
  }
}
