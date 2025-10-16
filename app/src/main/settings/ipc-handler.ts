import { ipcMain } from 'electron';
import type {
    LLMProviderConfig,
    LLMProviderType,
    LLMSettings,
} from '../../common/domain/interfaces/llm-provider';
import { LLMSettingsService } from './llm-settings-service';

export function setupLLMSettingsIPC(service: LLMSettingsService): void {
    // Get all settings
    ipcMain.handle(
        'llm-settings:get-settings',
        async (): Promise<LLMSettings> => {
            return service.getSettings();
        },
    );

    // Get current provider config
    ipcMain.handle(
        'llm-settings:get-current-provider',
        async (): Promise<LLMProviderConfig> => {
            return service.getCurrentProvider();
        },
    );

    // Get specific provider settings
    ipcMain.handle(
        'llm-settings:get-provider-settings',
        async (
            _event,
            provider: LLMProviderType,
        ): Promise<Partial<LLMProviderConfig>> => {
            return service.getProviderSettings(provider);
        },
    );

    // Update provider settings
    ipcMain.handle(
        'llm-settings:update-provider',
        async (
            _event,
            provider: LLMProviderType,
            config: Partial<LLMProviderConfig>,
        ): Promise<void> => {
            service.updateProviderSettings(provider, config);
        },
    );

    // Set current provider
    ipcMain.handle(
        'llm-settings:set-current-provider',
        async (_event, config: LLMProviderConfig): Promise<void> => {
            service.setCurrentProvider(config);
        },
    );

    // Validate current provider
    ipcMain.handle(
        'llm-settings:validate-current-provider',
        async (): Promise<{ valid: boolean; missingFields: string[] }> => {
            return service.validateCurrentProvider();
        },
    );

    // Clear all settings
    ipcMain.handle('llm-settings:clear', async (): Promise<void> => {
        service.clearSettings();
    });
}
