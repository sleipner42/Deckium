import React, { createContext, ReactNode, useContext } from 'react';
import { Thread } from '../../../common/domain/entities/ai-types';
import { UUID } from '../../../common/domain/entities/types';
import { useMainProcessCritic } from '../hooks/useMainProcessCritic';
import { usePresentation } from './PresentationContext';

interface CriticContextState {
    currentThread: Thread | null;
    threads: Thread[];
    isLoading: boolean;
    error: string | null;
}

interface CriticContextActions {
    createThread: (title: string) => Promise<void>;
    reviewSlide: (slideId: UUID) => Promise<string>;
    loadThread: (threadId: UUID) => Promise<void>;
    deleteThread: (threadId: UUID) => Promise<void>;
}

interface CriticContextValue extends CriticContextState, CriticContextActions {}

const CriticContext = createContext<CriticContextValue | null>(null);

interface CriticProviderProps {
    children: ReactNode;
}

export const CriticProvider: React.FC<CriticProviderProps> = ({ children }) => {
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
        reviewSlide: reviewSlideInMainProcess,
    } = useMainProcessCritic(presentationId || 'default');

    const createThread = async (title: string) => {
        if (!presentation.currentPresentation) {
            throw new Error('No active presentation');
        }

        await createThreadInMainProcess(title);
    };

    const reviewSlide = async (slideId: UUID) => {
        if (!currentThread) {
            // Create a thread automatically if none exists
            await createThread('Critic Thread');
        }

        return await reviewSlideInMainProcess(slideId);
    };

    const loadThread = async (threadId: UUID) => {
        await loadThreadFromMainProcess(threadId);
    };

    const deleteThread = async (threadId: UUID) => {
        await deleteThreadInMainProcess(threadId);
    };

    return (
        <CriticContext.Provider
            value={{
                currentThread,
                threads,
                isLoading,
                error,
                createThread,
                reviewSlide,
                loadThread,
                deleteThread,
            }}
        >
            {children}
        </CriticContext.Provider>
    );
};

export const useCritic = () => {
    const context = useContext(CriticContext);
    if (!context) {
        throw new Error('useCritic must be used within a CriticProvider');
    }
    return context;
};
