import type {
    BarChart,
    ContentElement,
    Shape,
    Slide,
    TextBox,
} from '../../common/domain/entities/types';
import { ElementValidator } from '../presentation/element-validator';
import type { PresentationService } from '../presentation/service';
import { textMeasurementService } from '../text-measurement/service';
import { LintingEventBus } from './event-bus';
import { LintingStateManager } from './state';
import type { LintingError, SlideLintingResult } from './types';

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

        for (const element of slide.elements) {
            const elementErrors = await this.lintElement(element, slide);
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
                {
                    slideId,
                    errors,
                },
            );
        }

        return result;
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
            {
                slideId,
            },
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
        slide: Slide,
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        if (element.type === 'textbox') {
            errors.push(...(await this.lintTextBox(element as TextBox, slide)));
        } else if (
            element.type === 'rectangle' ||
            element.type === 'circle' ||
            element.type === 'triangle'
        ) {
            errors.push(...(await this.lintShape(element as Shape, slide)));
        } else if (element.type === 'barchart') {
            errors.push(...this.lintBarChart(element as BarChart, slide));
        }

        return errors;
    }

    private async lintTextBox(
        textBox: TextBox,
        slide: Slide,
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        const currentTextboxSize =
            await textMeasurementService.getActualTextSizeAndPosition(
                textBox.id,
            );

        if (!currentTextboxSize.elementFound) {
            return errors;
        }

        errors.push(
            ...(await this.checkTextToTextOverlap(
                textBox,
                slide,
                currentTextboxSize,
            )),
        );
        errors.push(
            ...this.checkTextSizeVsContainer(
                textBox,
                slide,
                currentTextboxSize,
            ),
        );
        errors.push(
            ...this.checkTextOutsideSlide(textBox, slide, currentTextboxSize),
        );
        errors.push(
            ...(await this.checkShapeCoveringText(
                textBox,
                slide,
                currentTextboxSize,
            )),
        );

        return errors;
    }

    private async checkTextToTextOverlap(
        textBox: TextBox,
        slide: Slide,
        currentTextboxSize: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
        },
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];
        const overlappingTexts = [];
        const textElements = slide.elements.filter(
            (e) => e.type === 'textbox' && e.id !== textBox.id,
        );

        for (const textElement of textElements) {
            if (textBox.id > textElement.id) {
                continue;
            }

            const otherTextboxSize =
                await textMeasurementService.getActualTextSizeAndPosition(
                    textElement.id,
                );

            if (
                otherTextboxSize.elementFound &&
                this.checkActualTextOverlap(
                    currentTextboxSize,
                    otherTextboxSize,
                )
            ) {
                overlappingTexts.push(textElement);
            }
        }

        if (overlappingTexts.length > 0) {
            const overlappingIds = overlappingTexts.map((t) => t.id).join(', ');
            errors.push(
                this.createError(
                    `${textBox.id}-text-overlap`,
                    textBox.id,
                    slide.id,
                    'text_overlap',
                    `Text overlaps with other text elements: ${overlappingIds}`,
                    'warning',
                ),
            );
        }

        return errors;
    }

    private checkTextSizeVsContainer(
        textBox: TextBox,
        slide: Slide,
        currentTextboxSize: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
        },
    ): LintingError[] {
        const errors: LintingError[] = [];

        if (!currentTextboxSize.width || !currentTextboxSize.height) {
            return errors;
        }

        const containerWidth = textBox.size.width;
        const containerHeight = textBox.size.height;

        if (currentTextboxSize.width > containerWidth) {
            errors.push(
                this.createError(
                    `${textBox.id}-text-width-overflow`,
                    textBox.id,
                    slide.id,
                    'text_overflow',
                    `Text width (${currentTextboxSize.width}px) exceeds container width (${containerWidth}px)`,
                    'warning',
                    'Consider increasing container width or reducing font size',
                ),
            );
        }

        if (currentTextboxSize.height > containerHeight) {
            errors.push(
                this.createError(
                    `${textBox.id}-text-height-overflow`,
                    textBox.id,
                    slide.id,
                    'text_overflow',
                    `Text height (${currentTextboxSize.height}px) exceeds container height (${containerHeight}px)`,
                    'warning',
                    'Consider increasing container height or reducing font size',
                ),
            );
        }

        return errors;
    }

    private checkTextOutsideSlide(
        textBox: TextBox,
        slide: Slide,
        currentTextboxSize: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
        },
    ): LintingError[] {
        const errors: LintingError[] = [];

        if (
            currentTextboxSize.x === undefined ||
            currentTextboxSize.y === undefined ||
            !currentTextboxSize.width ||
            !currentTextboxSize.height
        ) {
            return errors;
        }

        const SLIDE_WIDTH = 1280;
        const SLIDE_HEIGHT = 720;

        const textRight = currentTextboxSize.x + currentTextboxSize.width;
        const textBottom = currentTextboxSize.y + currentTextboxSize.height;

        if (currentTextboxSize.x < 0) {
            errors.push(
                this.createError(
                    `${textBox.id}-text-left-outside`,
                    textBox.id,
                    slide.id,
                    'outside_slide',
                    `Text extends beyond left edge of slide (x: ${currentTextboxSize.x}px)`,
                    'warning',
                    'Adjust text position to keep it within slide boundaries',
                ),
            );
        }

        if (currentTextboxSize.y < 0) {
            errors.push(
                this.createError(
                    `${textBox.id}-text-top-outside`,
                    textBox.id,
                    slide.id,
                    'outside_slide',
                    `Text extends beyond top edge of slide (y: ${currentTextboxSize.y}px)`,
                    'warning',
                    'Adjust text position to keep it within slide boundaries',
                ),
            );
        }

        if (textRight > SLIDE_WIDTH) {
            errors.push(
                this.createError(
                    `${textBox.id}-text-right-outside`,
                    textBox.id,
                    slide.id,
                    'outside_slide',
                    `Text extends beyond right edge of slide (right edge: ${textRight}px, slide width: ${SLIDE_WIDTH}px)`,
                    'warning',
                    'Adjust text position or reduce text width to keep it within slide boundaries',
                ),
            );
        }

        if (textBottom > SLIDE_HEIGHT) {
            errors.push(
                this.createError(
                    `${textBox.id}-text-bottom-outside`,
                    textBox.id,
                    slide.id,
                    'outside_slide',
                    `Text extends beyond bottom edge of slide (bottom edge: ${textBottom}px, slide height: ${SLIDE_HEIGHT}px)`,
                    'warning',
                    'Adjust text position or reduce text height to keep it within slide boundaries',
                ),
            );
        }

        return errors;
    }

    private async checkShapeCoveringText(
        textBox: TextBox,
        slide: Slide,
        currentTextboxSize: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
        },
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        if (
            currentTextboxSize.x === undefined ||
            currentTextboxSize.y === undefined ||
            !currentTextboxSize.width ||
            !currentTextboxSize.height
        ) {
            return errors;
        }

        const shapes = slide.elements.filter(
            (e) =>
                e.type === 'rectangle' ||
                e.type === 'circle' ||
                e.type === 'triangle',
        ) as Shape[];

        for (const shape of shapes) {
            const zIndexComparison =
                await textMeasurementService.isElementInFrontOf(
                    shape.id,
                    textBox.id,
                );

            console.log(zIndexComparison);

            if (
                zIndexComparison.elementAFound &&
                zIndexComparison.elementBFound &&
                zIndexComparison.isAInFrontOfB
            ) {
                const textBounds = {
                    x: currentTextboxSize.x,
                    y: currentTextboxSize.y,
                    width: currentTextboxSize.width,
                    height: currentTextboxSize.height,
                };

                const shapeBounds = {
                    x: shape.position.x,
                    y: shape.position.y,
                    width: shape.size.width,
                    height: shape.size.height,
                };

                if (this.checkBoundsOverlap(textBounds, shapeBounds)) {
                    errors.push(
                        this.createError(
                            `${textBox.id}-covered-by-shape`,
                            textBox.id,
                            slide.id,
                            'zindex_issue',
                            `Text is covered by shape "${shape.id}" (shape z-index: ${zIndexComparison.zIndexA}, text z-index: ${zIndexComparison.zIndexB})`,
                            'warning',
                            'Increase text z-index or decrease shape z-index to make text visible',
                        ),
                    );
                }
            }
        }

        return errors;
    }

    private checkBoundsOverlap(
        boundsA: { x: number; y: number; width: number; height: number },
        boundsB: { x: number; y: number; width: number; height: number },
    ): boolean {
        return !(
            boundsA.x >= boundsB.x + boundsB.width ||
            boundsA.x + boundsA.width <= boundsB.x ||
            boundsA.y >= boundsB.y + boundsB.height ||
            boundsA.y + boundsA.height <= boundsB.y
        );
    }

    private checkActualTextOverlap(
        textA: { x?: number; y?: number; width?: number; height?: number },
        textB: { x?: number; y?: number; width?: number; height?: number },
    ): boolean {
        if (
            !textA.x ||
            !textA.y ||
            !textA.width ||
            !textA.height ||
            !textB.x ||
            !textB.y ||
            !textB.width ||
            !textB.height
        ) {
            return false;
        }

        return !(
            textA.x >= textB.x + textB.width ||
            textA.x + textA.width <= textB.x ||
            textA.y >= textB.y + textB.height ||
            textA.y + textA.height <= textB.y
        );
    }

    private async lintShape(
        shape: Shape,
        slide: Slide,
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        const overlappingShapes = slide.elements.filter(
            (e) =>
                (e.type === 'rectangle' ||
                    e.type === 'circle' ||
                    e.type === 'triangle') &&
                e.id !== shape.id &&
                this.checkElementsOverlap(shape, e),
        );

        if (overlappingShapes.length > 0) {
            errors.push(
                this.createError(
                    `${shape.id}-shape-overlap`,
                    shape.id,
                    slide.id,
                    'shape_overlap',
                    `Shape overlaps with other shapes`,
                    'warning',
                ),
            );
        }

        return errors;
    }

    private checkElementsOverlap(
        a: ContentElement,
        b: ContentElement,
    ): boolean {
        const aPos = a.position;
        const bPos = b.position;
        const aSize = a.size;
        const bSize = b.size;

        return !(
            aPos.x >= bPos.x + bSize.width ||
            aPos.x + aSize.width <= bPos.x ||
            aPos.y >= bPos.y + bSize.height ||
            aPos.y + aSize.height <= bPos.y
        );
    }

    private lintBarChart(barChart: BarChart, _slide: Slide): LintingError[] {
        const errors: LintingError[] = [];

        if (barChart.data) {
            errors.push(...this.validateBarChartData(barChart.data));
        }

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
