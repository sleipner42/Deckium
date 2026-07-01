import * as fs from 'node:fs';
import * as path from 'node:path';
import { app, safeStorage } from 'electron';
import type {
    LLMProviderConfig,
    LLMProviderType,
    LLMSettings,
} from '../../common/domain/interfaces/llm-provider';
import { Logger } from '../utils/logger';

const CONFIG = {
    settingsFile: path.join(app.getPath('userData'), 'llm-settings.json'),
};

// Marker prefixed to API keys that have been encrypted with safeStorage, so we
// can tell them apart from legacy plaintext keys and migrate transparently.
const ENC_PREFIX = 'enc:v1:';

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
                model: 'gpt-5.5',
            },
            providers: {
                openai: {
                    provider: 'openai',
                    model: 'gpt-5.5',
                },
                anthropic: {
                    provider: 'anthropic',
                    model: 'claude-sonnet-4-6',
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
                    const onDisk = JSON.parse(settingsData) as LLMSettings;
                    const { settings, hadPlaintextKey } =
                        this.decryptSettings(onDisk);
                    this.settings = settings;
                    this.logger.logSystem('LLM settings loaded', 'info');
                    // Transparently migrate any legacy plaintext keys to
                    // encrypted-at-rest storage.
                    if (
                        hadPlaintextKey &&
                        safeStorage.isEncryptionAvailable()
                    ) {
                        this.logger.logSystem(
                            'Migrating plaintext API keys to encrypted storage',
                            'info',
                        );
                        this.saveSettings();
                    }
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
                JSON.stringify(this.encryptSettings(this.settings), null, 2),
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

    /**
     * Encrypt an API key with the OS keychain (safeStorage). Falls back to
     * plaintext (with a warning) if no OS encryption backend is available, e.g.
     * a Linux box without a keyring — better than crashing, but flagged.
     */
    private encryptSecret(plain?: string): string | undefined {
        if (!plain) {
            return plain;
        }
        // Already encrypted (idempotent for re-saves).
        if (plain.startsWith(ENC_PREFIX)) {
            return plain;
        }
        try {
            if (safeStorage.isEncryptionAvailable()) {
                return (
                    ENC_PREFIX +
                    safeStorage.encryptString(plain).toString('base64')
                );
            }
            this.logger.logSystem(
                'OS encryption unavailable; storing API key without encryption',
                'warn',
            );
        } catch (error) {
            this.logger.logSystem('Failed to encrypt API key', 'error', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return plain;
    }

    private decryptSecret(stored?: string): {
        value?: string;
        wasPlaintext: boolean;
    } {
        if (!stored) {
            return { value: stored, wasPlaintext: false };
        }
        if (!stored.startsWith(ENC_PREFIX)) {
            // Legacy plaintext key from before encryption was added.
            return { value: stored, wasPlaintext: true };
        }
        try {
            const buf = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
            return {
                value: safeStorage.decryptString(buf),
                wasPlaintext: false,
            };
        } catch (error) {
            this.logger.logSystem('Failed to decrypt API key', 'error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { value: undefined, wasPlaintext: false };
        }
    }

    /** Returns a copy of settings with every apiKey encrypted for disk. */
    private encryptSettings(settings: LLMSettings): LLMSettings {
        const providers = {} as LLMSettings['providers'];
        for (const [provider, config] of Object.entries(settings.providers)) {
            providers[provider as LLMProviderType] = {
                ...config,
                apiKey: this.encryptSecret(config.apiKey),
            };
        }
        return {
            currentProvider: {
                ...settings.currentProvider,
                apiKey: this.encryptSecret(settings.currentProvider.apiKey),
            },
            providers,
        };
    }

    /** Returns a copy of settings with every apiKey decrypted for in-memory use. */
    private decryptSettings(settings: LLMSettings): {
        settings: LLMSettings;
        hadPlaintextKey: boolean;
    } {
        let hadPlaintextKey = false;
        const providers = {} as LLMSettings['providers'];
        for (const [provider, config] of Object.entries(settings.providers)) {
            const { value, wasPlaintext } = this.decryptSecret(config.apiKey);
            hadPlaintextKey = hadPlaintextKey || wasPlaintext;
            providers[provider as LLMProviderType] = {
                ...config,
                apiKey: value,
            };
        }
        const current = this.decryptSecret(settings.currentProvider.apiKey);
        hadPlaintextKey = hadPlaintextKey || current.wasPlaintext;
        return {
            settings: {
                currentProvider: {
                    ...settings.currentProvider,
                    apiKey: current.value,
                },
                providers,
            },
            hadPlaintextKey,
        };
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
        const existing = settings.providers[provider];
        const { apiKey, ...rest } = config;
        settings.providers[provider] = {
            ...existing,
            ...rest,
            // Preserve the stored key when the update omits one (the renderer
            // only sends a key when the user actually enters a new one).
            apiKey: apiKey || existing?.apiKey,
            provider,
        };
        this.saveSettings();
        this.logger.logSystem('Provider settings updated', 'info', {
            provider,
        });
    }

    setCurrentProvider(config: LLMProviderConfig): void {
        const settings = this.getSettings();
        const { apiKey, ...rest } = config;
        const merged: LLMProviderConfig = {
            ...rest,
            apiKey: apiKey || settings.providers[config.provider]?.apiKey,
        };
        settings.currentProvider = merged;

        // Also update the provider's settings
        settings.providers[merged.provider] = merged;

        this.saveSettings();
        this.logger.logSystem('Current provider updated', 'info', {
            provider: merged.provider,
            model: merged.model,
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
