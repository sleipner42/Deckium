import React, { createContext, ReactNode, useContext, useState } from 'react';
import { ContentElement } from '../../../common/domain/entities/types';

interface ClipboardContextState {
    copiedElements: ContentElement[];
    hasCopiedElements: boolean;
}

interface ClipboardContextActions {
    copyElements: (elements: ContentElement[]) => void;
    clearClipboard: () => void;
    getCopiedElements: () => ContentElement[];
}

type ClipboardContextValue = ClipboardContextState & ClipboardContextActions;

const ClipboardContext = createContext<ClipboardContextValue | null>(null);

interface ClipboardProviderProps {
    children: ReactNode;
}

export const ClipboardProvider: React.FC<ClipboardProviderProps> = ({
    children,
}) => {
    const [copiedElements, setCopiedElements] = useState<ContentElement[]>([]);

    const copyElements = (elements: ContentElement[]) => {
        setCopiedElements([...elements]); // Deep copy to avoid reference issues
    };

    const clearClipboard = () => {
        setCopiedElements([]);
    };

    const getCopiedElements = (): ContentElement[] => {
        return [...copiedElements]; // Return a copy to prevent mutation
    };

    const state: ClipboardContextState = {
        copiedElements,
        hasCopiedElements: copiedElements.length > 0,
    };

    const actions: ClipboardContextActions = {
        copyElements,
        clearClipboard,
        getCopiedElements,
    };

    return (
        <ClipboardContext.Provider value={{ ...state, ...actions }}>
            {children}
        </ClipboardContext.Provider>
    );
};

export const useClipboard = (): ClipboardContextValue => {
    const context = useContext(ClipboardContext);
    if (!context) {
        throw new Error('useClipboard must be used within a ClipboardProvider');
    }
    return context;
};
