// @ts-nocheck

import {
    ContentElement,
    Presentation,
    Slide,
} from '../../common/domain/entities/types';

/**
 * Mock PresentationService for testing tools
 */
export class MockPresentationService {
    private mockPresentation: Presentation;

    private selectedSlideId: string | null = null;

    constructor(initialPresentation?: Partial<Presentation>) {
        this.mockPresentation = {
            id: 'test-presentation',
            title: 'Test Presentation',
            slides: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            ...initialPresentation,
        };
    }

    // Create a mock slide for testing
    createMockSlide(overrides?: Partial<Slide>): Slide {
        return {
            id: `slide-${Date.now()}-${Math.random()}`,
            elements: [],
            background: '#FFFFFF',
            ...overrides,
        };
    }

    // Create a mock text element for testing
    createMockTextElement(overrides?: Partial<ContentElement>): ContentElement {
        return {
            id: `element-${Date.now()}-${Math.random()}`,
            type: 'textbox',
            content: 'Test content',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 50 },
            color: '#000000',
            zIndex: 1,
            ...overrides,
        } as ContentElement;
    }

    // Create a mock image element for testing
    createMockImageElement(
        overrides?: Partial<ContentElement>,
    ): ContentElement {
        return {
            id: `element-${Date.now()}-${Math.random()}`,
            type: 'image',
            content: 'https://example.com/image.jpg',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            zIndex: 1,
            ...overrides,
        } as ContentElement;
    }

    // Mock PresentationService methods
    getPresentation(): Presentation {
        return this.mockPresentation;
    }

    setPresentation(presentation: Presentation): void {
        this.mockPresentation = presentation;
    }

    addSlide(slide?: Slide): Slide {
        const newSlide = slide || this.createMockSlide();
        this.mockPresentation.slides.push(newSlide);
        this.mockPresentation.updatedAt = new Date();
        return newSlide;
    }

    updateSlide(slideId: string, updates: Partial<Slide>): Slide | null {
        const slideIndex = this.mockPresentation.slides.findIndex(
            (s) => s.id === slideId,
        );
        if (slideIndex === -1) return null;

        this.mockPresentation.slides[slideIndex] = {
            ...this.mockPresentation.slides[slideIndex],
            ...updates,
        };
        this.mockPresentation.updatedAt = new Date();
        return this.mockPresentation.slides[slideIndex];
    }

    reorderSlides(fromIndex: number, toIndex: number): Presentation {
        const slides = this.mockPresentation.slides;
        const [moved] = slides.splice(fromIndex, 1);
        slides.splice(toIndex, 0, moved);
        this.mockPresentation.updatedAt = new Date();
        return this.mockPresentation;
    }

    deleteSlide(slideId: string): string | null {
        const slideIndex = this.mockPresentation.slides.findIndex(
            (s) => s.id === slideId,
        );
        if (slideIndex === -1) return null;

        this.mockPresentation.slides.splice(slideIndex, 1);
        this.mockPresentation.updatedAt = new Date();
        return slideId;
    }

    addElement(slideId: string, element: ContentElement): Slide | null {
        const slide = this.mockPresentation.slides.find(
            (s) => s.id === slideId,
        );
        if (!slide) return null;

        slide.elements.push(element);
        this.mockPresentation.updatedAt = new Date();
        return slide;
    }

    updateElement(
        elementId: string,
        updates: Partial<ContentElement>,
    ): Slide | null {
        for (const slide of this.mockPresentation.slides) {
            const elementIndex = slide.elements.findIndex(
                (e) => e.id === elementId,
            );
            if (elementIndex !== -1) {
                slide.elements[elementIndex] = {
                    ...slide.elements[elementIndex],
                    ...updates,
                } as ContentElement;
                this.mockPresentation.updatedAt = new Date();
                return slide;
            }
        }
        return null;
    }

    deleteElement(elementId: string): Slide | null {
        for (const slide of this.mockPresentation.slides) {
            const elementIndex = slide.elements.findIndex(
                (e) => e.id === elementId,
            );
            if (elementIndex !== -1) {
                slide.elements.splice(elementIndex, 1);
                this.mockPresentation.updatedAt = new Date();
                return slide;
            }
        }
        return null;
    }

    setSelectedSlideId(slideId: string): void {
        this.selectedSlideId = slideId;
    }

    getSelectedSlideId(): string | null {
        return this.selectedSlideId;
    }

    // Helper methods for testing
    getSlideById(slideId: string): Slide | undefined {
        return this.mockPresentation.slides.find((s) => s.id === slideId);
    }

    getElementById(
        elementId: string,
    ): { element: ContentElement; slide: Slide } | null {
        for (const slide of this.mockPresentation.slides) {
            const element = slide.elements.find((e) => e.id === elementId);
            if (element) {
                return { element, slide };
            }
        }
        return null;
    }

    reset(): void {
        this.mockPresentation = {
            id: 'test-presentation',
            title: 'Test Presentation',
            slides: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.selectedSlideId = null;
    }
}
