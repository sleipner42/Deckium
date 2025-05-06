import { Presentation, Slide, ContentElement } from '../../common/domain/entities/types';

export class PresentationState {
  private presentation: Presentation;

  constructor() {
    const titleSlide = this.createSlide('Title Slide');
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

  initializePresentation(): Presentation {
    const titleSlide = this.createSlide();
    
    this.presentation = {
      id: 'singleton',
      title: 'Untitled Presentation',
      slides: [titleSlide],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return this.presentation;
  }

  updatePresentationMeta(title: string): Presentation {
    this.presentation = {
      ...this.presentation,
      title,
      updatedAt: new Date()
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
  
  updateSlide(slideId: string, updates: Partial<Slide>): Slide | null {
    const slideIndex = this.findSlideIndex(slideId);
    if (slideIndex === -1) return null;
    
    const updatedSlide = { 
      ...this.presentation.slides[slideIndex], 
      ...updates 
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
    
    const newSlides = this.presentation.slides.filter(slide => slide.id !== slideId);
    
    if (newSlides.length === 0) {
      newSlides.push(this.createSlide('New Slide'));
    }
    
    this.presentation = {
      ...this.presentation,
      slides: newSlides,
      updatedAt: new Date(),
    };
    
    return slideId;
  }
  
  addElement(slideId: string, element: ContentElement): Slide | null {
    const slideIndex = this.findSlideIndex(slideId);
    if (slideIndex === -1) return null;
    
    const slide = this.presentation.slides[slideIndex];
    const updatedSlide = {
      ...slide,
      elements: [...slide.elements, element]
    };
    
    const updatedSlides = [...this.presentation.slides];
    updatedSlides[slideIndex] = updatedSlide;
    
    this.presentation = {
      ...this.presentation,
      slides: updatedSlides,
      updatedAt: new Date()
    };
    
    return updatedSlide;
  }
  
  updateElement(elementId: string, updates: Partial<ContentElement>): Slide | null {
    for (let i = 0; i < this.presentation.slides.length; i++) {
      const slide = this.presentation.slides[i];
      const elementIndex = slide.elements.findIndex(e => e.id === elementId);
      
      if (elementIndex !== -1) {
        const element = slide.elements[elementIndex];
        const updatedElement = { ...element, ...updates } as ContentElement;
        const updatedElements = [...slide.elements];
        updatedElements[elementIndex] = updatedElement;
        
        const updatedSlide = {
          ...slide,
          elements: updatedElements
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
    return this.presentation.slides.findIndex(slide => slide.id === slideId);
  }

  private findElement(elementId: string): ContentElement | null {
    for (const slide of this.presentation.slides) {
      const element = slide.elements.find(e => e.id === elementId);
      if (element) return element;
    }
    return null;
  }
} 