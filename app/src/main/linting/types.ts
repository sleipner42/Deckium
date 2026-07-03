import type { LintingError } from '../../common/domain/entities/linting-types';

export type {
    LintingError,
    LintingErrorType,
    LintingSeverity,
    SlideLintingResult,
} from '../../common/domain/entities/linting-types';

export interface LintingState {
    errorsBySlide: Map<string, LintingError[]>;
    allErrors: LintingError[];
    lastLintedAt: Date | null;
}
