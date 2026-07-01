import { ipcMain } from 'electron';
import type {
    LLMProviderConfig,
    LLMProviderType,
    LLMSettings,
} from '../../common/domain/interfaces/llm-provider';
import { LLMSettingsService } from './llm-settings-service';

/**
 * Strip the raw apiKey before a config crosses the IPC boundary to the
 * renderer, replacing it with a boolean flag. Keys stay in the main process.
 */
function redactConfig(
    config: Partial<LLMProviderConfig>,
): Partial<LLMProviderConfig> {
    const { apiKey, ...rest } = config;
    return { ...rest, hasApiKey: !!apiKey };
}

function redactSettings(settings: LLMSettings): LLMSettings {
    const providers = {} as LLMSettings['providers'];
    for (const [provider, config] of Object.entries(settings.providers)) {
        providers[provider as LLMProviderType] = redactConfig(config);
    }
    return {
        currentProvider: redactConfig(
            settings.currentProvider,
        ) as LLMProviderConfig,
        providers,
    };
}

export function setupLLMSettingsIPC(service: LLMSettingsService): void {
    // Get all settings (keys redacted)
    ipcMain.handle(
        'llm-settings:get-settings',
        async (): Promise<LLMSettings> => {
            return redactSettings(service.getSettings());
        },
    );

    // Get current provider config (key redacted)
    ipcMain.handle(
        'llm-settings:get-current-provider',
        async (): Promise<LLMProviderConfig> => {
            return redactConfig(
                service.getCurrentProvider(),
            ) as LLMProviderConfig;
        },
    );

    // Get specific provider settings (key redacted)
    ipcMain.handle(
        'llm-settings:get-provider-settings',
        async (
            _event,
            provider: LLMProviderType,
        ): Promise<Partial<LLMProviderConfig>> => {
            return redactConfig(service.getProviderSettings(provider));
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
