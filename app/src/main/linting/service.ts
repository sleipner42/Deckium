import {
    BarChart,
    ContentElement,
    Slide,
    TextBox,
} from '../../common/domain/entities/types';
import { ElementValidator } from '../presentation/element-validator';
import { PresentationService } from '../presentation/service';
import { textMeasurementService } from '../text-measurement/service';
import { LintingEventBus } from './event-bus';
import { LintingStateManager } from './state';
import { LintingError, SlideLintingResult } from './types';

export class LintingService {
    private state: LintingStateManager;
    private eventBus: LintingEventBus;
    private presentationService: PresentationService | null = null;

    constructor() {
        this.state = new LintingStateManager();
        this.eventBus = new LintingEventBus();
    }

    setPresentationService(presentationService: PresentationService): void {
        this.presentationService = presentationService;
    }

    async lintSlide(slide: Slide): Promise<SlideLintingResult> {
        const errors: LintingError[] = [];
        const slideId = slide.id;

        this.state.clearSlideErrors(slideId);

        errors.push(...this.lintContentQuality(slide));

        for (const element of slide.elements) {
            const elementErrors = await this.lintElement(element, slideId);
            errors.push(...elementErrors);
        }

        this.state.setSlideErrors(slideId, errors);

        const result: SlideLintingResult = {
            slideId,
            errors,
            hasErrors: errors.length > 0,
            lintedAt: new Date(),
        };

        this.eventBus.broadcastToWindows(
            LintingEventBus.events.SLIDE_LINTED,
            result,
        );

        if (errors.length > 0) {
            this.eventBus.broadcastToWindows(
                LintingEventBus.events.ERRORS_UPDATED,
                { slideId, errors },
            );
        }

        return result;
    }

    validateParameters(
        params: Record<string, any>,
        requiredParams: string[],
    ): LintingError[] {
        const errors: LintingError[] = [];

        for (const param of requiredParams) {
            if (!params[param]) {
                errors.push(
                    this.createError(
                        `missing-${param}`,
                        'unknown',
                        'unknown',
                        'parameter_validation',
                        `${param} is required`,
                        'error',
                    ),
                );
            }
        }

        return errors;
    }

    async validateElementExists(
        elementId: string,
    ): Promise<LintingError | null> {
        if (!this.presentationService) return null;

        const presentation = this.presentationService.getPresentation();
        for (const slide of presentation.slides) {
            const element = slide.elements.find((e) => e.id === elementId);
            if (element) return null;
        }

        return this.createError(
            `element-not-found-${elementId}`,
            elementId,
            'unknown',
            'element_not_found',
            `Element with ID ${elementId} not found`,
            'error',
        );
    }

    validateSlideExists(slideId: string): LintingError | null {
        if (!this.presentationService) return null;

        const presentation = this.presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return this.createError(
                `slide-not-found-${slideId}`,
                'unknown',
                slideId,
                'slide_not_found',
                `Slide with ID ${slideId} not found`,
                'error',
            );
        }

