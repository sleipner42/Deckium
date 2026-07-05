import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import type {
    LLMProviderConfig,
    LLMProviderType,
} from '../../../../common/domain/interfaces/llm-provider';
import {
    DEFAULT_MODELS,
    OPENAI_REASONING_EFFORTS,
    PROVIDER_DISPLAY_NAMES,
    WEB_SEARCH_PROVIDERS,
} from '../../../../common/domain/interfaces/llm-provider';

interface Props {
    open: boolean;
    onClose: () => void;
}

const LLMSettingsDialog: React.FC<Props> = ({ open, onClose }) => {
    const [currentProvider, setCurrentProvider] =
        useState<LLMProviderType>('openai');
    const [config, setConfig] = useState<Partial<LLMProviderConfig>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    const loadSettings = async () => {
        try {
            const current =
                await window.electron.llmSettings.getCurrentProvider();
            setCurrentProvider(current.provider);
            setConfig(current);
        } catch (err) {
            setError('Failed to load settings');
            console.error(err);
        }
    };

    const handleProviderChange = async (provider: LLMProviderType) => {
        setCurrentProvider(provider);
        try {
            const providerConfig =
                await window.electron.llmSettings.getProviderSettings(provider);
            setConfig({ ...providerConfig, provider });
        } catch (err) {
            console.error('Failed to load provider settings:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const fullConfig: LLMProviderConfig = {
                provider: currentProvider,
                model: config.model || DEFAULT_MODELS[currentProvider][0],
                endpoint: config.endpoint,
                deployment: config.deployment,
                apiVersion: config.apiVersion,
                // Empty string = "Auto"; send undefined so the model default is used.
                reasoningEffort: config.reasoningEffort || undefined,
                // Only meaningful for WEB_SEARCH_PROVIDERS; ignored elsewhere.
                webSearchEnabled: config.webSearchEnabled || undefined,
            };

            // Only send a key when the user actually entered one; an empty
            // field leaves the stored (encrypted) key untouched in main.
            if (config.apiKey && config.apiKey.trim() !== '') {
                fullConfig.apiKey = config.apiKey;
            }

            await window.electron.llmSettings.setCurrentProvider(fullConfig);
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to save settings',
            );
        } finally {
            setSaving(false);
        }
    };

    const renderProviderFields = () => {
        switch (currentProvider) {
            case 'openai':
            case 'anthropic':
            case 'google':
                return (
                    <>
                        <TextField
                            fullWidth
                            label="API Key"
                            type="password"
                            value={config.apiKey || ''}
                            onChange={(e) =>
                                setConfig({ ...config, apiKey: e.target.value })
                            }
                            margin="normal"
                            required={!config.hasApiKey}
                            placeholder={
                                config.hasApiKey
                                    ? '•••••••• (saved — leave blank to keep)'
                                    : undefined
                            }
                            helperText={
                                config.hasApiKey
                                    ? 'A key is saved. Enter a new key to replace it.'
                                    : undefined
                            }
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Model</InputLabel>
                            <Select
                                value={
                                    config.model ||
                                    DEFAULT_MODELS[currentProvider][0]
                                }
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        model: e.target.value,
                                    })
                                }
                            >
                                {DEFAULT_MODELS[currentProvider].map(
                                    (model) => (
                                        <MenuItem key={model} value={model}>
                                            {model}
                                        </MenuItem>
                                    ),
                                )}
                            </Select>
                        </FormControl>
                        {currentProvider === 'openai' && (
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Reasoning Effort</InputLabel>
                                <Select
                                    label="Reasoning Effort"
                                    value={config.reasoningEffort || ''}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            reasoningEffort: e.target.value,
                                        })
                                    }
                                >
                                    <MenuItem value="">
                                        Auto (model default)
                                    </MenuItem>
                                    {OPENAI_REASONING_EFFORTS.map((effort) => (
                                        <MenuItem key={effort} value={effort}>
                                            {effort}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    Only some values are valid per model; leave
                                    on Auto if unsure.
                                </FormHelperText>
                            </FormControl>
                        )}
                    </>
                );

            case 'azure-openai':
                return (
                    <>
                        <TextField
                            fullWidth
                            label="API Key"
                            type="password"
                            value={config.apiKey || ''}
                            onChange={(e) =>
                                setConfig({ ...config, apiKey: e.target.value })
                            }
                            margin="normal"
                            required={!config.hasApiKey}
                            placeholder={
                                config.hasApiKey
                                    ? '•••••••• (saved — leave blank to keep)'
                                    : undefined
                            }
                            helperText={
                                config.hasApiKey
                                    ? 'A key is saved. Enter a new key to replace it.'
                                    : undefined
                            }
                        />
                        <TextField
                            fullWidth
                            label="Endpoint"
                            value={config.endpoint || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    endpoint: e.target.value,
                                })
                            }
                            margin="normal"
                            required
                            placeholder="https://your-resource.openai.azure.com/"
                        />
                        <TextField
                            fullWidth
                            label="Deployment Name"
                            value={config.deployment || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    deployment: e.target.value,
                                })
                            }
                            margin="normal"
                            required
                        />
                    </>
                );

            case 'ollama':
                return (
                    <>
                        <TextField
                            fullWidth
                            label="Endpoint"
                            value={config.endpoint || 'http://localhost:11434'}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    endpoint: e.target.value,
                                })
                            }
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Model Name"
                            value={config.model || 'llama3.2'}
                            onChange={(e) =>
                                setConfig({ ...config, model: e.target.value })
                            }
                            margin="normal"
                            required
                        />
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>LLM Provider Settings</DialogTitle>
            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs
                        value={currentProvider}
                        onChange={(_, value) => handleProviderChange(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {(
                            Object.keys(
                                PROVIDER_DISPLAY_NAMES,
                            ) as LLMProviderType[]
                        ).map((provider) => (
                            <Tab
                                key={provider}
                                label={PROVIDER_DISPLAY_NAMES[provider]}
                                value={provider}
                            />
                        ))}
                    </Tabs>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Settings saved successfully!
                    </Alert>
                )}

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                >
                    Configure your {PROVIDER_DISPLAY_NAMES[currentProvider]}{' '}
                    settings below. These settings are stored locally and never
                    sent to a backend server.
                </Typography>

                {renderProviderFields()}

                {WEB_SEARCH_PROVIDERS.includes(currentProvider) && (
                    <FormControl fullWidth margin="normal">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!!config.webSearchEnabled}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            webSearchEnabled: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Enable native web search"
                        />
                        <FormHelperText>
                            Lets the model search the web using{' '}
                            {PROVIDER_DISPLAY_NAMES[currentProvider]}'s built-in
                            search. The provider bills each search.
                        </FormHelperText>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LLMSettingsDialog;
