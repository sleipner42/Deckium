import {
  Presentation,
  Slide,
  ContentElement,
} from '../../common/domain/entities/types';

export class PresentationState {
  private presentation: Presentation;

  constructor() {
    const titleSlide = this.createSlide();
    this.presentation = {
      id: 'singleton',
      title: 'Untitled Presentation',
      slides: [titleSlide],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createSlide(): Slide {
    return {
      id: crypto.randomUUID(),
      elements: [],
      background: '#FFFFFF',
      transition: 'none',
    };
  }

  getPresentation(): Presentation {
    return this.presentation;
  }

  initializePresentation(title = 'Untitled Presentation'): Presentation {
    const titleSlide = this.createSlide();

    this.presentation = {
      id: 'singleton',
      title,
      slides: [titleSlide],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.presentation;
  }

  /**
   * Load an existing presentation into the state
   * @param presentation The presentation to load
   * @returns The loaded presentation
   */
  loadPresentation(presentation: Presentation): Presentation {
    this.presentation = {
      ...presentation,
      updatedAt: new Date(), // Update the timestamp when loading
    };

    return this.presentation;
  }

  updatePresentationMeta(title: string): Presentation {
    this.presentation = {
      ...this.presentation,
      title,
      updatedAt: new Date(),
    };

    return this.presentation;
  }

  addSlide(): Slide {
    const newSlide = this.createSlide();

    this.presentation = {
      ...this.presentation,
      slides: [...this.presentation.slides, newSlide],
      updatedAt: new Date(),
    };

    return newSlide;
  }

  duplicateSlide(slideId: string): Slide | null {
    const slideIndex = this.findSlideIndex(slideId);
    if (slideIndex === -1) return null;

    const originalSlide = this.presentation.slides[slideIndex];
    
    // Create a new slide with new ID and duplicate all elements with new IDs
    const duplicatedSlide: Slide = {
      id: crypto.randomUUID(),
      background: originalSlide.background,
      transition: originalSlide.transition,
      elements: originalSlide.elements.map(element => ({
        ...element,
        id: crypto.randomUUID(), // Generate new ID for each element
      })),
    };

    // Insert the duplicated slide right after the original
    const updatedSlides = [...this.presentation.slides];
    updatedSlides.splice(slideIndex + 1, 0, duplicatedSlide);

    this.presentation = {
      ...this.presentation,
      slides: updatedSlides,
      updatedAt: new Date(),
    };

    return duplicatedSlide;
  }

  updateSlide(slideId: string, updates: Partial<Slide>): Slide | null {
    const slideIndex = this.findSlideIndex(slideId);
    if (slideIndex === -1) return null;

    const updatedSlide = {
      ...this.presentation.slides[slideIndex],
      ...updates,
    };

    const updatedSlides = [...this.presentation.slides];
    updatedSlides[slideIndex] = updatedSlide;

    this.presentation = {
      ...this.presentation,
      slides: updatedSlides,
      updatedAt: new Date(),
    };

    return updatedSlide;
  }

  deleteSlide(slideId: string): string | null {
    const slideIndex = this.findSlideIndex(slideId);
    if (slideIndex === -1) return null;

    const newSlides = this.presentation.slides.filter(
      (slide) => slide.id !== slideId,
    );

    if (newSlides.length === 0) {
      newSlides.push(this.createSlide());
    }

    this.presentation = {
      ...this.presentation,
      slides: newSlides,
      updatedAt: new Date(),
    };

    return slideId;
  }

  reorderSlides(fromIndex: number, toIndex: number): Presentation {
    if (
      fromIndex < 0 ||
      fromIndex >= this.presentation.slides.length ||
      toIndex < 0 ||
      toIndex >= this.presentation.slides.length ||
      fromIndex === toIndex
    ) {
      return this.presentation;
    }

    const newSlides = [...this.presentation.slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);

    this.presentation = {
      ...this.presentation,
      slides: newSlides,
      updatedAt: new Date(),
    };

    return this.presentation;
  }

  addElement(slideId: string, element: ContentElement): Slide | null {
    const slideIndex = this.findSlideIndex(slideId);
    if (slideIndex === -1) return null;

    const slide = this.presentation.slides[slideIndex];
    const updatedSlide = {
      ...slide,
      elements: [...slide.elements, element],
    };

    const updatedSlides = [...this.presentation.slides];
    updatedSlides[slideIndex] = updatedSlide;

    this.presentation = {
      ...this.presentation,
      slides: updatedSlides,
      updatedAt: new Date(),
    };

    return updatedSlide;
  }

  updateElement(
    elementId: string,
    updates: Partial<ContentElement>,
  ): Slide | null {
    for (let i = 0; i < this.presentation.slides.length; i++) {
      const slide = this.presentation.slides[i];
      const elementIndex = slide.elements.findIndex((e) => e.id === elementId);

      if (elementIndex !== -1) {
        const element = slide.elements[elementIndex];
        const updatedElement = { ...element, ...updates } as ContentElement;
        const updatedElements = [...slide.elements];
        updatedElements[elementIndex] = updatedElement;

        const updatedSlide = {
          ...slide,
          elements: updatedElements,
        };

        const updatedSlides = [...this.presentation.slides];
        updatedSlides[i] = updatedSlide;

        this.presentation = {
          ...this.presentation,
          slides: updatedSlides,
          updatedAt: new Date(),
        };

        return updatedSlide;
      }
    }

    return null;
  }

  deleteElement(elementId: string): Slide | null {
    for (let i = 0; i < this.presentation.slides.length; i++) {
      const slide = this.presentation.slides[i];
      const elementIndex = slide.elements.findIndex((e) => e.id === elementId);

      if (elementIndex !== -1) {
        const updatedElements = slide.elements.filter(
          (e) => e.id !== elementId,
        );

        const updatedSlide = {
          ...slide,
          elements: updatedElements,
        };

        const updatedSlides = [...this.presentation.slides];
        updatedSlides[i] = updatedSlide;

        this.presentation = {
          ...this.presentation,
          slides: updatedSlides,
          updatedAt: new Date(),
        };

        return updatedSlide;
      }
    }

    return null;
  }

  private findSlideIndex(slideId: string): number {
    return this.presentation.slides.findIndex((slide) => slide.id === slideId);
  }

  private findElement(elementId: string): ContentElement | null {
    for (const slide of this.presentation.slides) {
      const element = slide.elements.find((e) => e.id === elementId);
      if (element) return element;
    }
    return null;
  }
}
