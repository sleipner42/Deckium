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
