# Quick Start: Standalone Mode

**Note:** Standalone mode is now the **default mode**. The app runs without requiring a backend or authentication.

## Step 1: Verify Standalone Mode (Optional)

Standalone mode is enabled by default. If you have a `.env` file in the `/app` directory, verify it contains:

```bash
STANDALONE_MODE=true
```

If you don't have a `.env` file, the app will use standalone mode by default.

## Step 2: Start the Application

```bash
npm start
```

## Step 3: Configure Your LLM Provider

The app will start without requiring login. You now need to configure your LLM provider:

### Option A: Via Settings Dialog (Recommended)

1. Open the app
2. Go to **Edit > LLM Settings...** (or press **Cmd+,** on Mac / **Ctrl+,** on Windows/Linux)
3. Select your provider (OpenAI, Anthropic, Google AI, Azure OpenAI, or Ollama)
4. Enter your API key and choose a model
5. Click **Save**

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

You can access LLM settings at any time:
- **Menu**: Edit > LLM Settings...
- **Keyboard shortcut**:
  - Mac: **Cmd+,**
  - Windows/Linux: **Ctrl+,**

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
