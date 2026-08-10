# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

The project is a single component: an **Electron React desktop app** (`/app`) — a presentation tool with AI capabilities. (An earlier hosted FastAPI backend and marketing landing page have been removed from the repo.)

## Commands

### Frontend (Electron React App)

```bash
# Installation
cd app
npm install

# Development
npm start             # Start the app in development mode
npm run typecheck     # Type-check without emitting (tsc --noEmit)
npm run check         # Check linting and formatting (Biome)
npm run check:fix     # Auto-fix linting and formatting issues

# Testing (see the Testing section for details)
npm test              # Unit/integration tests (Jest, jsdom)
npm run test:e2e      # End-to-end tests (Playwright drives the built Electron app)

# Building and Packaging
npm run build         # Build the app (main and renderer)
npm run package       # Package the app for the local platform
```

## Architecture Overview

### Frontend Architecture

The Electron app follows a multi-process architecture:

1. **Main Process** (`/app/src/main/`):
   - `main.ts`: Entry point that sets up windows and services
   - `presentation/`: Manages presentation state and operations
   - `ai/`: Manages AI integration, tools, and services

2. **Renderer Process** (`/app/src/renderer/`):
   - React components for UI
   - Hooks for communicating with the main process
   - Context providers for state management

3. **Common** (`/app/src/common/`):
   - Shared types and interfaces used by both processes

### Communication Patterns

1. **IPC Communication**:
   - `ipc-handler.ts` files set up IPC channels between main and renderer
   - `useMainProcessAI.ts` and `useMainProcessPresentation.ts` hooks handle renderer-side communication

2. **Event System**:
   - Event bus pattern for internal communication within services
   - Used for broadcasting state changes

### AI Integration

The app is provider-agnostic, built on the **Vercel AI SDK** (`ai` + `@ai-sdk/*`). It supports OpenAI, Anthropic, Google, Azure OpenAI, and Ollama.

1. **AI Service** (`/app/src/main/ai/service.ts`):
   - Runs the agent loop with the SDK's `streamText` (real-time streaming, multi-step tool calls, step limit).
   - Persists each thread's full `response.messages` (model history) and replays them verbatim across turns, so tool calls/results and reasoning survive between user messages and provider prompt caching stays warm.
   - Injects a per-turn context block (current slide + a diff of manual user edits since the last turn — see `staleness.ts`) into the user message.

2. **Provider layer** (`/app/src/main/ai/external/`):
   - `providers.ts`: `resolveModel` / `providerOptions` per provider (the one place provider quirks live, e.g. OpenAI `store:false` + encrypted reasoning, Anthropic cache breakpoints).
   - `messages.ts`: maps internal messages to the SDK's `ModelMessage[]`.

3. **AI Tools** (`/app/src/main/ai/tools/`):
   - `ToolFactory.ts` registers the built-in tools; `tool-adapter.ts` (`buildToolSet`) exposes each tool's zod `inputSchema` + description to the model and runs it, appending a slide grid + linting feedback after edits.
   - Each tool extends `BaseTool` and lives in `tools/tools/*`. Shared helpers: `utils/schemas.ts` (positions/colors/font whitelist), `utils/errors.ts` (actionable not-found/wrong-type messages), `utils/html-sanitizer.ts` (validates agent text-box HTML against `common/config/text-formats.ts`), `utils/safe-fetch.ts` (SSRF guard for URL-fetching tools).

### Presentation System

1. **Presentation Service** (`/app/src/main/presentation/service.ts`):
   - Manages the current presentation state
   - Provides operations for slides and elements

2. **State Management**:
   - Uses a state pattern with event broadcasting for updates
   - Changes are propagated to all windows/views

## Running Modes

The app runs **standalone**: users provide their own LLM API keys, and there is
no Deckium backend or authentication. Presentation files stay local, while AI
requests send prompts and relevant presentation context directly to the
configured provider. Earlier versions had a hosted backend mode; that path has
been removed.

### Environment Setup

An `.env` file in `/app` is optional; relevant variables:

```bash
# Optional: Logging configuration
LOG_ENABLED=false
AI_LOGGING_ENABLED=false
LOG_LEVEL=info
```

### Supported LLM Providers

When running in standalone mode, users can configure any of these providers:

1. **OpenAI**
   - Requires: API Key
   - Models: gpt-5.5, gpt-5.5-pro, gpt-5.1, gpt-5, gpt-4.1, gpt-4o
   - Get API key: https://platform.openai.com/api-keys

2. **Anthropic**
   - Requires: API Key
   - Models: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001, claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
   - Get API key: https://console.anthropic.com/

