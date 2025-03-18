import { useState, useEffect, useCallback } from 'react';
import { Thread, AIRequest, AIResponse } from '../../../common/domain/entities/ai-types';
import { MessageContent } from '../../../common/domain/interfaces/ai-service.interface';
import { UUID } from '../../../common/domain/entities/types';

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

const electronAPI = ((window as unknown) as ElectronWindow).electron;

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
      const loadedThreads = await electronAPI.ai.getThreadsForPresentation(presentationId);
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
        setThreads(prev => [...prev, newThread]);
        setCurrentThread(newThread);
      }
    );

    const threadDeletedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:thread-deleted',
      (...args: unknown[]) => {
        const deletedThreadId = args[0] as UUID;
        setThreads(prev => {
          const updatedThreads = prev.filter(thread => thread.id !== deletedThreadId);
          if (currentThread?.id === deletedThreadId) {
            setTimeout(() => {
              setCurrentThread(updatedThreads.length > 0 ? updatedThreads[0] : null);
            }, 0);
          }
          return updatedThreads;
        });
      }
    );

    const messageReceivedUnsubscribe = electronAPI.ipcRenderer.on(
      'ai:message-received',
      (...args: unknown[]) => {
        const data = args[0] as { threadId: UUID, message: string, updatedThread: Thread };
        if (data.updatedThread) {
          setThreads(prev => {
            const index = prev.findIndex(t => t.id === data.threadId);
            if (index === -1) return prev;
            
            const newThreads = [...prev];
            newThreads[index] = data.updatedThread;
            return newThreads;
          });
          
          if (currentThread?.id === data.threadId) {
            setCurrentThread(data.updatedThread);
          }
        }
      }
    );

    return () => {
      threadCreatedUnsubscribe();
      threadDeletedUnsubscribe();
      messageReceivedUnsubscribe();
    };
  }, [currentThread]);

  const createThread = useCallback(async (title: string) => {
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
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [presentationId]);

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
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
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
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string, content?: MessageContent[]) => {
    if (!currentThread) {
      setError('No active thread. Please create a thread first before sending a message.');
      throw new Error('No active thread');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const request: AIRequest = {
        threadId: currentThread.id,
        message,
        content
      };

      console.log('Sending message:', request);
      
      const response = await electronAPI.ai.sendMessage(request);
      
      return response.message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentThread]);

  return {
    threads,
    currentThread,
    isLoading,
    error,
    
    createThread,
    loadThread,
    deleteThread,
    sendMessage
  };
}; 