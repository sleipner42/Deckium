import React, {
  createContext,
  useContext,
  ReactNode,
} from 'react';
import {
  Thread,
} from '../../../common/domain/entities/ai-types';
import { MessageContent } from '../../../common/domain/interfaces/ai-service.interface';
import { UUID } from '../../../common/domain/entities/types';
import { useMainProcessAI } from '../hooks/useMainProcessAI';
import { usePresentation } from './PresentationContext';

interface AIContextState {
  currentThread: Thread | null;
  threads: Thread[];
  isLoading: boolean;
  error: string | null;
}

interface AIContextActions {
  createThread: (title: string) => Promise<void>;
  sendMessage: (message: string, imageDataUrls?: string[]) => Promise<void>;
  loadThread: (threadId: UUID) => Promise<void>;
  deleteThread: (threadId: UUID) => Promise<void>;
}

interface AIContextValue extends AIContextState, AIContextActions {}

const AIContext = createContext<AIContextValue | null>(null);

interface AIProviderProps {
  children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({
  children,
}) => {
  const presentation = usePresentation();
  const presentationId = presentation.currentPresentation?.id;
  
  const {
    threads,
    currentThread,
    isLoading,
    error,
    createThread: createThreadInMainProcess,
    loadThread: loadThreadFromMainProcess,
    deleteThread: deleteThreadInMainProcess,
    sendMessage: sendMessageToMainProcess,
  } = useMainProcessAI(presentationId || 'default');
  
  const createThread = async (title: string) => {
    if (!presentation.currentPresentation) {
      throw new Error('No active presentation');
    }
    
    await createThreadInMainProcess(title);
  };
  
  const sendMessage = async (message: string, imageDataUrls?: string[]) => {
    if (!currentThread) {
      throw new Error('No active thread. Please create a thread first before sending a message.');
    }
    
    let content: MessageContent[] | undefined;
    
    if (imageDataUrls && imageDataUrls.length > 0) {
      content = [
        { type: 'text', text: message }
      ];
      
      // Add each image to the content array
      imageDataUrls.forEach(dataUrl => {
        content!.push({
          type: 'image_url',
          image_url: { url: dataUrl }
        });
      });
      
      await sendMessageToMainProcess(message, content);
    } else {
      await sendMessageToMainProcess(message);
    }
  };
  
  const loadThread = async (threadId: UUID) => {
    await loadThreadFromMainProcess(threadId);
  };
  
  const deleteThread = async (threadId: UUID) => {
    await deleteThreadInMainProcess(threadId);
  };

  return (
    <AIContext.Provider
      value={{
        currentThread,
        threads,
        isLoading,
        error,
        createThread,
        sendMessage,
        loadThread,
        deleteThread,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
