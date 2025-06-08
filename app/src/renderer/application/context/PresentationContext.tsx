import React, {
  createContext,
  useContext,
  ReactNode,
  useRef,
  useCallback,
  RefObject,
} from 'react';
import {
  Presentation,
  Slide,
  ContentElement,
} from '../../../common/domain/entities/types';
import { useMainProcessPresentation } from '../hooks/useMainProcessPresentation';

interface PresentationContextState {
  currentPresentation: Presentation;
  slides: Slide[];
  selectedSlide: Slide | null;
  currentSlideIndex: number;
  selectedElementId: string | null;
  isLoading: boolean;
  error: string | null;
  currentFilePath: string | null;
  undoRedoState: {
    canUndo: boolean;
    canRedo: boolean;
    undoDescription: string | null;
    redoDescription: string | null;
  };
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
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;
  selectElement: (elementId: string | null) => void;
  addElement: (element: ContentElement) => void;
  updateElement: (elementId: string, updates: Partial<ContentElement>) => void;
  deleteElement: (elementId: string) => void;
  moveElement: (elementId: string, x: number, y: number) => void;
  resizeElement: (elementId: string, width: number, height: number) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  reorderSlides: (fromIndex: number, toIndex: number) => Promise<Presentation>;
  startEditingElement: (elementId: string) => void;
  stopEditingElement: (elementId: string, content?: string) => void;
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
    isLoading,
    error,
    currentFilePath,
    undoRedoState,

    // Actions
    initializePresentation,
    updatePresentationMeta,
    addSlide,
    selectSlide,
    updateSlide,
    deleteSlide,
    nextSlide,
    previousSlide,
    goToSlide,
    selectElement,
    addElement,
    updateElement,
    deleteElement,
    moveElement,
    resizeElement,
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
    isLoading,
    error,
    currentFilePath,
    undoRedoState: undoRedoState || {
      canUndo: false,
      canRedo: false,
      undoDescription: null,
      redoDescription: null,
    },
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
        nextSlide,
        previousSlide,
        goToSlide,
        selectElement,
        addElement,
        updateElement,
        deleteElement,
        moveElement,
        resizeElement,
        undo,
        redo,
        reorderSlides,
        savePresentation,
        savePresentationAs,
        loadPresentation,
        startEditingElement: () => {},
        stopEditingElement: () => {},
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
