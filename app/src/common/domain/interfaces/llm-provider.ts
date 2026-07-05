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
    // OpenAI reasoning models only. Empty/undefined means "use the model's
    // default". Which values a given model accepts is model-specific and only
    // enforced by the OpenAI API, so this is user-selected, not validated here.
    reasoningEffort?: string;
    // Opt in to the provider's native, server-side web search tool (OpenAI,
    // Anthropic, Google only — see WEB_SEARCH_PROVIDERS). Off by default because
    // the provider bills each search. Ignored for providers without support.
    webSearchEnabled?: boolean;
    // Set on configs sent to the renderer instead of the raw apiKey: indicates
    // whether a key is stored, without exposing the secret itself.
    hasApiKey?: boolean;
}

// Providers whose SDK exposes a native, server-side web search tool. Used to
// gate the settings toggle and the tool wiring (providerToolsFor).
export const WEB_SEARCH_PROVIDERS: LLMProviderType[] = [
    'openai',
    'anthropic',
    'google',
];

// The full set of reasoning-effort values the OpenAI provider type accepts.
// Mirrors the SDK's compile-time union (it is not exposed at runtime), and is
// the superset across models — an individual model may reject some of these.
export const OPENAI_REASONING_EFFORTS = [
    'none',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
] as const;

export interface LLMSettings {
    currentProvider: LLMProviderConfig;
    providers: Record<LLMProviderType, Partial<LLMProviderConfig>>;
}

// Default models for each provider
export const DEFAULT_MODELS: Record<LLMProviderType, string[]> = {
    openai: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-4o'],
    anthropic: [
        'claude-opus-4-8',
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
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