        return null;
    }

    async checkDOMOverlap(elementId: string): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        try {
            const overlapCheck = await ElementValidator.checkElementOverlap(
                elementId,
                0,
            );

            if (overlapCheck.isOutsideSlide) {
                errors.push(
                    this.createError(
                        `${elementId}-outside-slide`,
                        elementId,
                        'unknown',
                        'outside_slide',
                        'Element is positioned outside the slide boundaries (1280x720)',
                        'warning',
                        overlapCheck.suggestedPosition
                            ? `Consider repositioning to (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y})`
                            : undefined,
                    ),
                );
            }

            if (overlapCheck.hasOverlap) {
                errors.push(
                    this.createError(
                        `${elementId}-overlap`,
                        elementId,
                        'unknown',
                        'dom_overlap',
                        `Element overlaps with other elements: ${overlapCheck.overlappingElements.join(', ')}`,
                        'info',
                        overlapCheck.suggestedPosition
                            ? `Closest non-overlapping position is (${overlapCheck.suggestedPosition.x}, ${overlapCheck.suggestedPosition.y})`
                            : 'Adjust element positions or use z-index to control layering',
                    ),
                );
            }
        } catch (error) {
            console.warn('DOM overlap detection failed:', error);
        }

        return errors;
    }

    async checkTextOverflow(elementId: string): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        try {
            const actualDimensions =
                await textMeasurementService.getActualElementDimensions(
                    elementId,
                );

            if (
                actualDimensions?.elementFound &&
                actualDimensions.textOverflow
            ) {
                const { textOverflow } = actualDimensions;

                if (textOverflow.overflowsContainer) {
                    errors.push(
                        this.createError(
                            `${elementId}-text-overflow`,
                            elementId,
                            'unknown',
                            'text_overflow',
                            `Text extends outside its container. Text size: ${textOverflow.actualTextWidth}x${textOverflow.actualTextHeight}px, Container: ${textOverflow.containerWidth}x${textOverflow.containerHeight}px`,
                            'warning',
                            'Consider increasing container size or reducing font size',
                        ),
                    );
                }

                if (textOverflow.overflowsSlide) {
                    errors.push(
                        this.createError(
                            `${elementId}-slide-overflow`,
                            elementId,
                            'unknown',
                            'outside_slide',
                            'Text extends outside slide boundaries (1280x720)',
                            'warning',
                        ),
                    );
                }
            }

            const textDimensions =
                await textMeasurementService.measureQuillText(elementId);
            if (textDimensions.lineBreakInfo?.includes('TEXT OVERFLOW')) {
                errors.push(
                    this.createError(
                        `${elementId}-line-overflow`,
                        elementId,
                        'unknown',
                        'text_overflow',
                        'Text content causes line breaks and potential overflow',
                        'info',
                        'Use updateTextElement tool to increase width if single-line text is desired',
                    ),
                );
            }
        } catch (error) {
            console.warn('Text overflow detection failed:', error);
        }

        return errors;
    }

    validateBarChartData(data: { x: any[]; y: any[] }): LintingError[] {
        const errors: LintingError[] = [];

        if (!data.x || !data.y) {
            errors.push(
                this.createError(
                    'barchart-missing-data',
                    'unknown',
                    'unknown',
                    'data_validation',
                    'BarChart is missing required data (x or y values)',
                    'error',
                    'Provide both x and y data arrays for the chart',
                ),
            );
        } else if (data.x.length !== data.y.length) {
            errors.push(
                this.createError(
                    'barchart-data-mismatch',
                    'unknown',
                    'unknown',
                    'data_validation',
                    'BarChart x and y data arrays have different lengths',
                    'error',
                    'Ensure x and y data arrays have the same number of elements',
                ),
            );
        }

        return errors;
    }

    getLintingErrors(slideId?: string): LintingError[] {
        if (slideId) {
            return this.state.getSlideErrors(slideId);
        }
        return this.state.getAllErrors();
    }

    clearErrors(slideId?: string): void {
        if (slideId) {
            this.state.clearSlideErrors(slideId);
        } else {
            this.state.clearAllErrors();
        }

        this.eventBus.broadcastToWindows(
            LintingEventBus.events.ERRORS_CLEARED,
            { slideId },
        );
    }

    hasErrors(slideId?: string): boolean {
        if (slideId) {
            return this.state.hasSlideErrors(slideId);
        }
        return this.state.hasErrors();
    }

    getErrorsBySeverity(severity: LintingError['severity']): LintingError[] {
        return this.state.getErrorsBySeverity(severity);
    }

    onEvent(eventName: string, listener: (...args: any[]) => void): void {
        this.eventBus.on(eventName, listener);
    }

    offEvent(eventName: string, listener: (...args: any[]) => void): void {
        this.eventBus.off(eventName, listener);
    }

    private async lintElement(
        element: ContentElement,
        slideId: string,
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        if (element.type === 'textbox') {
            errors.push(
                ...(await this.lintTextBox(element as TextBox, slideId)),
            );
        } else if (element.type === 'barchart') {
            errors.push(...this.lintBarChart(element as BarChart, slideId));
        }

        return errors;
    }

    private async lintTextBox(
        textBox: TextBox,
        _slideId: string,
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        errors.push(...(await this.checkDOMOverlap(textBox.id)));
        errors.push(...(await this.checkTextOverflow(textBox.id)));

        return errors;
    }

    private lintBarChart(barChart: BarChart, _slideId: string): LintingError[] {
        const errors: LintingError[] = [];

        if (barChart.data) {
            errors.push(...this.validateBarChartData(barChart.data));
        }

        return errors;
    }

    private lintContentQuality(slide: Slide): LintingError[] {
        const errors: LintingError[] = [];
        const elementCount = slide.elements.length;

        if (elementCount === 0) {
            errors.push(
                this.createError(
                    `${slide.id}-empty-slide`,
                    'unknown',
                    slide.id,
                    'content_quality',
                    'The slide is completely empty - it needs content to be effective',
                    'warning',
                    'Add a title and main content to give the slide purpose',
                ),
            );
        } else if (elementCount > 8) {
            errors.push(
                this.createError(
                    `${slide.id}-overcrowded`,
                    'unknown',
                    slide.id,
                    'content_quality',
                    'The slide may be overcrowded with too many elements - consider simplifying',
                    'warning',
                    'Consider consolidating content or splitting into multiple slides',
                ),
            );
        }

        const textElements = slide.elements.filter(
            (e) => e.type === 'textbox',
        ) as TextBox[];
        textElements.forEach((element, index) => {
            if (element.content && element.content.length > 200) {
                errors.push(
                    this.createError(
                        `${element.id}-long-text`,
                        element.id,
                        slide.id,
                        'content_quality',
                        `Text element ${index + 1} is quite long - consider breaking it into smaller chunks`,
                        'info',
                        'Break long text into bullet points or shorter paragraphs',
                    ),
                );
            }
        });

        return errors;
    }

    private createError(
        id: string,
        elementId: string,
        slideId: string,
        type: LintingError['type'],
        message: string,
        severity: LintingError['severity'],
        suggestedFix?: string,
    ): LintingError {
        return {
            id,
            elementId,
            slideId,
            type,
            message,
            severity,
            suggestedFix,
            createdAt: new Date(),
        };
    }
}
