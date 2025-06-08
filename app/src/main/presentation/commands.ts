import {
  Presentation,
  Slide,
  ContentElement,
} from '../../common/domain/entities/types';

export interface Command {
  execute(): void;
  undo(): void;
  getDescription(): string;
}

export class AddSlideCommand implements Command {
  private slideId: string | null = null;

  constructor(
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    const newSlide = this.state.addSlide();
    this.slideId = newSlide.id;
    this.eventBus.broadcastToWindows('presentation:slide-added', newSlide);
  }

  undo(): void {
    if (this.slideId) {
      const deletedSlideId = this.state.deleteSlide(this.slideId);
      if (deletedSlideId) {
        this.eventBus.broadcastToWindows('presentation:slide-deleted', deletedSlideId);
      }
    }
  }

  getDescription(): string {
    return 'Add slide';
  }
}

export class DeleteSlideCommand implements Command {
  private deletedSlide: Slide | null = null;
  private slideIndex: number = -1;

  constructor(
    private slideId: string,
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    // Store the slide and its position before deleting
    const presentation = this.state.getPresentation();
    this.slideIndex = presentation.slides.findIndex((s: Slide) => s.id === this.slideId);
    if (this.slideIndex !== -1) {
      this.deletedSlide = { ...presentation.slides[this.slideIndex] };
    }

    const deletedSlideId = this.state.deleteSlide(this.slideId);
    if (deletedSlideId) {
      this.eventBus.broadcastToWindows('presentation:slide-deleted', deletedSlideId);
    }
  }

  undo(): void {
    if (this.deletedSlide && this.slideIndex !== -1) {
      this.state.insertSlideAtIndex(this.deletedSlide, this.slideIndex);
      this.eventBus.broadcastToWindows('presentation:slide-added', this.deletedSlide);
    }
  }

  getDescription(): string {
    return 'Delete slide';
  }
}

export class UpdateSlideCommand implements Command {
  private previousSlide: Slide | null = null;

  constructor(
    private slideId: string,
    private updates: Partial<Slide>,
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    // Store the current state before updating
    const presentation = this.state.getPresentation();
    const slideIndex = presentation.slides.findIndex((s: Slide) => s.id === this.slideId);
    if (slideIndex !== -1) {
      this.previousSlide = { ...presentation.slides[slideIndex] };
    }

    const updatedSlide = this.state.updateSlide(this.slideId, this.updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    if (this.previousSlide) {
      const updatedSlide = this.state.updateSlide(this.slideId, this.previousSlide);
      if (updatedSlide) {
        this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
      }
    }
  }

  getDescription(): string {
    return 'Update slide';
  }
}

export class AddElementCommand implements Command {
  private elementId: string;

  constructor(
    private slideId: string,
    private element: ContentElement,
    private state: any,
    private eventBus: any,
  ) {
    this.elementId = element.id;
  }

  execute(): void {
    const updatedSlide = this.state.addElement(this.slideId, this.element);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    const updatedSlide = this.state.deleteElement(this.elementId);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  getDescription(): string {
    return `Add ${this.element.type}`;
  }
}

export class DeleteElementCommand implements Command {
  private deletedElement: ContentElement | null = null;
  private slideId: string | null = null;

  constructor(
    private elementId: string,
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    // Find and store the element before deleting
    const presentation = this.state.getPresentation();
    for (const slide of presentation.slides) {
      const element = slide.elements.find((e: ContentElement) => e.id === this.elementId);
      if (element) {
        this.deletedElement = { ...element };
        this.slideId = slide.id;
        break;
      }
    }

    const updatedSlide = this.state.deleteElement(this.elementId);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    if (this.deletedElement && this.slideId) {
      const updatedSlide = this.state.addElement(this.slideId, this.deletedElement);
      if (updatedSlide) {
        this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
      }
    }
  }

  getDescription(): string {
    return `Delete ${this.deletedElement?.type || 'element'}`;
  }
}

export class UpdateElementCommand implements Command {
  private previousElement: ContentElement | null = null;

  constructor(
    private elementId: string,
    private updates: Partial<ContentElement>,
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    // Store the current element state before updating
    const presentation = this.state.getPresentation();
    for (const slide of presentation.slides) {
      const element = slide.elements.find((e: ContentElement) => e.id === this.elementId);
      if (element) {
        this.previousElement = { ...element };
        break;
      }
    }

    const updatedSlide = this.state.updateElement(this.elementId, this.updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    if (this.previousElement) {
      const updatedSlide = this.state.updateElement(this.elementId, this.previousElement);
      if (updatedSlide) {
        this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
      }
    }
  }

  getDescription(): string {
    return `Update ${this.previousElement?.type || 'element'}`;
  }
}

export class MoveElementCommand implements Command {
  private previousPosition: { x: number; y: number } | null = null;