3. **Azure OpenAI**
   - Requires: API Key, Endpoint, Deployment Name
   - Models: Configured in your Azure deployment
   - Setup: https://portal.azure.com/

4. **Google AI**
   - Requires: API Key
   - Models: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash
   - Get API key: https://aistudio.google.com/apikey

5. **Ollama (Local)**
   - Requires: Local Ollama installation and endpoint
   - Models: llama3.2, llama3.1, mistral, phi3, codellama
   - Default endpoint: http://localhost:11434
   - Setup: https://ollama.com/

### User Configuration

In standalone mode, users configure their LLM provider through:

1. **Settings Dialog** (recommended for end-users):
   - Access via application menu or keyboard shortcut
   - Visual interface for selecting provider and entering credentials
   - Component: `/app/src/renderer/application/components/common/LLMSettingsDialog.tsx`

2. **Settings File** (stored automatically):
   - Located at: `{userData}/llm-settings.json`
   - Contains provider configurations and API keys encrypted with Electron
     `safeStorage` when OS-backed encryption is available
   - Managed by: `/app/src/main/settings/llm-settings-service.ts`

### AI Provider Wiring

**Main Process** (`/app/src/main/main.ts`): constructs `AIService` with the
`LLMSettingsService` (user's configured provider/keys) — no branching on a
hosted-service flag.

**Provider resolution** (`/app/src/main/ai/external/providers.ts`): `resolveModel(config)`
returns a Vercel AI SDK `LanguageModel` for the selected provider, and
`providerOptionsFor(config)` supplies provider-specific options. Adding a
provider means adding one adapter here. (The old `multi-provider-ai-service.ts`
and its `IAIService`/factory classes have been removed.)

**Settings Management**:
- Service: `/app/src/main/settings/llm-settings-service.ts`
- IPC Handler: `/app/src/main/settings/ipc-handler.ts`
- Type Definitions: `/app/src/common/domain/interfaces/llm-provider.ts`

**IPC Channels** (preload.ts):
```typescript
// Available channels for renderer process:
- llm-settings:get-settings
- llm-settings:get-current-provider
- llm-settings:update-provider
- llm-settings:set-current-provider
- llm-settings:validate-current-provider
```

## Development Notes

1. LLM communication happens directly from the app using the user's configured
   provider/keys (settings dialog). No authentication or backend.

2. The project uses a tool-based approach for AI — AI responses can trigger
   tools that modify the presentation. Tools are registered in
   `app/src/main/ai/tools/ToolFactory.ts` and exposed/executed via
   `app/src/main/ai/tools/tool-adapter.ts` (`buildToolSet`).

## Code Quality and Formatting

The project uses **Biome** for linting and code formatting:

1. **Configuration**: Located in `/app/biome.json`
   - Linting rules with recommended defaults
   - Formatting with 4-space indentation
   - Single quotes for JavaScript, double quotes for JSX
   - Line width of 80 characters

2. **Available Scripts**:
   ```bash
   # Linting (code quality checks)
   npm run lint          # Check linting issues only
   npm run lint:fix      # Auto-fix linting issues
   
   # Formatting (code style)
   npm run format        # Format code and save changes
   npm run format:check  # Check formatting without changing files
   
   # Combined operations
   npm run check         # Check both linting and formatting
   npm run check:fix     # Fix both linting and formatting issues
   
   # Direct Biome commands (equivalent)
   biome check src/                 # Same as npm run lint
   biome check --write src/         # Same as npm run lint:fix
   biome format --write src/        # Same as npm run format
   biome format src/                # Same as npm run format:check
   ```

3. **Integration**: 
   - Biome replaces ESLint and Prettier for this project
   - Rules are configured to be strict but practical for development
   - Some TypeScript-specific rules are disabled for flexibility

4. **Recommended Workflow**:
   ```bash
   # Before committing code
   npm run check:fix     # Fix all linting and formatting issues
   npm run build         # Ensure code compiles successfully
   
   # For quick checks during development
   npm run check         # Check without modifying files
   ```

## User Interface Features

### Multi-Element Selection and Manipulation

The presentation editor supports advanced multi-element operations:

1. **Selection**:
   - **Single Click**: Select individual elements
   - **Ctrl+Click** (Cmd+Click on Mac): Toggle element selection for multi-selection
   - **Background Click**: Clear all selections
   - **Delete Key**: Delete all selected elements

2. **Multi-Element Dragging**:
   - When multiple elements are selected, dragging any element moves the entire group rigidly.
   - **Smart Snapping**: Only the dragged element snaps to alignment guides; the others move by the same delta.
   - **Shared implementation**: All element types use the `useDraggableElement` hook (`/app/src/renderer/application/hooks/useDraggableElement.ts`) — single/group drag, movement-threshold click-vs-drag, and listener handling live there, not duplicated per component.

3. **Supported Elements** (all use the shared drag hook and resize handles):
   - ✅ ShapeElement (rectangles, circles, triangles)
   - ✅ TextElement (rich text via Quill; see the Rich Text section)
   - ✅ ImageElement (raster + SVG)
   - ✅ BarChartElement and PlotElement (line/pie via Plotly)

4. **Coordinate system (important)**:
   - The slide is a fixed 1280×720 surface (`common/utils/constants.ts`); element positions/sizes are stored in these slide units, and `SlideView` renders the slide inside a `transform: scale(...)` to fit the window.
   - Mouse events arrive in screen pixels, so any drag/resize delta MUST be converted to slide units. `utils/coordinates.ts` is the single conversion boundary — it **measures the rendered scale from the DOM** (`getRenderedScale`) rather than threading a prop, so it can't drift from the CSS transform. Snapping (`snapEngine.ts`) and multi-element propagation (`handleMultiElementUpdate` in `SlideRenderer`) operate in slide units.

### Rich Text (text boxes)

Text-box content is HTML edited with **Quill** (`elements/TextElement.tsx`).
The allowed formatting is defined once in `common/config/text-formats.ts` and
enforced everywhere: the Quill `formats`/font attributor, the agent's content
documentation (`ai/tools/utils/html-content.ts`), the agent-HTML sanitizer
(`ai/tools/utils/html-sanitizer.ts`), and the PPTX import/export converter
(`main/powerpoint/rich-text.ts`) all derive from it. Agent-produced HTML is
sanitized before storage and any adjustments are reported back to the model.

### PDF Export System

The application includes a comprehensive PDF export system:

1. **Features**:
   - Export single slides or entire presentations
   - Preserves text as real text (not images) with accurate positioning
   - High-quality output using Electron's native PDF generation
   - PDF merging for multi-slide exports using pdf-lib

2. **Implementation**:
   - **Service**: `/app/src/main/pdf-export/service.ts`
   - **Hidden Window Rendering**: Uses off-screen window for slide capture
   - **Menu Integration**: File > Export to PDF (Ctrl+E / Cmd+E)
   - **Background Processing**: No UI disruption during export

3. **Technical Details**:
   - Uses `webContents.printToPDF()` for native PDF generation
   - Cycles through slides in hidden window only
   - Merges multiple PDFs using pdf-lib for seamless output
   - The agent can also trigger export via the `exportPresentationToPdf` tool (saves to Documents, returns the path).

## Testing

Three layers, each run separately:

### Unit / integration (Jest)
- `npm test` (or `npx jest <path>`). Environment is **jsdom**; **Quill is mocked** (`.erb/mocks/quillMock.js`), so text-editor internals aren't exercised here — drive those through the E2E suite instead.
- Test files live next to the code (`*.test.ts`) and under `src/__tests__/`.
- Heads-up: the full parallel `npm test` has run the machine out of memory before. When iterating, prefer targeted runs and `--runInBand` for large batches (e.g. `npx jest --runInBand src/main/ai src/__tests__/tools`).

### End-to-end (Playwright + Electron)
- `npm run test:e2e` builds the app then runs Playwright; `npm run test:e2e:only` skips the build (use when the build is already current). Config: `playwright.config.ts`; specs in `/app/e2e`.
- **Opt-in and not part of `npm test`** — it launches the *built* app and drives the real renderer over the DevTools Protocol, so it needs a display (headless via the machine's display/Xvfb).
- What it covers: `smoke` (editor mounts at the real measured zoom), `drag`/resize (element moves/grows by the cursor delta ÷ the DOM-measured scale — the regression guard for the zoom-scale bug), and `undo-lock` (manual edits blocked while the editing lock is held).
- Testability hooks (inert in normal runs, gated by env):
  - `E2E_PRELOAD_PATH` — lets the harness launch the built `main.js` directly with the correct preload (see `resolvePreloadPath` in `main.ts`).
  - `E2E_TEST_HOOKS` — enables an ipc channel (`e2e:set-editing-locked`) so a spec can force the editing lock without a live agent turn.
  - Each launch uses an **isolated `userData` dir**, so the persisted presentation can't leak between tests (`e2e/helpers.ts#launchApp`).
- Anything needing a *live* agent turn (real LLM + network) isn't covered here; that logic is unit-tested instead.

### PowerPoint round-trip
- `npm run test:pptx-e2e` (`scripts/pptx-roundtrip.cjs`) exercises the full PPTX export → import path.
