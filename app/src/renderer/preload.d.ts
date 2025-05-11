import { PresentationChannels, AIChannels } from '../main/preload';
import { AuthChannels } from '../common/domain/interfaces/auth.interface';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: string, args: unknown[]): void;
        on(
          channel: PresentationChannels | AIChannels | AuthChannels,
          func: (...args: unknown[]) => void
        ): () => void;
        once(channel: string, func: (...args: unknown[]) => void): void;
      };
      auth: {
        login(): Promise<{ success: boolean; error?: string }>;
        logout(): Promise<{ success: boolean; error?: string }>;
        getUser(): Promise<{ 
          success: boolean;
          user?: unknown;
          error?: string;
        }>;
        refreshTokens(): Promise<{ success: boolean; error?: string }>;
        getBalance(): Promise<{ success: boolean; balance?: number; error?: string }>;
      };
      ai: {
        createThread(title: string, presentationId: string): Promise<unknown>;
        getThread(threadId: string): Promise<unknown>;
        saveThread(thread: unknown): Promise<unknown>;
        getThreadsForPresentation(presentationId: string): Promise<unknown>;
        deleteThread(threadId: string): Promise<unknown>;
        sendMessage(request: unknown): Promise<unknown>;
      };
      presentation: {
        initializePresentation(title: string): Promise<unknown>;
        getPresentation(): Promise<unknown>;
        updateMeta(title: string): Promise<unknown>;
        addSlide(title?: string): Promise<unknown>;
        updateSlide(slideId: string, updates: unknown): Promise<unknown>;
        deleteSlide(slideId: string): Promise<unknown>;
        addElement(slideId: string, element: unknown): Promise<unknown>;
        updateElement(elementId: string, updates: unknown): Promise<unknown>;
      };
    };
  }
}

export {};
