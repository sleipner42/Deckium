# Deckium

**AI-powered presentation software with human control.**

Deckium is an open-source desktop application that helps you create professional presentations using AI assistance. Built with Electron and React, it runs completely standalone on your machine.

![Deckium](./assets/deckium-banner.png)

## ✨ Features

- **AI-Powered Slide Creation**: Use natural language to create and edit slides
- **Multiple LLM Support**: Works with OpenAI, Anthropic, Google AI, Azure OpenAI, and Ollama
- **Professional Design Tools**: Built-in linting, alignment guides, and design best practices
- **Rich Content**: Support for text, shapes, images, charts, and more
- **Export Options**: Export to PDF or PowerPoint
- **Standalone Mode**: No backend required - runs entirely on your machine
- **Privacy-Focused**: Your presentations and API keys stay on your computer

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- An API key from one of the supported LLM providers (or use Ollama for free local AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:sleipner42/kraftpo-ng.git
   cd kraftpo-ng
   ```

2. **Install dependencies**
   ```bash
   cd app
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Configure your LLM provider**
   - Open the app
   - Go to **Edit > LLM Settings...** (or press **Cmd+,** / **Ctrl+,**)
   - Select your provider and enter your API key
   - Click **Save**

That's it! You're ready to create presentations.

## 🔧 Configuration

### Supported LLM Providers

#### OpenAI
- Models: GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- Get API key: https://platform.openai.com/api-keys

#### Anthropic (Claude)
- Models: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- Get API key: https://console.anthropic.com/

#### Google AI (Gemini)
- Models: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- Get API key: https://makersuite.google.com/app/apikey

#### Azure OpenAI
- Requires: Endpoint, API key, deployment name, API version
- Setup: https://azure.microsoft.com/en-us/products/ai-services/openai-service

#### Ollama (Free, Local)
- Models: Llama 3.2, Llama 3.1, Mistral, Phi3, CodeLlama
- Install: https://ollama.ai/
- No API key needed!

### Settings File Location

Settings are stored locally at:
- **Linux**: `~/.config/Deckium/llm-settings.json`
- **macOS**: `~/Library/Application Support/Deckium/llm-settings.json`
- **Windows**: `%APPDATA%\Deckium\llm-settings.json`

## 📖 Usage

### Creating Slides

1. Start a conversation with the AI assistant
2. Describe what you want: "Create a title slide for my company presentation"
3. The AI will create and design slides based on your instructions
4. Continue refining with natural language commands

### Keyboard Shortcuts

- **Cmd/Ctrl + S**: Save presentation
- **Cmd/Ctrl + O**: Open presentation
- **Cmd/Ctrl + E**: Export to PDF
- **Cmd/Ctrl + ,**: Open LLM Settings
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Y**: Redo

### Exporting

- **PDF Export**: File > Export to PDF...
- **PowerPoint Export**: File > Export to PowerPoint...
- **Import PowerPoint**: File > Import PowerPoint...

## 🏗️ Architecture

### Project Structure

```
deckium/
├── app/                        # Electron React application
│   ├── src/
│   │   ├── main/               # Electron main process
│   │   │   ├── ai/             # AI service and tool system
│   │   │   ├── presentation/   # Presentation management
│   │   │   ├── settings/       # LLM settings service
│   │   │   └── main.ts         # Application entry point
│   │   ├── renderer/           # React frontend
│   │   │   └── application/
│   │   │       ├── components/ # UI components
│   │   │       ├── context/    # React contexts
│   │   │       └── hooks/      # Custom hooks
│   │   └── common/             # Shared code
│   └── package.json
└── backend/                    # FastAPI backend (optional)
```

### AI Integration

The AI system uses a tool-based architecture:
1. AI assistant receives presentation context and user request
2. AI calls tools to manipulate the presentation (e.g., `createSlide`, `addTextElement`)
3. Tools execute and return results
4. Process continues until task is complete

The system includes automatic linting and validation to ensure high-quality output.

## 🛠️ Development

### Running in Development Mode

```bash
cd app
npm start
```

This starts the app with hot reload enabled.

### Building

```bash
# Build for production
npm run build

# Package for distribution
npm run package
```

### Linting and Formatting

```bash
# Check code quality
npm run check

# Auto-fix issues
npm run check:fix
```

## 🔒 Privacy & Security

- **Local-First**: All presentations stored on your machine
- **API Keys**: Stored locally, never sent to any backend
- **No Tracking**: No analytics or telemetry
- **Open Source**: Full transparency, audit the code yourself

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built from [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)
