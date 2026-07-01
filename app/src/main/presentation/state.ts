import {
    ContentElement,
    Presentation,
    Slide,
} from '../../common/domain/entities/types';

export class PresentationState {
    private presentation: Presentation;
    private history: Presentation[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 150;
    private isApplyingHistory: boolean = false;

    constructor() {
        const titleSlide = this.createSlide();
        this.presentation = {
            id: 'singleton',
            title: 'Untitled Presentation',
            slides: [titleSlide],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.saveToHistory();
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

        this.saveToHistory();
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

        // Reset history when loading a new presentation
        this.history = [];
        this.historyIndex = -1;
        this.saveToHistory();
        return this.presentation;
    }

    updatePresentationMeta(title: string): Presentation {
        this.presentation = {
            ...this.presentation,
            title,
            updatedAt: new Date(),
        };

        this.saveToHistory();
        return this.presentation;
    }

    addSlide(): Slide {
        const newSlide = this.createSlide();

        this.presentation = {
            ...this.presentation,
            slides: [...this.presentation.slides, newSlide],
            updatedAt: new Date(),
        };

        this.saveToHistory();
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
            elements: originalSlide.elements.map((element) => ({
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

        this.saveToHistory();
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

        this.saveToHistory();
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

        this.saveToHistory();
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

        this.saveToHistory();
        return this.presentation;
    }

    addElement(slideId: string, element: ContentElement): Slide | null {
        const slideIndex = this.findSlideIndex(slideId);
        if (slideIndex === -1) {
            return null;
        }

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

        this.saveToHistory();

        return updatedSlide;
    }

    updateElement(
        elementId: string,
        updates: Partial<ContentElement>,
        skipHistory = false,
    ): Slide | null {
        for (let i = 0; i < this.presentation.slides.length; i++) {
            const slide = this.presentation.slides[i];
            const elementIndex = slide.elements.findIndex(
                (e) => e.id === elementId,
            );

            if (elementIndex !== -1) {
                const element = slide.elements[elementIndex];
                const updatedElement = {
                    ...element,
                    ...updates,
                } as ContentElement;
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

                if (!skipHistory) {
                    this.saveToHistory();
                }

                return updatedSlide;
            }
        }

        return null;
    }

    deleteElement(elementId: string): Slide | null {
        for (let i = 0; i < this.presentation.slides.length; i++) {
            const slide = this.presentation.slides[i];
            const elementIndex = slide.elements.findIndex(
                (e) => e.id === elementId,
            );

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

                this.saveToHistory();
                return updatedSlide;
            }
        }

        return null;
    }

    private findSlideIndex(slideId: string): number {
        return this.presentation.slides.findIndex(
            (slide) => slide.id === slideId,
        );
    }

    private findElement(elementId: string): ContentElement | null {
        for (const slide of this.presentation.slides) {
            const element = slide.elements.find((e) => e.id === elementId);
            if (element) return element;
        }
        return null;
    }

    private saveToHistory(): void {
        if (this.isApplyingHistory) {
            return;
        }

        const currentState = this.deepClonePresentation(this.presentation);

        // Remove any forward history when making new changes
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state to history
        this.history.push(currentState);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    private deepClonePresentation(presentation: Presentation): Presentation {
        // structuredClone produces a true deep copy, so nested element objects
        // (position/size/data/style) are no longer shared across history
        // snapshots — a shallow spread previously left them aliased, which
        // would corrupt undo history the moment any element was mutated in place.
        const cloned = structuredClone(presentation);
        cloned.createdAt = new Date(presentation.createdAt);
        cloned.updatedAt = new Date(presentation.updatedAt);
        for (const slide of cloned.slides) {
            slide.transition = slide.transition || 'none';
        }
        return cloned;
    }

    public canUndo(): boolean {
        const result = this.historyIndex > 0;
        return result;
    }

    public canRedo(): boolean {
        const result = this.historyIndex < this.history.length - 1;
        return result;
    }

    public undo(): Presentation | null {
        if (!this.canUndo()) return null;

        this.isApplyingHistory = true;
        this.historyIndex--;
        this.presentation = this.deepClonePresentation(
            this.history[this.historyIndex],
        );
        this.isApplyingHistory = false;

        return this.presentation;
    }

    public redo(): Presentation | null {
        if (!this.canRedo()) return null;

        this.isApplyingHistory = true;
        this.historyIndex++;
        this.presentation = this.deepClonePresentation(
            this.history[this.historyIndex],
        );
        this.isApplyingHistory = false;

        return this.presentation;
    }

    public clearHistory(): void {
        this.history = [];
        this.historyIndex = -1;
        this.saveToHistory();
    }

    public getHistoryStats(): {
        size: number;
        currentIndex: number;
        maxSize: number;
    } {
        return {
            size: this.history.length,
            currentIndex: this.historyIndex,
            maxSize: this.maxHistorySize,
        };
    }

    public setMaxHistorySize(newMax: number): void {
        if (newMax < 1) newMax = 1;
        this.maxHistorySize = newMax;

        // Trim history if it exceeds the new limit
        if (this.history.length > this.maxHistorySize) {
            const itemsToRemove = this.history.length - this.maxHistorySize;
            this.history.splice(0, itemsToRemove);
            this.historyIndex = Math.max(0, this.historyIndex - itemsToRemove);
        }
    }
}
