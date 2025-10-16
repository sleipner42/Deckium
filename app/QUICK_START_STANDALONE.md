# Quick Start: Standalone Mode

## Step 1: Enable Standalone Mode

Create a `.env` file in the `/app` directory:

```bash
STANDALONE_MODE=true
```

## Step 2: Start the Application

```bash
npm start
```

## Step 3: Configure Your LLM Provider

The app will start without requiring login. You now need to configure your LLM provider:

### Option A: Via Settings Dialog (Recommended)

1. The app will load, but AI features won't work until you configure an LLM provider
2. Access the settings dialog (we need to add a menu item or button for this - see below)
3. Select your provider and enter your API key
4. Click Save

### Option B: Manually Edit Settings File

1. Locate your user data directory:
   - **Linux**: `~/.config/Deckium/`
   - **macOS**: `~/Library/Application Support/Deckium/`
   - **Windows**: `%APPDATA%\Deckium\`

2. Create a file named `llm-settings.json` with this content:

```json
{
  "currentProvider": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "YOUR_API_KEY_HERE"
  },
  "providers": {
    "openai": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "apiKey": "YOUR_API_KEY_HERE"
    }
  }
}
```

3. Replace `YOUR_API_KEY_HERE` with your actual OpenAI API key

4. Restart the application

## Getting API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy and paste it into the settings

### Anthropic
1. Go to https://console.anthropic.com/
2. Navigate to API Keys
3. Create a new key
4. Copy and paste it into the settings

### Google AI
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy and paste it into the settings

### Ollama (Free, Local)
1. Install Ollama from https://ollama.ai/
2. Run: `ollama pull llama3.2`
3. In settings, use:
   - Endpoint: `http://localhost:11434`
   - Model: `llama3.2`
   - No API key needed!

## Accessing Settings

**TODO**: We need to add a menu item or settings button to open the LLM Settings Dialog.

Temporary workaround - you can manually edit the settings file as described in Option B above.

## Troubleshooting

### "No handler registered" errors
- Make sure `STANDALONE_MODE=true` is set in your `.env` file
- Restart the application after changing the `.env` file

### AI not responding
- Check that you've configured a provider in settings
- Verify your API key is correct
- Check the console for error messages

### Connection errors with Ollama
- Make sure Ollama is running: `ollama serve`
- Verify the endpoint is correct (default: `http://localhost:11434`)
- Ensure you've downloaded the model you're trying to use
