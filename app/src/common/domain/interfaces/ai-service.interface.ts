import { Message } from '../entities/ai-types';

export interface IAIModelResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface IAIModelClient {
  chat: {
    completions: {
      create: any; // Use any to avoid compatibility issues with specific implementations
    };
  };
}

export interface IAIService {
  chat(
    messages: Message[],
    deploymentName?: string,
    abortSignal?: AbortSignal,
  ): Promise<string>;
  chatStream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    deploymentName?: string,
    abortSignal?: AbortSignal,
  ): Promise<string>;
}

export interface IAIServiceFactory {
  createService(): IAIService;
}
