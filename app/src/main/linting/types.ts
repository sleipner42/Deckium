export type LintingErrorType =
    | 'parameter_validation'
    | 'element_not_found'
    | 'slide_not_found'
    | 'dom_overlap'
    | 'text_overflow'
    | 'outside_slide'
    | 'data_validation'
    | 'content_quality'
    | 'spacing_layout';

export interface LintingError {
    id: string;
    elementId: string;
    slideId: string;
    type: LintingErrorType;
    message: string;
    severity: 'error' | 'warning' | 'info';
    line?: number;
    column?: number;
    suggestedFix?: string;
    createdAt: Date;
}

export interface SlideLintingResult {
    slideId: string;
    errors: LintingError[];
    hasErrors: boolean;
    lintedAt: Date;
}

export interface LintingState {
    errorsBySlide: Map<string, LintingError[]>;
    allErrors: LintingError[];
    lastLintedAt: Date | null;
}
