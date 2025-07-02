export type LintingErrorType =
    | 'data_validation'
    | 'dom_overlap'
    | 'outside_slide'
    | 'text_overlap'
    | 'shape_overlap'
    | 'zindex_issue'
    | 'text_overflow';

export type LintingSeverity = 'error' | 'warning' | 'info';

export interface LintingError {
    id: string;
    elementId: string;
    slideId: string;
    type: LintingErrorType;
    message: string;
    severity: LintingSeverity;
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
