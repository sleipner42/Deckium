import React, { createContext, ReactNode, useContext } from 'react';
import {
    ContentElement,
    Presentation,
    Slide,
} from '../../../common/domain/entities/types';
import { useMainProcessPresentation } from '../hooks/useMainProcessPresentation';

interface PresentationContextState {
    currentPresentation: Presentation;
    slides: Slide[];
    selectedSlide: Slide | null;
    currentSlideIndex: number;
    selectedElementId: string | null;
    selectedElementIds: string[];
    editingElementId: string | null;
    isLoading: boolean;
    error: string | null;
    currentFilePath: string | null;
    canUndo: boolean;
    canRedo: boolean;
}

interface PresentationContextActions {
    initializePresentation: (title: string) => Promise<Presentation>;
    updatePresentationMeta: (
        title: string,
    ) => Promise<{ title: string; updatedAt: Date }>;
    addSlide: (title?: string) => void;
    selectSlide: (slide: Slide) => void;
    updateSlide: (
        slideId: string,
        updates: Partial<Slide>,
    ) => Promise<Slide | null>;
    deleteSlide: (slideId: string) => Promise<string | null>;
    duplicateSlide: (slideId: string) => Promise<Slide | null>;
    nextSlide: () => void;
    previousSlide: () => void;
    goToSlide: (index: number) => void;
    selectElement: (elementId: string | null) => void;
    selectMultipleElements: (elementIds: string[]) => void;
    toggleElementSelection: (elementId: string) => void;
    clearElementSelection: () => void;
    addElement: (element: ContentElement) => void;
    updateElement: (
        elementId: string,
        updates: Partial<ContentElement>,
        skipHistory?: boolean,
    ) => void;
    deleteElement: (elementId: string) => void;
    undo: () => Promise<Presentation | null>;
    redo: () => Promise<Presentation | null>;
    reorderSlides: (
        fromIndex: number,
        toIndex: number,
    ) => Promise<Presentation>;
    startEditingElement: (elementId: string) => void;
    stopEditingElement: () => void;
    moveElement: (elementId: string, x: number, y: number) => void;
    resizeElement: (elementId: string, width: number, height: number) => void;
    savePresentation: () => Promise<string | null>;
    savePresentationAs: () => Promise<string | null>;
    loadPresentation: (filePath?: string) => Promise<Presentation | null>;
    openFullscreen: () => Promise<void>;
    closeFullscreen: () => Promise<void>;
    isFullscreenOpen: () => Promise<boolean>;
}

export interface PresentationContextValue
    extends PresentationContextState,
        PresentationContextActions {
    openFullscreen: () => Promise<void>;
    closeFullscreen: () => Promise<void>;
    isFullscreenOpen: () => Promise<boolean>;
}

const PresentationContext = createContext<PresentationContextValue | null>(
    null,
);

interface PresentationProviderProps {
    children: ReactNode;
}

export const PresentationProvider: React.FC<PresentationProviderProps> = ({
    children,
}) => {
    const {
        presentation,
        selectedSlide,
        currentSlideIndex,
        selectedElementId,
        selectedElementIds,
        editingElementId,
        isLoading,
        error,
        currentFilePath,
        canUndo,
        canRedo,

        // Actions
        initializePresentation,
        updatePresentationMeta,
        addSlide,
        selectSlide,
        updateSlide,
        deleteSlide,
        duplicateSlide,
        nextSlide,
        previousSlide,
        goToSlide,
        selectElement,
        selectMultipleElements,
        toggleElementSelection,
        clearElementSelection,
        startEditingElement,
        stopEditingElement,
        addElement,
        updateElement,
        deleteElement,
        undo,
        redo,
        reorderSlides,
        savePresentation,
        savePresentationAs,
        loadPresentation,
        openFullscreen,
        closeFullscreen,
        isFullscreenOpen,
    } = useMainProcessPresentation();

    const { slides } = presentation;

    const state = {
        currentPresentation: presentation,
        slides,
        selectedSlide,
        currentSlideIndex,
        selectedElementId,
        selectedElementIds,
        editingElementId,
        isLoading,
        error,
        currentFilePath,
        canUndo,
        canRedo,
    };

    return (
        <PresentationContext.Provider
            value={{
                ...state,
                initializePresentation,
                updatePresentationMeta,
                addSlide,
                selectSlide,
                updateSlide,
                deleteSlide,
                duplicateSlide,
                nextSlide,
                previousSlide,
                goToSlide,
                selectElement,
                selectMultipleElements,
                toggleElementSelection,
                clearElementSelection,
                addElement,
                updateElement,
                deleteElement,
                undo,
                redo,
                reorderSlides,
                savePresentation,
                savePresentationAs,
                loadPresentation,
                startEditingElement,
                stopEditingElement,
                moveElement: (elementId: string, x: number, y: number) => {
                    updateElement(elementId, { position: { x, y } });
                },
                resizeElement: (
                    elementId: string,
                    width: number,
                    height: number,
                ) => {
                    updateElement(elementId, { size: { width, height } });
                },
                openFullscreen,
                closeFullscreen,
                isFullscreenOpen,
            }}
        >
            {children}
        </PresentationContext.Provider>
    );
};

export const usePresentation = () => {
    const context = useContext(PresentationContext);
    if (!context) {
        throw new Error(
            'usePresentation must be used within a PresentationProvider',
        );
    }
    return context;
};
