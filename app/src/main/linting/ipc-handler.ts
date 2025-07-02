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
    }
}
