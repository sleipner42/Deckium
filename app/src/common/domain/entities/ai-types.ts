import { UUID, ContentElement } from './types';
import { MessageContent } from '../interfaces/ai-service.interface';

export type MessageRole = 'user' | 'assistant' | 'system' | 'critic';

export interface Message {
  id: UUID;
  content: string | MessageContent[];
  role: MessageRole;
  timestamp: Date;
  threadId: UUID;
  streamingState?: 'streaming' | 'completed';
}

export interface Thread {
  id: UUID;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  presentationId: UUID;
}

export interface AIToolResult {
  success: boolean;
  data?: any;
  screenshot?: string;
  error?: string;
}

export interface AIRequest {
  threadId: UUID;
  message: string;
  content?: MessageContent[];
}

export interface AIToolCall {
  toolId: UUID;
  toolName: string;
  params: Record<string, any>;
}

export interface AIResponse {
  message: string | MessageContent[];
  toolCalls?: AIToolCall[];
}

export interface AIToolContext {
  presentationId: UUID;
  slideId?: UUID;
  presentationMethods?: {
    addSlide: () => Promise<void>;
    updateElement: (
      elementId: string,
      updates: Partial<ContentElement>,
    ) => Promise<void>;
    selectSlide: (slideId: string) => void;
    deleteSlide: (slideId: string) => Promise<void>;
    moveElement: (elementId: string, x: number, y: number) => void;
    resizeElement: (elementId: string, width: number, height: number) => void;
  };
}
