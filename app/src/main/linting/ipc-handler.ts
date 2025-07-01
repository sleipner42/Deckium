import { ipcMain } from 'electron';
import { LintingService } from './service';

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

        ipcMain.handle(
            'linting:validate-parameters',
            (_event, params, requiredParams) => {
                return this.lintingService.validateParameters(
                    params,
                    requiredParams,
                );
            },
        );

        ipcMain.handle(
            'linting:validate-element-exists',
            async (_event, elementId) => {
                return await this.lintingService.validateElementExists(
                    elementId,
                );
            },
        );

        ipcMain.handle('linting:validate-slide-exists', (_event, slideId) => {
            return this.lintingService.validateSlideExists(slideId);
        });

        ipcMain.handle(
            'linting:check-dom-overlap',
            async (_event, elementId) => {
                return await this.lintingService.checkDOMOverlap(elementId);
            },
        );

        ipcMain.handle(
            'linting:check-text-overflow',
            async (_event, elementId) => {
                return await this.lintingService.checkTextOverflow(elementId);
            },
        );

        ipcMain.handle('linting:validate-barchart-data', (_event, data) => {
            return this.lintingService.validateBarChartData(data);
        });

        ipcMain.handle('linting:get-errors', (_event, slideId?: string) => {
            return this.lintingService.getLintingErrors(slideId);
        });

        ipcMain.handle('linting:clear-errors', (_event, slideId?: string) => {
            return this.lintingService.clearErrors(slideId);
        });

        ipcMain.handle('linting:has-errors', (_event, slideId?: string) => {
            return this.lintingService.hasErrors(slideId);
        });

        ipcMain.handle('linting:get-errors-by-severity', (_event, severity) => {
            return this.lintingService.getErrorsBySeverity(severity);
        });
    }
}
