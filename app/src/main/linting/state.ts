import { LintingError, LintingState } from './types';

export class LintingStateManager {
    private state: LintingState;

    constructor() {
        this.state = {
            errorsBySlide: new Map(),
            allErrors: [],
            lastLintedAt: null,
        };
    }

    getState(): LintingState {
        return {
            ...this.state,
            errorsBySlide: new Map(this.state.errorsBySlide),
            allErrors: [...this.state.allErrors],
        };
    }

    addError(error: LintingError): void {
        const slideErrors = this.state.errorsBySlide.get(error.slideId) || [];
        const existingErrorIndex = slideErrors.findIndex(
            (e) => e.id === error.id,
        );

        if (existingErrorIndex >= 0) {
            slideErrors[existingErrorIndex] = error;
        } else {
            slideErrors.push(error);
        }

        this.state.errorsBySlide.set(error.slideId, slideErrors);
        this.updateAllErrors();
    }

    removeError(errorId: string): boolean {
        let removed = false;

        for (const [slideId, errors] of this.state.errorsBySlide.entries()) {
            const filteredErrors = errors.filter((e) => e.id !== errorId);
            if (filteredErrors.length !== errors.length) {
                this.state.errorsBySlide.set(slideId, filteredErrors);
                removed = true;
                break;
            }
        }

        if (removed) {
            this.updateAllErrors();
        }

        return removed;
    }

    clearSlideErrors(slideId: string): void {
        this.state.errorsBySlide.delete(slideId);
        this.updateAllErrors();
    }

    clearAllErrors(): void {
        this.state.errorsBySlide.clear();
        this.state.allErrors = [];
        this.state.lastLintedAt = null;
    }

    setSlideErrors(slideId: string, errors: LintingError[]): void {
        this.state.errorsBySlide.set(slideId, errors);
        this.updateAllErrors();
        this.state.lastLintedAt = new Date();
    }

    getSlideErrors(slideId: string): LintingError[] {
        return this.state.errorsBySlide.get(slideId) || [];
    }

    getAllErrors(): LintingError[] {
        return [...this.state.allErrors];
    }

    getErrorsByType(type: LintingError['type']): LintingError[] {
        return this.state.allErrors.filter((error) => error.type === type);
    }

    getErrorsBySeverity(severity: LintingError['severity']): LintingError[] {
        return this.state.allErrors.filter(
            (error) => error.severity === severity,
        );
    }

    hasErrors(): boolean {
        return this.state.allErrors.length > 0;
    }

    hasSlideErrors(slideId: string): boolean {
        const errors = this.state.errorsBySlide.get(slideId);
        return errors ? errors.length > 0 : false;
    }

    private updateAllErrors(): void {
        this.state.allErrors = Array.from(
            this.state.errorsBySlide.values(),
        ).flat();
    }
}
