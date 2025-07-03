import type {
    BarChart,
    ContentElement,
    Image,
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
                        `ELEMENT_OUTSIDE_SLIDE: Element "${elementId}" is positioned outside slide boundaries (1280x720). Current position causes element to extend beyond slide edges.`,
                        'warning',
                        overlapCheck.suggestedPosition
                            ? `ACTION_REQUIRED: Use updateTextElement, updateShapeTool, or updateImageElement tool to reposition element to x:${overlapCheck.suggestedPosition.x}, y:${overlapCheck.suggestedPosition.y}`
                            : 'ACTION_REQUIRED: Use appropriate update tool to move element within slide boundaries (0-1280 width, 0-720 height)',
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
                        `ELEMENT_OVERLAP_DETECTED: Element "${elementId}" overlaps with elements: ${overlapCheck.overlappingElements.join(', ')}. Visual collision detected.`,
                        'info',
                        overlapCheck.suggestedPosition
                            ? `ACTION_SUGGESTED: Use appropriate update tool to move element to non-overlapping position x:${overlapCheck.suggestedPosition.x}, y:${overlapCheck.suggestedPosition.y}, or use changeElementZIndex tool to control layering`
                            : 'ACTION_SUGGESTED: Use appropriate update tool to adjust element positions or changeElementZIndex tool to manage visual layering',
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
                            `TEXT_CONTAINER_OVERFLOW: Text in element "${elementId}" exceeds container boundaries. Text size: ${textOverflow.actualTextWidth}x${textOverflow.actualTextHeight}px, Container: ${textOverflow.containerWidth}x${textOverflow.containerHeight}px`,
                            'warning',
                            'ACTION_REQUIRED: Use updateTextElement tool to increase container width/height or reduce font size to fit text within container',
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
                            `TEXT_SLIDE_OVERFLOW: Text in element "${elementId}" extends beyond slide boundaries (1280x720). Text content exceeds slide viewport.`,
                            'warning',
                            'ACTION_REQUIRED: Use updateTextElement tool to reposition text within slide boundaries or reduce text size',
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
                        `TEXT_LINE_OVERFLOW: Text content in element "${elementId}" causes unexpected line breaks and potential overflow. Single-line text intended but wrapping occurred.`,
                        'info',
                        'ACTION_SUGGESTED: Use updateTextElement tool to increase width if single-line text layout is desired',
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
                    'BARCHART_MISSING_DATA: BarChart element is missing required data arrays. Both x and y data arrays are required for chart rendering.',
                    'error',
                    'ACTION_REQUIRED: Use updateBarChart tool to provide both x and y data arrays for the chart',
                ),
            );
        } else if (data.x.length !== data.y.length) {
            errors.push(
                this.createError(
                    'barchart-data-mismatch',
                    'unknown',
                    'unknown',
                    'data_validation',
                    `BARCHART_DATA_MISMATCH: BarChart x and y data arrays have mismatched lengths. X array: ${data.x.length} items, Y array: ${data.y.length} items. Arrays must have equal length.`,
                    'error',
                    'ACTION_REQUIRED: Use updateBarChart tool to ensure x and y data arrays have the same number of elements',
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
        } else if (element.type === 'image') {
            errors.push(...(await this.lintImage(element as Image, slide)));
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
        errors.push(
            ...(await this.checkTextPartlyOutsideShape(
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
                    `TEXT_ELEMENT_OVERLAP: Text element "${textBox.id}" visually overlaps with other text elements: ${overlappingIds}. This reduces readability and creates visual confusion.`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to reposition overlapping text elements to ensure clear separation and readability',
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
                    `TEXT_WIDTH_OVERFLOW: Text content in element "${textBox.id}" exceeds container width. Text width: ${currentTextboxSize.width}px, Container width: ${containerWidth}px. Horizontal overflow detected.`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to increase container width or reduce font size to fit content horizontally',
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
                    `TEXT_HEIGHT_OVERFLOW: Text content in element "${textBox.id}" exceeds container height. Text height: ${currentTextboxSize.height}px, Container height: ${containerHeight}px. Vertical overflow detected.`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to increase container height or reduce font size to fit content vertically',
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
                    `TEXT_LEFT_BOUNDARY_VIOLATION: Text element "${textBox.id}" extends beyond left slide edge. Current x position: ${currentTextboxSize.x}px (negative values exceed left boundary).`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to set x position to 0 or greater to keep text within slide boundaries',
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
                    `TEXT_TOP_BOUNDARY_VIOLATION: Text element "${textBox.id}" extends beyond top slide edge. Current y position: ${currentTextboxSize.y}px (negative values exceed top boundary).`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to set y position to 0 or greater to keep text within slide boundaries',
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
                    `TEXT_RIGHT_BOUNDARY_VIOLATION: Text element "${textBox.id}" extends beyond right slide edge. Right edge position: ${textRight}px exceeds slide width: ${SLIDE_WIDTH}px.`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to reduce x position or width to ensure right edge stays within slide boundaries',
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
                    `TEXT_BOTTOM_BOUNDARY_VIOLATION: Text element "${textBox.id}" extends beyond bottom slide edge. Bottom edge position: ${textBottom}px exceeds slide height: ${SLIDE_HEIGHT}px.`,
                    'warning',
                    'ACTION_REQUIRED: Use updateTextElement tool to reduce y position or height to ensure bottom edge stays within slide boundaries',
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
                            `TEXT_VISIBILITY_BLOCKED: Text element "${textBox.id}" is visually covered by shape "${shape.id}". Shape z-index: ${zIndexComparison.zIndexA}, Text z-index: ${zIndexComparison.zIndexB}. Text content may be unreadable.`,
                            'warning',
                            'ACTION_REQUIRED: Use changeElementZIndex tool to increase text z-index above shape z-index, or decrease shape z-index to make text visible',
                        ),
                    );
                }
            }
        }

        return errors;
    }

    private async checkTextPartlyOutsideShape(
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
                    textBox.id,
                    shape.id,
                );

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

                if (this.isTextPartlyOutsideShape(textBounds, shapeBounds)) {
                    errors.push(
                        this.createError(
                            `${textBox.id}-partly-outside-shape`,
                            textBox.id,
                            slide.id,
                            'text_shape_boundary',
                            `TEXT_PARTLY_OUTSIDE_SHAPE: Text element "${textBox.id}" is positioned partly outside shape "${shape.id}". Text should be either completely inside or completely outside the shape for better visual clarity.`,
                            'warning',
                            'ACTION_REQUIRED: Use updateTextElement tool to reposition text to be either completely inside or completely outside the shape boundaries',
                        ),
                    );
                }
            }
        }

        return errors;
    }

    private isTextPartlyOutsideShape(
        textBounds: { x: number; y: number; width: number; height: number },
        shapeBounds: { x: number; y?: number; width: number; height: number },
    ): boolean {
        if (!shapeBounds.y) return false;

        const textLeft = textBounds.x;
        const textRight = textBounds.x + textBounds.width;
        const textTop = textBounds.y;
        const textBottom = textBounds.y + textBounds.height;

        const shapeLeft = shapeBounds.x;
        const shapeRight = shapeBounds.x + shapeBounds.width;
        const shapeTop = shapeBounds.y;
        const shapeBottom = shapeBounds.y + shapeBounds.height;

        const textCompletelyInside =
            textLeft >= shapeLeft &&
            textRight <= shapeRight &&
            textTop >= shapeTop &&
            textBottom <= shapeBottom;

        const textCompletelyOutside =
            textRight <= shapeLeft ||
            textLeft >= shapeRight ||
            textBottom <= shapeTop ||
            textTop >= shapeBottom;

        return !textCompletelyInside && !textCompletelyOutside;
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

        errors.push(...this.checkElementOutsideSlide(shape, slide));
        errors.push(...this.checkElementCollisions(shape, slide));

        return errors;
    }

    private checkElementOutsideSlide(
        element: Shape | Image | BarChart,
        slide: Slide,
    ): LintingError[] {
        const errors: LintingError[] = [];
        const SLIDE_WIDTH = 1280;
        const SLIDE_HEIGHT = 720;

        const elementRight = element.position.x + element.size.width;
        const elementBottom = element.position.y + element.size.height;
        const elementTypeName =
            element.type === 'barchart'
                ? 'Chart'
                : element.type === 'image'
                  ? 'Image'
                  : 'Shape';
        const toolName =
            element.type === 'barchart'
                ? 'updateBarChart'
                : element.type === 'image'
                  ? 'updateImageElement'
                  : 'updateShapeTool';

        if (element.position.x < 0) {
            errors.push(
                this.createError(
                    `${element.id}-left-outside`,
                    element.id,
                    slide.id,
                    'outside_slide',
                    `${elementTypeName.toUpperCase()}_LEFT_BOUNDARY_VIOLATION: ${elementTypeName} element "${element.id}" extends beyond left slide edge. Current x position: ${element.position.x}px (negative values exceed left boundary).`,
                    'warning',
                    `ACTION_REQUIRED: Use ${toolName} tool to set x position to 0 or greater to keep element within slide boundaries`,
                ),
            );
        }

        if (element.position.y < 0) {
            errors.push(
                this.createError(
                    `${element.id}-top-outside`,
                    element.id,
                    slide.id,
                    'outside_slide',
                    `${elementTypeName.toUpperCase()}_TOP_BOUNDARY_VIOLATION: ${elementTypeName} element "${element.id}" extends beyond top slide edge. Current y position: ${element.position.y}px (negative values exceed top boundary).`,
                    'warning',
                    `ACTION_REQUIRED: Use ${toolName} tool to set y position to 0 or greater to keep element within slide boundaries`,
                ),
            );
        }

        if (elementRight > SLIDE_WIDTH) {
            errors.push(
                this.createError(
                    `${element.id}-right-outside`,
                    element.id,
                    slide.id,
                    'outside_slide',
                    `${elementTypeName.toUpperCase()}_RIGHT_BOUNDARY_VIOLATION: ${elementTypeName} element "${element.id}" extends beyond right slide edge. Right edge position: ${elementRight}px exceeds slide width: ${SLIDE_WIDTH}px.`,
                    'warning',
                    `ACTION_REQUIRED: Use ${toolName} tool to reduce x position or width to ensure right edge stays within slide boundaries`,
                ),
            );
        }

        if (elementBottom > SLIDE_HEIGHT) {
            errors.push(
                this.createError(
                    `${element.id}-bottom-outside`,
                    element.id,
                    slide.id,
                    'outside_slide',
                    `${elementTypeName.toUpperCase()}_BOTTOM_BOUNDARY_VIOLATION: ${elementTypeName} element "${element.id}" extends beyond bottom slide edge. Bottom edge position: ${elementBottom}px exceeds slide height: ${SLIDE_HEIGHT}px.`,
                    'warning',
                    `ACTION_REQUIRED: Use ${toolName} tool to reduce y position or height to ensure bottom edge stays within slide boundaries`,
                ),
            );
        }

        return errors;
    }

    private checkElementCollisions(
        element: Shape | Image | BarChart,
        slide: Slide,
    ): LintingError[] {
        const errors: LintingError[] = [];
        const elementTypeName =
            element.type === 'barchart'
                ? 'Chart'
                : element.type === 'image'
                  ? 'Image'
                  : 'Shape';
        const toolName =
            element.type === 'barchart'
                ? 'updateBarChart'
                : element.type === 'image'
                  ? 'updateImageElement'
                  : 'updateShapeTool';

        const overlappingElements = slide.elements.filter(
            (e) =>
                (e.type === 'rectangle' ||
                    e.type === 'circle' ||
                    e.type === 'triangle' ||
                    e.type === 'image' ||
                    e.type === 'barchart') &&
                e.id !== element.id &&
                element.id < e.id &&
                this.checkElementsOverlap(element, e),
        );

        if (overlappingElements.length > 0) {
            const overlappingIds = overlappingElements
                .map((e) => e.id)
                .join(', ');
            errors.push(
                this.createError(
                    `${element.id}-collision`,
                    element.id,
                    slide.id,
                    'shape_overlap',
                    `${elementTypeName.toUpperCase()}_ELEMENT_COLLISION: ${elementTypeName} element "${element.id}" spatially overlaps with other elements: ${overlappingIds}. Visual collision may cause content conflicts.`,
                    'warning',
                    `ACTION_SUGGESTED: Use ${toolName} tool to adjust element positions to avoid overlap, or use changeElementZIndex tool to control visual layering if intentional overlap is desired`,
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

    private lintBarChart(barChart: BarChart, slide: Slide): LintingError[] {
        const errors: LintingError[] = [];

        if (barChart.data) {
            errors.push(...this.validateBarChartData(barChart.data));
        }

        errors.push(...this.checkElementOutsideSlide(barChart, slide));
        errors.push(...this.checkElementCollisions(barChart, slide));

        return errors;
    }

    private async lintImage(
        image: Image,
        slide: Slide,
    ): Promise<LintingError[]> {
        const errors: LintingError[] = [];

        errors.push(...this.checkElementOutsideSlide(image, slide));
        errors.push(...this.checkElementCollisions(image, slide));

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
