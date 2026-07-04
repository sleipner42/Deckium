import type { LintingError, LintingErrorType, LintingSeverity } from './types';

// Every string in this file is AI-facing prompt text consumed by the model
// via tool-adapter feedback. Treat changes as prompt engineering, not copy
// editing — the wording is load-bearing.

export function createError(
    id: string,
    elementId: string,
    slideId: string,
    type: LintingErrorType,
    message: string,
    severity: LintingSeverity,
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

export const textOverlap = (
    textBoxId: string,
    slideId: string,
    overlappingIds: string,
): LintingError =>
    createError(
        `${textBoxId}-text-overlap`,
        textBoxId,
        slideId,
        'text_overlap',
        `TEXT_ELEMENT_OVERLAP: Text element "${textBoxId}" visually overlaps with other text elements: ${overlappingIds}. This reduces readability and creates visual confusion.`,
        'warning',
        'ACTION_REQUIRED: Use updateTextElement tool to reposition overlapping text elements to ensure clear separation and readability',
    );

export const textWidthOverflow = (
    textBoxId: string,
    slideId: string,
    textWidth: number,
    containerWidth: number,
): LintingError =>
    createError(
        `${textBoxId}-text-width-overflow`,
        textBoxId,
        slideId,
        'text_overflow',
        `TEXT_WIDTH_OVERFLOW: Text content in element "${textBoxId}" exceeds container width. Text width: ${textWidth}px, Container width: ${containerWidth}px. Horizontal overflow detected.`,
        'warning',
        'ACTION_REQUIRED: Use updateTextElement tool to increase container width or reduce font size to fit content horizontally',
    );

export const textHeightOverflow = (
    textBoxId: string,
    slideId: string,
    textHeight: number,
    containerHeight: number,
): LintingError =>
    createError(
        `${textBoxId}-text-height-overflow`,
        textBoxId,
        slideId,
        'text_overflow',
        `TEXT_HEIGHT_OVERFLOW: Text content in element "${textBoxId}" exceeds container height. Text height: ${textHeight}px, Container height: ${containerHeight}px. Vertical overflow detected.`,
        'warning',
        'ACTION_REQUIRED: Use updateTextElement tool to increase container height or reduce font size to fit content vertically',
    );

export const textOutsideSlide = {
    left: (textBoxId: string, slideId: string, x: number): LintingError =>
        createError(
            `${textBoxId}-text-left-outside`,
            textBoxId,
            slideId,
            'outside_slide',
            `TEXT_LEFT_BOUNDARY_VIOLATION: Text element "${textBoxId}" extends beyond left slide edge. Current x position: ${x}px (negative values exceed left boundary).`,
            'warning',
            'ACTION_REQUIRED: Use updateTextElement tool to set x position to 0 or greater to keep text within slide boundaries',
        ),
    top: (textBoxId: string, slideId: string, y: number): LintingError =>
        createError(
            `${textBoxId}-text-top-outside`,
            textBoxId,
            slideId,
            'outside_slide',
            `TEXT_TOP_BOUNDARY_VIOLATION: Text element "${textBoxId}" extends beyond top slide edge. Current y position: ${y}px (negative values exceed top boundary).`,
            'warning',
            'ACTION_REQUIRED: Use updateTextElement tool to set y position to 0 or greater to keep text within slide boundaries',
        ),
    right: (
        textBoxId: string,
        slideId: string,
        textRight: number,
        slideWidth: number,
    ): LintingError =>
        createError(
            `${textBoxId}-text-right-outside`,
            textBoxId,
            slideId,
            'outside_slide',
            `TEXT_RIGHT_BOUNDARY_VIOLATION: Text element "${textBoxId}" extends beyond right slide edge. Right edge position: ${textRight}px exceeds slide width: ${slideWidth}px.`,
            'warning',
            'ACTION_REQUIRED: Use updateTextElement tool to reduce x position or width to ensure right edge stays within slide boundaries',
        ),
    bottom: (
        textBoxId: string,
        slideId: string,
        textBottom: number,
        slideHeight: number,
    ): LintingError =>
        createError(
            `${textBoxId}-text-bottom-outside`,
            textBoxId,
            slideId,
            'outside_slide',
            `TEXT_BOTTOM_BOUNDARY_VIOLATION: Text element "${textBoxId}" extends beyond bottom slide edge. Bottom edge position: ${textBottom}px exceeds slide height: ${slideHeight}px.`,
            'warning',
            'ACTION_REQUIRED: Use updateTextElement tool to reduce y position or height to ensure bottom edge stays within slide boundaries',
        ),
};

export const textCoveredByShape = (
    textBoxId: string,
    slideId: string,
    shapeId: string,
    shapeZIndex: number,
    textZIndex: number,
): LintingError =>
    createError(
        `${textBoxId}-covered-by-shape`,
        textBoxId,
        slideId,
        'zindex_issue',
        `TEXT_VISIBILITY_BLOCKED: Text element "${textBoxId}" is visually covered by shape "${shapeId}". Shape z-index: ${shapeZIndex}, Text z-index: ${textZIndex}. Text content may be unreadable.`,
        'warning',
        'ACTION_REQUIRED: Use changeElementZIndex tool to increase text z-index above shape z-index, or decrease shape z-index to make text visible',
    );

export const textPartlyOutsideShape = (
    textBoxId: string,
    slideId: string,
    shapeId: string,
): LintingError =>
    createError(
        `${textBoxId}-partly-outside-shape`,
        textBoxId,
        slideId,
        'text_shape_boundary',
        `TEXT_PARTLY_OUTSIDE_SHAPE: Text element "${textBoxId}" is positioned partly outside shape "${shapeId}". Text should be either completely inside or completely outside the shape for better visual clarity.`,
        'warning',
        'ACTION_REQUIRED: Use updateTextElement tool to reposition text to be either completely inside or completely outside the shape boundaries',
    );

export const elementOutsideSlide = {
    left: (
        elementId: string,
        slideId: string,
        typeName: string,
        toolName: string,
        x: number,
    ): LintingError =>
        createError(
            `${elementId}-left-outside`,
            elementId,
            slideId,
            'outside_slide',
            `${typeName.toUpperCase()}_LEFT_BOUNDARY_VIOLATION: ${typeName} element "${elementId}" extends beyond left slide edge. Current x position: ${x}px (negative values exceed left boundary).`,
            'warning',
            `ACTION_REQUIRED: Use ${toolName} tool to set x position to 0 or greater to keep element within slide boundaries`,
        ),
    top: (
        elementId: string,
        slideId: string,
        typeName: string,
        toolName: string,
        y: number,
    ): LintingError =>
        createError(
            `${elementId}-top-outside`,
            elementId,
            slideId,
            'outside_slide',
            `${typeName.toUpperCase()}_TOP_BOUNDARY_VIOLATION: ${typeName} element "${elementId}" extends beyond top slide edge. Current y position: ${y}px (negative values exceed top boundary).`,
            'warning',
            `ACTION_REQUIRED: Use ${toolName} tool to set y position to 0 or greater to keep element within slide boundaries`,
        ),
    right: (
        elementId: string,
        slideId: string,
        typeName: string,
        toolName: string,
        elementRight: number,
        slideWidth: number,
    ): LintingError =>
        createError(
            `${elementId}-right-outside`,
            elementId,
            slideId,
            'outside_slide',
            `${typeName.toUpperCase()}_RIGHT_BOUNDARY_VIOLATION: ${typeName} element "${elementId}" extends beyond right slide edge. Right edge position: ${elementRight}px exceeds slide width: ${slideWidth}px.`,
            'warning',
            `ACTION_REQUIRED: Use ${toolName} tool to reduce x position or width to ensure right edge stays within slide boundaries`,
        ),
    bottom: (
        elementId: string,
        slideId: string,
        typeName: string,
        toolName: string,
        elementBottom: number,
        slideHeight: number,
    ): LintingError =>
        createError(
            `${elementId}-bottom-outside`,
            elementId,
            slideId,
            'outside_slide',
            `${typeName.toUpperCase()}_BOTTOM_BOUNDARY_VIOLATION: ${typeName} element "${elementId}" extends beyond bottom slide edge. Bottom edge position: ${elementBottom}px exceeds slide height: ${slideHeight}px.`,
            'warning',
            `ACTION_REQUIRED: Use ${toolName} tool to reduce y position or height to ensure bottom edge stays within slide boundaries`,
        ),
};

export const elementCollision = (
    elementId: string,
    slideId: string,
    typeName: string,
    toolName: string,
    overlappingIds: string,
): LintingError =>
    createError(
        `${elementId}-collision`,
        elementId,
        slideId,
        'shape_overlap',
        `${typeName.toUpperCase()}_ELEMENT_COLLISION: ${typeName} element "${elementId}" spatially overlaps with other elements: ${overlappingIds}. Visual collision may cause content conflicts.`,
        'warning',
        `ACTION_SUGGESTED: Use ${toolName} tool to adjust element positions to avoid overlap, or use changeElementZIndex tool to control visual layering if intentional overlap is desired`,
    );

// Preserved quirk: barchart data errors are not element-scoped.
export const barChartMissingData = (): LintingError =>
    createError(
        'barchart-missing-data',
        'unknown',
        'unknown',
        'data_validation',
        'BARCHART_MISSING_DATA: BarChart element is missing required data arrays. Both x and y data arrays are required for chart rendering.',
        'error',
        'ACTION_REQUIRED: Use updateBarChart tool to provide both x and y data arrays for the chart',
    );

export const barChartDataMismatch = (
    xLength: number,
    yLength: number,
): LintingError =>
    createError(
        'barchart-data-mismatch',
        'unknown',
        'unknown',
        'data_validation',
        `BARCHART_DATA_MISMATCH: BarChart x and y data arrays have mismatched lengths. X array: ${xLength} items, Y array: ${yLength} items. Arrays must have equal length.`,
        'error',
        'ACTION_REQUIRED: Use updateBarChart tool to ensure x and y data arrays have the same number of elements',
    );
