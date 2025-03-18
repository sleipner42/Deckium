import { Presentation, Slide, ContentElement } from '../../common/domain/entities/types';
import { PresentationState } from './state';
import { PresentationEventBus } from './event-bus';

export class PresentationService {
  private state: PresentationState;
  private eventBus: PresentationEventBus;

  constructor() {
    this.state = new PresentationState();
    this.eventBus = new PresentationEventBus();
  }

  getPresentation(): Presentation {
    return this.state.getPresentation();
  }

  initializePresentation(title: string): Presentation {
    const presentation = this.state.initializePresentation(title);
    this.eventBus.broadcastToWindows(PresentationEventBus.events.INITIALIZED, presentation);
    return presentation;
  }

  updatePresentationMeta(title: string): { title: string, updatedAt: Date } {
    const presentation = this.state.updatePresentationMeta(title);
    const data = { 
      title: presentation.title,
      updatedAt: presentation.updatedAt 
    };
    this.eventBus.broadcastToWindows(PresentationEventBus.events.META_UPDATED, data);
    return data;
  }

  addSlide(title: string = 'New Slide'): Slide {
    const newSlide = this.state.addSlide(title);
    this.eventBus.broadcastToWindows(PresentationEventBus.events.SLIDE_ADDED, newSlide);
    return newSlide;
  }

  updateSlide(slideId: string, updates: Partial<Slide>): Slide | null {
    const updatedSlide = this.state.updateSlide(slideId, updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(PresentationEventBus.events.SLIDE_UPDATED, updatedSlide);
    }
    return updatedSlide;
  }

  deleteSlide(slideId: string): string | null {
    const deletedSlideId = this.state.deleteSlide(slideId);
    if (deletedSlideId) {
      this.eventBus.broadcastToWindows(PresentationEventBus.events.SLIDE_DELETED, deletedSlideId);
    }
    return deletedSlideId;
  }

  addElement(slideId: string, element: ContentElement): Slide | null {
    const updatedSlide = this.state.addElement(slideId, element);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(PresentationEventBus.events.SLIDE_UPDATED, updatedSlide);
    }
    return updatedSlide;
  }

  updateElement(elementId: string, updates: Partial<ContentElement>): Slide | null {
    const updatedSlide = this.state.updateElement(elementId, updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(PresentationEventBus.events.SLIDE_UPDATED, updatedSlide);
    }
    return updatedSlide;
  }

  setSelectedSlideInViewer(slideId: string): void {
    this.eventBus.broadcastToWindows(PresentationEventBus.events.SET_SELECTED_SLIDE, slideId);
  }

  onEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(eventName, listener);
  }

  offEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(eventName, listener);
  }
} 