# Standalone Mode Setup Guide

This guide explains how to run Deckium in standalone mode without requiring a backend server or authentication.

## What is Standalone Mode?

Standalone mode allows you to use Deckium completely independently by:
- Providing your own LLM API keys directly in the app
- Eliminating the need for backend authentication
- Keeping all data local on your machine
- Supporting multiple LLM providers (OpenAI, Anthropic, Google AI, Ollama, Azure OpenAI)

## Quick Start

### 1. Enable Standalone Mode

Create or edit the `.env` file in the `/app` directory:

```bash
STANDALONE_MODE=true
```

### 2. Install Dependencies

```bash
cd app
npm install
```

### 3. Run the Application

```bash
npm start
```

### 4. Configure Your LLM Provider

On first launch in standalone mode, you'll need to configure your LLM provider:

1. Open the application
2. Access LLM Settings (via menu or settings button)
3. Select your preferred provider
4. Enter your API credentials
5. Save settings

## Supported Providers

### OpenAI

**What you need:**
- OpenAI API Key

**How to get it:**
1. Create an account at https://platform.openai.com
2. Navigate to https://platform.openai.com/api-keys
3. Click "Create new secret key"
4. Copy the key and paste it into Deckium settings

**Available models:**
- gpt-4o (recommended)
- gpt-4o-mini (faster, cheaper)
- gpt-4-turbo
- gpt-3.5-turbo

---

### Anthropic Claude

**What you need:**
- Anthropic API Key

**How to get it:**
1. Create an account at https://console.anthropic.com
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key and paste it into Deckium settings

**Available models:**
- claude-3-5-sonnet-20241022 (recommended)
- claude-3-5-haiku-20241022 (faster)
- claude-3-opus-20240229

---

### Azure OpenAI

**What you need:**
- Azure OpenAI API Key
- Azure OpenAI Endpoint URL
- Deployment Name

**How to get it:**
1. Create an Azure account at https://portal.azure.com
2. Create an Azure OpenAI resource
3. Deploy a model (e.g., gpt-4o)
4. Get your endpoint and API key from the Azure portal
5. Enter all three values in Deckium settings

**Example configuration:**
```
API Key: abc123...
Endpoint: https://your-resource.openai.azure.com/
Deployment: your-deployment-name
```

---

### Google AI (Gemini)

**What you need:**
- Google AI API Key

**How to get it:**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and paste it into Deckium settings

**Available models:**
- gemini-2.0-flash-exp (recommended, experimental)
- gemini-1.5-pro
- gemini-1.5-flash

---

### Ollama (Local Models)

**What you need:**
- Ollama installed locally
- At least one model downloaded

**How to set up:**
1. Install Ollama from https://ollama.ai/
2. Download a model: `ollama pull llama3.2`
3. Start Ollama (usually runs automatically)
4. In Deckium, use endpoint: `http://localhost:11434`
5. Enter the model name (e.g., `llama3.2`)

**Available models:**
- llama3.2 (recommended)
- llama3.1
- mistral
- phi3
- codellama
- Many more at https://ollama.ai/library

**Benefits:**
- Completely free
- Works offline
- Full privacy (data never leaves your machine)

## Configuration Files

### Environment File
Location: `/app/.env`

```bash
# Required for standalone mode
STANDALONE_MODE=true

# Optional: Logging
LOG_ENABLED=false
AI_LOGGING_ENABLED=false
LOG_LEVEL=info
```

### Settings File
Location: `{AppData}/Deckium/llm-settings.json` (managed automatically)

This file stores your provider configuration and API keys locally. It's created automatically when you save settings through the UI.

**Example structure:**
```json
{
  "currentProvider": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "sk-..."
  },
  "providers": {
    "openai": { "provider": "openai", "model": "gpt-4o-mini", "apiKey": "sk-..." },
    "anthropic": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
    "azure-openai": { "provider": "azure-openai", "deployment": "gpt-4o" },
    "google": { "provider": "google", "model": "gemini-2.0-flash-exp" },
    "ollama": { "provider": "ollama", "model": "llama3.2", "endpoint": "http://localhost:11434" }
  }
}
```

## Building for Distribution

To build a standalone version for distribution:

```bash
cd app
npm run build
npm run package
```

The packaged application will include standalone mode by default if `STANDALONE_MODE=true` is set in `.env` before building.

## Switching Between Modes

You can switch between standalone and backend modes by changing the `STANDALONE_MODE` variable:

**Backend Mode** (requires authentication):
```bash
STANDALONE_MODE=false
# or remove the line entirely
```

**Standalone Mode** (no backend required):
```bash
STANDALONE_MODE=true
```

After changing modes, restart the application for changes to take effect.

## Troubleshooting

### "API Key is required" error
- Ensure you've entered your API key in the settings dialog
- Check that the key doesn't have extra spaces or characters
- Verify the key is valid by testing it with the provider's API directly

### "Failed to connect" with Ollama
- Ensure Ollama is running (`ollama serve`)
- Check that the endpoint is correct (default: http://localhost:11434)
- Verify you've downloaded the model you're trying to use

### Settings not saving
- Check that the app has write permissions to the user data directory
- On Linux: `~/.config/Deckium/`
- On macOS: `~/Library/Application Support/Deckium/`
- On Windows: `%APPDATA%\Deckium\`

### Model not responding
- Check your API key is valid and has sufficient credits/quota
- Verify network connectivity for cloud providers
- For Ollama, ensure the model is fully downloaded

## Security Notes

- API keys are stored locally in plain text in the settings file
- Never commit `.env` or settings files to version control
- Consider using environment variables for API keys in production
- Keep your API keys secure and never share them
- Regularly rotate your API keys for security

## Cost Considerations

When using cloud providers in standalone mode:
- **You pay directly** for API usage based on your provider's pricing
- Monitor your usage through your provider's dashboard
- Set up billing alerts to avoid unexpected charges
- Consider using cheaper models (e.g., gpt-4o-mini) for development

For cost-free options:
- Use Ollama with local models (completely free)
- Many providers offer free tier/credits for testing

## Support

For issues specific to standalone mode:
1. Check this documentation first
2. Verify your configuration in the settings file
3. Check the application logs (if LOG_ENABLED=true)
4. Open an issue on GitHub with details about your setup

For provider-specific API issues:
- Contact the respective provider's support
- Check their status pages for outages
- Verify your API usage limits
