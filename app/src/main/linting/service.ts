import type { BrowserWindow } from 'electron';
import type { Slide } from '../../common/domain/entities/types';
import { LintingEventBus } from './event-bus';
import { captureGeometrySnapshot } from './geometry';
import { runLintRules } from './rules';
import { LintingStateManager } from './state';
import type { LintingError, SlideLintingResult } from './types';

export class LintingService {
    private state: LintingStateManager;
    private eventBus: LintingEventBus;
    private mainWindow: BrowserWindow | null = null;
    // Guards concurrent lints of the same slide: only the newest run may
    // store its result and broadcast.
    private lintSequence: Map<string, number> = new Map();

    constructor() {
        this.state = new LintingStateManager();
        this.eventBus = new LintingEventBus();
    }

    setMainWindow(window: BrowserWindow): void {
        this.mainWindow = window;
    }

    async lintSlide(slide: Slide): Promise<SlideLintingResult> {
        const sequence = (this.lintSequence.get(slide.id) ?? 0) + 1;
        this.lintSequence.set(slide.id, sequence);

        // One renderer round-trip for all element geometry; every element
        // falls back to model position/size when not rendered.
        const geometry = await captureGeometrySnapshot(this.mainWindow, slide);
        const errors = runLintRules({ slide, geometry });

        const result: SlideLintingResult = {
            slideId: slide.id,
            errors,
            hasErrors: errors.length > 0,
            lintedAt: new Date(),
        };

        if (this.lintSequence.get(slide.id) !== sequence) {
            // A newer lint of this slide started while we measured; return
            // this run's result to its caller without clobbering state.
            return result;
        }

        this.state.setSlideErrors(slide.id, errors);
        this.eventBus.broadcastToWindows(
            LintingEventBus.events.SLIDE_LINTED,
            result,
        );

        return result;
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

    onEvent(eventName: string, listener: (...args: any[]) => void): void {
        this.eventBus.on(eventName, listener);
    }

    offEvent(eventName: string, listener: (...args: any[]) => void): void {
        this.eventBus.off(eventName, listener);
    }
}
