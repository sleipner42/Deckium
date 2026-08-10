# Deckium

**AI-powered presentation software with human control.**

Deckium is a desktop application that helps you create professional presentations using AI assistance. Built with Electron and React, it runs without a Deckium-hosted backend or account: you bring your own LLM API key and choose which provider receives your AI requests.

## ✨ Features

- **AI-Powered Slide Creation**: Describe what you want in natural language; the agent builds and refines slides through a tool-based editing loop
- **Provider-Agnostic AI**: Built on the [Vercel AI SDK](https://ai-sdk.dev) — works with OpenAI, Anthropic, Google AI, Azure OpenAI, and Ollama
- **Design System Built In**: Compound components (cards, stat cards, header bars, takeaway bars, tables), automatic layout linting, text-density checks, and visual review keep AI output looking professional
- **Full Editor**: Rich text (Quill), shapes, lines, images, SVG, bar charts and plots — with multi-select, group dragging, alignment guides, and smart snapping
- **AI Extras**: Optional provider-native web search, image generation, data fetching from URLs, and slide screenshots for the agent's own visual review
- **Import & Export**: PowerPoint import/export (full round-trip) and high-quality PDF export with real, selectable text
- **Privacy-Focused**: No Deckium backend, account, or telemetry; files stay local and AI requests go directly to the provider you configure

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- An API key from one of the supported LLM providers (or use Ollama for free local AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sleipner42/Deckium.git
   cd Deckium
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
   - Go to **Edit > LLM Settings...** (or press **Cmd+,** / **Ctrl+,**)
   - Select your provider, model, and enter your API key
   - Click **Save**

That's it! You're ready to create presentations.

## 🔧 Configuration

### Supported LLM Providers

#### OpenAI
- Models: GPT-5.5, GPT-5.5 Pro, GPT-5.1, GPT-5, GPT-4.1, GPT-4o
- Supports configurable reasoning effort on reasoning models
- Get API key: https://platform.openai.com/api-keys

#### Anthropic (Claude)
- Models: Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5, Claude 3.5 Sonnet/Haiku
- Get API key: https://console.anthropic.com/

#### Google AI (Gemini)
- Models: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- Get API key: https://aistudio.google.com/apikey

#### Azure OpenAI
- Requires: Endpoint, API key, deployment name, API version
- Setup: https://azure.microsoft.com/en-us/products/ai-services/openai-service

#### Ollama (Free, Local)
- Models: Llama 3.2, Llama 3.1, Mistral, Phi3, CodeLlama
- Install: https://ollama.com/
- No API key needed!

> **Web search**: OpenAI, Anthropic, and Google support the provider's native web search tool. It's off by default (each search is billed by the provider) and can be enabled per provider in LLM Settings.

### Settings File Location

Settings are stored locally at:
- **Linux**: `~/.config/Deckium/llm-settings.json`
- **macOS**: `~/Library/Application Support/Deckium/llm-settings.json`
- **Windows**: `%APPDATA%\Deckium\llm-settings.json`

## 📖 Usage

### Creating Slides

1. Start a conversation with the AI assistant
2. Describe what you want: "Create a title slide for my company presentation"
3. The AI creates and designs slides, checking its own work against layout linting and visual review
4. Continue refining with natural language — or edit anything directly by hand; the agent sees your manual changes on its next turn

### Keyboard Shortcuts

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Open presentation | Cmd+O | Ctrl+O |
| Save | Cmd+S | Ctrl+S |
| Save As | Cmd+Shift+S | Ctrl+Shift+S |
| Export to PDF | Cmd+E | Ctrl+E |
| Export to PowerPoint | Cmd+Shift+E | Ctrl+Shift+E |
| LLM Settings | Cmd+, | Ctrl+, |
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Shift+Z | Ctrl+Y |

### Import & Export

- **PDF Export**: File > Export to PDF... — real text (not images) with accurate positioning
- **PowerPoint Export**: File > Export to PowerPoint...
- **PowerPoint Import**: File > Import PowerPoint...

## 🏗️ Architecture

### Project Structure

```
Deckium/
├── app/                        # Electron React application (the product)
│   ├── src/
│   │   ├── main/               # Electron main process
│   │   │   ├── ai/             # AI service, provider adapters, tool system
│   │   │   ├── presentation/   # Presentation state and operations
│   │   │   ├── powerpoint/     # PPTX import/export
│   │   │   ├── pdf-export/     # PDF export service
│   │   │   ├── settings/       # LLM settings service
│   │   │   └── main.ts         # Application entry point
│   │   ├── renderer/           # React frontend (editor UI)
│   │   └── common/             # Types and config shared by both processes
│   ├── e2e/                    # Playwright end-to-end tests
│   └── package.json
└── LICENSE
```

### AI Integration

The AI system uses a tool-based agent loop (Vercel AI SDK `streamText`):

1. The assistant receives the presentation context, the current slide, and a diff of any manual edits you made since its last turn
2. It calls tools to manipulate the presentation — creating slides, adding elements, building compound components like cards and stat rows, aligning and distributing, generating images, fetching data
3. After each edit, the tool result includes a slide grid and linting feedback so the model can catch and fix layout problems itself
4. Conversation history (including tool calls and reasoning) is persisted per thread, so multi-turn sessions stay coherent and provider prompt caching stays warm

Agent-produced HTML is sanitized against a single shared formatting config, which also drives the editor's Quill setup and the PPTX converter — so what the AI writes, what you edit, and what exports are always in sync.

## 🛠️ Development

All commands run from the `app/` directory.

```bash
npm start             # Development mode with hot reload
npm run typecheck     # Type-check (tsc --noEmit)
npm run check         # Lint + format check (Biome)
npm run check:fix     # Auto-fix lint and formatting issues
npm run build         # Production build (main + renderer)
npm run package       # Package for the local platform
```

### Testing

```bash
npm test              # Unit/integration tests (Jest, jsdom)
npm run test:e2e      # End-to-end tests (Playwright drives the built Electron app)
npm run test:e2e:only # E2E without rebuilding (when the build is current)
npm run test:pptx-e2e # PowerPoint export → import round-trip
```

The E2E suite launches the packaged app with an isolated user-data directory and drives the real renderer, covering editor mounting, drag/resize behavior at measured zoom, and the editing lock. See `CLAUDE.md` for more detail on the test layers.

### Code Quality

The project uses **Biome** for linting and formatting (configured in `app/biome.json`). Recommended before committing:

```bash
npm run check:fix && npm run typecheck
```

## 🔒 Privacy & Security

- **Local-First Storage**: Presentation files and application state are stored on your machine
- **Direct API Calls**: Prompts and relevant presentation context, including slide data or screenshots when requested by the agent, are sent directly to your configured LLM provider — there is no Deckium intermediary
- **API Keys**: Keys are encrypted at rest with Electron `safeStorage` when the operating system provides a secure backend; systems without one fall back to local plaintext storage with a warning. Keys are sent only to the provider they configure
- **Optional Network Tools**: Web search, image generation, URL data fetching, and logo lookup contact their respective external services only when used
- **No Tracking**: No analytics or telemetry
- **Hardened Tooling**: Agent HTML is sanitized before storage, and URL-fetching tools are SSRF-guarded

See [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [conventional commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built from [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)
- AI layer powered by the [Vercel AI SDK](https://ai-sdk.dev)
