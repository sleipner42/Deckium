import { useCallback, useEffect, useState } from 'react';
import {
  AIRequest,
  AIResponse,
  Thread,
} from '../../../common/domain/entities/ai-types';
import { UUID } from '../../../common/domain/entities/types';
import { MessageContent } from '../../../common/domain/interfaces/ai-service.interface';

interface ElectronWindow {
  electron: {
    ipcRenderer: {
      sendMessage: (channel: string, ...args: unknown[]) => void;
      on: (channel: string, func: (...args: unknown[]) => void) => () => void;
      once: (channel: string, func: (...args: unknown[]) => void) => void;
    };
    ai: {
      createThread: (title: string, presentationId: UUID) => Promise<Thread>;
      getThread: (threadId: UUID) => Promise<Thread | null>;
      saveThread: (thread: Thread) => Promise<Thread>;
      getThreadsForPresentation: (presentationId: UUID) => Promise<Thread[]>;
      deleteThread: (threadId: UUID) => Promise<boolean>;
      sendMessage: (request: AIRequest) => Promise<{ message: string }>;
    };
  };
}

const electronAPI = (window as unknown as ElectronWindow).electron;

export const useMainProcessAI = (presentationId: UUID) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const loadThreads = useCallback(async () => {
    if (!presentationId) return;

    try {
      setIsLoading(true);
      const loadedThreads =
        await electronAPI.ai.getThreadsForPresentation(presentationId);
      setThreads(loadedThreads);
      if (loadedThreads.length > 0 && !currentThread) {
        setCurrentThread(loadedThreads[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load threads');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [presentationId, currentThread]);

  useEffect(() => {
    if (!isInitialized && presentationId) {
      loadThreads();
    }
  }, [isInitialized, presentationId, loadThreads]);

  useEffect(() => {
    if (presentationId && isInitialized) {
      // When presentation changes, reload threads
      loadThreads();
    }
  }, [presentationId, isInitialized, loadThreads]);

  useEffect(() => {
    const threadCreatedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:thread-created',
      (...args: unknown[]) => {
        const newThread = args[0] as Thread;
        setThreads((prev) => [...prev, newThread]);
        setCurrentThread(newThread);
      },
    );

    const threadUpdatedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:thread-updated',
      (...args: unknown[]) => {
        const updatedThread = args[0] as Thread;

        console.log(`Thread updated event for thread: ${updatedThread.id}`);

        setThreads((prev) => {
          const index = prev.findIndex((t) => t.id === updatedThread.id);
          if (index === -1) {
            console.log(`Adding thread in update event: ${updatedThread.id}`);
            return [...prev, updatedThread];
          }

          console.log(`Updating thread in threads array: ${updatedThread.id}`);
          const newThreads = [...prev];
          newThreads[index] = updatedThread;
          return newThreads;
        });

        // Always update current thread if it matches or if none is selected
        if (!currentThread || currentThread.id === updatedThread.id) {
          console.log(
            `Setting current thread in update event: ${updatedThread.id}`,
          );
          setCurrentThread(updatedThread);
        }
      },
    );

    const threadDeletedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:thread-deleted',
      (...args: unknown[]) => {
        const deletedThreadId = args[0] as UUID;
        setThreads((prev) => {
          const updatedThreads = prev.filter(
            (thread) => thread.id !== deletedThreadId,
          );
          if (currentThread?.id === deletedThreadId) {
            setTimeout(() => {
              setCurrentThread(
                updatedThreads.length > 0 ? updatedThreads[0] : null,
              );
            }, 0);
          }
          return updatedThreads;
        });
      },
    );

    const messageChunkReceivedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:message-chunk-received',
      (...args: unknown[]) => {
        const data = args[0] as {
          threadId: UUID;
          messageId: UUID;
          chunk: string;
          fullContent: string;
        };

        console.log('Chunk received:', data);

        if (data.threadId && data.messageId) {
          setThreads((prev) => {
            const threadIndex = prev.findIndex((t) => t.id === data.threadId);
            if (threadIndex === -1) return prev;

            const updatedThreads = [...prev];
            const thread = { ...updatedThreads[threadIndex] };

            const messageIndex = thread.messages.findIndex(
              (m) => m.id === data.messageId,
            );
            if (messageIndex === -1) return prev;

            const updatedMessages = [...thread.messages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              content: data.fullContent,
              streamingState: 'streaming',
            };

            thread.messages = updatedMessages;
            updatedThreads[threadIndex] = thread;

            return updatedThreads;
          });

          if (currentThread?.id === data.threadId) {
            setCurrentThread((prev) => {
              if (!prev) return prev;

              const updatedThread = { ...prev };
              const messageIndex = updatedThread.messages.findIndex(
                (m) => m.id === data.messageId,
              );
              if (messageIndex === -1) return prev;

              const updatedMessages = [...updatedThread.messages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: data.fullContent,
                streamingState: 'streaming',
              };

              updatedThread.messages = updatedMessages;
              return updatedThread;
            });
          }
        }
      },
    );

    const processingStartedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:processing-started',
      (...args: unknown[]) => {
        const threadId = args[0] as UUID;
        if (currentThread?.id === threadId) {
          setIsLoading(true);
        }
      },
    );

    const processingCompletedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:processing-completed',
      (...args: unknown[]) => {
        const threadId = args[0] as UUID;
        if (currentThread?.id === threadId) {
          setIsLoading(false);
        }
      },
    );

    const processingErrorUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:processing-error',
      (...args: unknown[]) => {
        const data = args[0] as { threadId: UUID; error: string };
        if (currentThread?.id === data.threadId) {
          setError(data.error);
          setIsLoading(false);
        }
      },
    );

    return () => {
      threadCreatedUnsubscribe();
      threadUpdatedUnsubscribe();
      threadDeletedUnsubscribe();
      messageChunkReceivedUnsubscribe();
      processingStartedUnsubscribe();
      processingCompletedUnsubscribe();
      processingErrorUnsubscribe();
    };
  }, [currentThread]);

  const createThread = useCallback(
    async (title: string) => {
      if (!presentationId) {
        setError('No active presentation');
        throw new Error('No active presentation');
      }

      try {
        setIsLoading(true);
        setError(null);

        await electronAPI.ai.createThread(title, presentationId);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [presentationId],
  );

  const loadThread = useCallback(async (threadId: UUID) => {
    try {
      setIsLoading(true);
      setError(null);

      const thread = await electronAPI.ai.getThread(threadId);

      if (!thread) {
        throw new Error(`Thread with ID ${threadId} not found`);
      }

      setCurrentThread(thread);
      return thread;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteThread = useCallback(async (threadId: UUID) => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await electronAPI.ai.deleteThread(threadId);

      if (!success) {
        throw new Error(`Failed to delete thread ${threadId}`);
      }

      return success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string, content?: MessageContent[]) => {
      if (!currentThread) {
        setError(
          'No active thread. Please create a thread first before sending a message.',
        );
        throw new Error('No active thread');
      }

      try {
        setIsLoading(true);
        setError(null);

        // First, refresh the threads list to ensure we have the latest data
        const updatedThreads =
          await electronAPI.ai.getThreadsForPresentation(presentationId);
        setThreads(updatedThreads);

        // If the current thread doesn't exist in the updated list, use the first thread
        const threadExists = updatedThreads.some(
          (t) => t.id === currentThread.id,
        );
        let threadToUse = currentThread;

        if (!threadExists && updatedThreads.length > 0) {
          console.log(
            `Current thread ${currentThread.id} not found in updated list. Using thread ${updatedThreads[0].id} instead.`,
          );
          threadToUse = updatedThreads[0];
          setCurrentThread(threadToUse);
        }

        const request: AIRequest = {
          threadId: threadToUse.id,
          message,
          content,
        };

        console.log('Sending message:', request);

        const response = await electronAPI.ai.sendMessage(request);

        return response.message;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentThread, presentationId],
  );

  return {
    threads,
    currentThread,
    isLoading,
    error,

    createThread,
    loadThread,
    deleteThread,
    sendMessage,
  };
};