  constructor(
    private elementId: string,
    private newPosition: { x: number; y: number },
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    // Store the current position before updating
    const presentation = this.state.getPresentation();
    for (const slide of presentation.slides) {
      const element = slide.elements.find((e: ContentElement) => e.id === this.elementId);
      if (element) {
        this.previousPosition = { ...element.position };
        break;
      }
    }

    const updatedSlide = this.state.updateElement(this.elementId, { position: this.newPosition });
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    if (this.previousPosition) {
      const updatedSlide = this.state.updateElement(this.elementId, { position: this.previousPosition });
      if (updatedSlide) {
        this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
      }
    }
  }

  getDescription(): string {
    return 'Move element';
  }
}

export class ResizeElementCommand implements Command {
  private previousSize: { width: number; height: number } | null = null;
  private previousPosition: { x: number; y: number } | null = null;

  constructor(
    private elementId: string,
    private newSize: { width: number; height: number },
    private newPosition?: { x: number; y: number },
    private state?: any,
    private eventBus?: any,
  ) {}

  execute(): void {
    // Store the current values before updating
    const presentation = this.state.getPresentation();
    for (const slide of presentation.slides) {
      const element = slide.elements.find((e: ContentElement) => e.id === this.elementId);
      if (element) {
        this.previousSize = { ...element.size };
        this.previousPosition = { ...element.position };
        break;
      }
    }

    const updates: any = { size: this.newSize };
    if (this.newPosition) {
      updates.position = this.newPosition;
    }

    const updatedSlide = this.state.updateElement(this.elementId, updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    if (!this.previousSize || !this.previousPosition) {
      throw new Error('Cannot undo: no previous values stored');
    }

    const updates: any = { size: this.previousSize };
    if (this.newPosition) {
      updates.position = this.previousPosition;
    }
    
    const updatedSlide = this.state.updateElement(this.elementId, updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  getDescription(): string {
    return 'Resize element';
  }
}

export class ReorderSlidesCommand implements Command {
  constructor(
    private fromIndex: number,
    private toIndex: number,
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    const updatedPresentation = this.state.reorderSlides(this.fromIndex, this.toIndex);
    this.eventBus.broadcastToWindows('presentation:slides-reordered', updatedPresentation);
  }

  undo(): void {
    // Reverse the operation
    const updatedPresentation = this.state.reorderSlides(this.toIndex, this.fromIndex);
    this.eventBus.broadcastToWindows('presentation:slides-reordered', updatedPresentation);
  }

  getDescription(): string {
    return 'Reorder slides';
  }
}

export class UpdateTextContentCommand implements Command {
  private previousContent: string | null = null;

  constructor(
    private elementId: string,
    private newContent: string,
    private state: any,
    private eventBus: any,
  ) {}

  execute(): void {
    // Store the current content before updating
    const presentation = this.state.getPresentation();
    for (const slide of presentation.slides) {
      const element = slide.elements.find((e: ContentElement) => e.id === this.elementId);
      if (element && element.type === 'textbox') {
        this.previousContent = (element as any).content;
        break;
      }
    }

    const updatedSlide = this.state.updateElement(this.elementId, { content: this.newContent });
    if (updatedSlide) {
      this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
    }
  }

  undo(): void {
    if (this.previousContent !== null) {
      const updatedSlide = this.state.updateElement(this.elementId, { content: this.previousContent });
      if (updatedSlide) {
        this.eventBus.broadcastToWindows('presentation:slide-updated', updatedSlide);
      }
    }
  }

  getDescription(): string {
    return 'Update text content';
  }
}

export class UpdatePresentationMetaCommand implements Command {
  private previousTitle: string;

  constructor(
    private title: string,
    private state: any,
    private eventBus: any,
  ) {
    this.previousTitle = state.getPresentation().title;
  }

  execute(): void {
    const data = this.state.updatePresentationMeta(this.title);
    this.eventBus.broadcastToWindows('presentation:meta-updated', data);
  }

  undo(): void {
    const data = this.state.updatePresentationMeta(this.previousTitle);
    this.eventBus.broadcastToWindows('presentation:meta-updated', data);
  }

  getDescription(): string {
    return 'Update presentation title';
  }
}