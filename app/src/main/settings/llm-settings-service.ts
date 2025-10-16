import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import type {
    LLMProviderConfig,
    LLMProviderType,
    LLMSettings,
} from '../../common/domain/interfaces/llm-provider';
import { Logger } from '../utils/logger';

const CONFIG = {
    settingsFile: path.join(app.getPath('userData'), 'llm-settings.json'),
};

/**
 * Service for managing LLM provider settings in standalone mode
 */
export class LLMSettingsService {
    private settings: LLMSettings | null = null;
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
        this.loadSettings();
    }

    private getDefaultSettings(): LLMSettings {
        return {
            currentProvider: {
                provider: 'openai',
                model: 'gpt-4o-mini',
            },
            providers: {
                openai: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                },
                anthropic: {
                    provider: 'anthropic',
                    model: 'claude-3-5-sonnet-20241022',
                },
                'azure-openai': {
                    provider: 'azure-openai',
                    model: 'gpt-4o-mini',
                },
                google: {
                    provider: 'google',
                    model: 'gemini-2.0-flash-exp',
                },
                ollama: {
                    provider: 'ollama',
                    model: 'llama3.2',
                    endpoint: 'http://localhost:11434',
                },
            },
        };
    }

    private loadSettings(): void {
        this.logger.logSystem('Loading LLM settings from file', 'info');
        try {
            if (fs.existsSync(CONFIG.settingsFile)) {
                const settingsData = fs.readFileSync(
                    CONFIG.settingsFile,
                    'utf8',
                );
                if (settingsData) {
                    this.settings = JSON.parse(settingsData);
                    this.logger.logSystem('LLM settings loaded', 'info');
                    return;
                }
            }
            this.logger.logSystem(
                'No LLM settings found, using defaults',
                'info',
            );
            this.settings = this.getDefaultSettings();
        } catch (error) {
            this.logger.logSystem('Failed to load LLM settings', 'warn', {
                error: error instanceof Error ? error.message : String(error),
                filePath: CONFIG.settingsFile,
            });
            this.settings = this.getDefaultSettings();
        }
    }

    private saveSettings(): void {
        if (!this.settings) {
            return;
        }

        try {
            fs.writeFileSync(
                CONFIG.settingsFile,
                JSON.stringify(this.settings, null, 2),
                'utf8',
            );
            this.logger.logSystem('LLM settings saved successfully', 'debug');
        } catch (error) {
            this.logger.logSystem('Failed to save LLM settings', 'error', {
                error: error instanceof Error ? error.message : String(error),
                filePath: CONFIG.settingsFile,
            });
        }
    }

    getSettings(): LLMSettings {
        if (!this.settings) {
            this.settings = this.getDefaultSettings();
        }
        return this.settings;
    }

    getCurrentProvider(): LLMProviderConfig {
        return this.getSettings().currentProvider;
    }

    getProviderSettings(provider: LLMProviderType): Partial<LLMProviderConfig> {
        return this.getSettings().providers[provider] || {};
    }

    updateProviderSettings(
        provider: LLMProviderType,
        config: Partial<LLMProviderConfig>,
    ): void {
        const settings = this.getSettings();
        settings.providers[provider] = {
            ...settings.providers[provider],
            ...config,
            provider,
        };
        this.saveSettings();
        this.logger.logSystem('Provider settings updated', 'info', {
            provider,
        });
    }

    setCurrentProvider(config: LLMProviderConfig): void {
        const settings = this.getSettings();
        settings.currentProvider = config;

        // Also update the provider's settings
        settings.providers[config.provider] = config;

        this.saveSettings();
        this.logger.logSystem('Current provider updated', 'info', {
            provider: config.provider,
            model: config.model,
        });
    }

    clearSettings(): void {
        this.settings = this.getDefaultSettings();
        try {
            if (fs.existsSync(CONFIG.settingsFile)) {
                fs.unlinkSync(CONFIG.settingsFile);
                this.logger.logSystem('LLM settings file cleared', 'debug');
            }
        } catch (error) {
            this.logger.logSystem('Failed to clear LLM settings file', 'warn', {
                error: error instanceof Error ? error.message : String(error),
                filePath: CONFIG.settingsFile,
            });
        }
    }

    /**
     * Validate that the current provider has all required configuration
     */
    validateCurrentProvider(): {
        valid: boolean;
        missingFields: string[];
    } {
        const config = this.getCurrentProvider();
        const missing: string[] = [];

        switch (config.provider) {
            case 'openai':
            case 'anthropic':
            case 'google':
                if (!config.apiKey) {
                    missing.push('apiKey');
                }
                if (!config.model) {
                    missing.push('model');
                }
                break;

            case 'azure-openai':
                if (!config.apiKey) {
                    missing.push('apiKey');
                }
                if (!config.endpoint) {
                    missing.push('endpoint');
                }
                if (!config.deployment) {
                    missing.push('deployment');
                }
                break;

            case 'ollama':
                if (!config.endpoint) {
                    missing.push('endpoint');
                }
                if (!config.model) {
                    missing.push('model');
                }
                break;
        }

        return {
            valid: missing.length === 0,
            missingFields: missing,
        };
    }
}
