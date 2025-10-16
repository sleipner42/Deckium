/**
 * LLM Provider configuration types for standalone mode
 */

export type LLMProviderType =
    | 'openai'
    | 'anthropic'
    | 'azure-openai'
    | 'google'
    | 'ollama';

export interface LLMProviderConfig {
    provider: LLMProviderType;
    apiKey?: string;
    model: string;
    endpoint?: string; // For Azure OpenAI and Ollama
    deployment?: string; // For Azure OpenAI
    apiVersion?: string; // For Azure OpenAI
}

export interface LLMSettings {
    currentProvider: LLMProviderConfig;
    providers: Record<LLMProviderType, Partial<LLMProviderConfig>>;
}

// Default models for each provider
export const DEFAULT_MODELS: Record<LLMProviderType, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-haiku-4-5-20251001',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
    ],
    'azure-openai': ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-35-turbo'],
    google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    ollama: ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'codellama'],
};

export const PROVIDER_DISPLAY_NAMES: Record<LLMProviderType, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    'azure-openai': 'Azure OpenAI',
    google: 'Google AI',
    ollama: 'Ollama (Local)',
};
