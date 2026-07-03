import { ipcMain } from 'electron';
import type { LintingService } from './service';

export class LintingIpcHandler {
    private lintingService: LintingService;

    constructor(lintingService: LintingService) {
        this.lintingService = lintingService;
        this.setupIpcHandlers();
    }

    private setupIpcHandlers(): void {
        ipcMain.handle('linting:lint-slide', async (_event, slide) => {
            return await this.lintingService.lintSlide(slide);
        });

        ipcMain.handle('linting:get-errors', (_event, slideId?: string) => {
            return this.lintingService.getLintingErrors(slideId);
        });

        ipcMain.handle('linting:clear-errors', (_event, slideId?: string) => {
            this.lintingService.clearErrors(slideId);
        });

        ipcMain.handle('linting:has-errors', (_event, slideId?: string) => {
            return this.lintingService.hasErrors(slideId);
        });
    }
}
