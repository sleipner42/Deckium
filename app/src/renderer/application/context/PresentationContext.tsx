import React, { createContext, useContext, ReactNode, useRef, useCallback, RefObject } from 'react';
import { Presentation, Slide, ContentElement } from '../../../common/domain/entities/types';
import { useMainProcessPresentation } from '../hooks/useMainProcessPresentation';

interface PresentationContextState {
  currentPresentation: Presentation;
  slides: Slide[];
  selectedSlide: Slide | null;
  currentSlideIndex: number;
  selectedElementId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface PresentationContextActions {
  initializePresentation: (title: string) => Promise<Presentation>;
  updatePresentationMeta: (title: string) => Promise<{title: string, updatedAt: Date}>;
  addSlide: (title?: string) => void;
  selectSlide: (slide: Slide) => void;
  updateSlide: (slideId: string, updates: Partial<Slide>) => Promise<Slide | null>;
  deleteSlide: (slideId: string) => Promise<string | null>;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;
  selectElement: (elementId: string | null) => void;
  addElement: (element: ContentElement) => void;
  updateElement: (elementId: string, updates: Partial<ContentElement>) => void;
  startEditingElement: (elementId: string) => void;
  stopEditingElement: (elementId: string, content?: string) => void;
  moveElement: (elementId: string, x: number, y: number) => void;
  resizeElement: (elementId: string, width: number, height: number) => void;
}

export interface PresentationContextValue extends PresentationContextState, PresentationContextActions {}

const PresentationContext = createContext<PresentationContextValue | null>(null);

interface PresentationProviderProps {
  children: ReactNode;
}

export const PresentationProvider: React.FC<PresentationProviderProps> = ({ children }) => {

  const {
    presentation,
    selectedSlide,
    currentSlideIndex,
    selectedElementId,
    isLoading,
    error,
    
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
  } = useMainProcessPresentation();

  const slides = presentation.slides;

  const state = {
    currentPresentation: presentation,
    slides,
    selectedSlide,
    currentSlideIndex,
    selectedElementId,
    isLoading,
    error,
  }

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
        startEditingElement: () => {},
        stopEditingElement: () => {},
        moveElement: () => {},
        resizeElement: () => {}
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
};

export const usePresentation = () => {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error('usePresentation must be used within a PresentationProvider');
  }
  return context;
}; 