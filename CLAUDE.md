# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This project consists of two main components:

1. **Electron React Frontend** (`/app`): A desktop application using Electron and React for a presentation tool with AI capabilities.
2. **FastAPI Backend** (`/backend`): A Python backend providing API services.

## Commands

### Frontend (Electron React App)

```bash
# Installation
cd app
npm install

# Development
npm start             # Start the app in development mode
npm run check         # Check linting and formatting
npm run check:fix     # Auto-fix linting and formatting issues
npm test              # Run tests

# Building and Packaging
npm run build         # Build the app (main and renderer)
npm run package       # Package the app for the local platform
```

### Backend (FastAPI)

```bash
# Installation
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Development
uvicorn app.main:app --reload  # Start the server with hot reload
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

The app integrates with OpenAI/Azure OpenAI for AI capabilities:

1. **AI Service** (`/app/src/main/ai/service.ts`):
   - Manages AI conversations using threads
   - Processes AI responses and tool calls
   - Uses streaming for real-time responses

2. **AI Tools** (`/app/src/main/ai/tools/`):
   - Tool system for AI to manipulate presentations
   - Each tool has a specific purpose (e.g., creating slides, updating elements)

### Presentation System

1. **Presentation Service** (`/app/src/main/presentation/service.ts`):
   - Manages the current presentation state
   - Provides operations for slides and elements

2. **State Management**:
   - Uses a state pattern with event broadcasting for updates
   - Changes are propagated to all windows/views

### Backend Architecture

The FastAPI backend provides:

1. **API Routes** (`/backend/app/api/`):
   - REST endpoints organized by domain
   - Authentication using Google OAuth

2. **Data Access** (`/backend/app/repositories/`):
   - Repository pattern for data access
   - SQLite used for storage

## Running Modes

The application supports two modes of operation:

### 1. Backend Mode (Default)
- Requires authentication via Google OAuth
- Uses hosted backend for AI requests
- Backend manages API keys and billing
- Set `STANDALONE_MODE=false` in `.env` (or omit the variable)

### 2. Standalone Mode (Open Source)
- No backend or authentication required
- Users provide their own LLM API keys
- All data stays local
- Set `STANDALONE_MODE=true` in `.env`

## Standalone Mode Configuration

### Environment Setup

Create a `.env` file in `/app` with:

```bash
# Enable standalone mode (no backend required)
STANDALONE_MODE=true

# Optional: Logging configuration
LOG_ENABLED=false
AI_LOGGING_ENABLED=false
LOG_LEVEL=info
```

### Supported LLM Providers

When running in standalone mode, users can configure any of these providers:

1. **OpenAI**
   - Requires: API Key
   - Models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
   - Get API key: https://platform.openai.com/api-keys

2. **Anthropic**
   - Requires: API Key
   - Models: claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus
   - Get API key: https://console.anthropic.com/

3. **Azure OpenAI**
   - Requires: API Key, Endpoint, Deployment Name
   - Models: Configured in your Azure deployment
   - Setup: https://portal.azure.com/

4. **Google AI**
   - Requires: API Key
   - Models: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash
   - Get API key: https://makersuite.google.com/app/apikey

5. **Ollama (Local)**
   - Requires: Local Ollama installation and endpoint
   - Models: llama3.2, llama3.1, mistral, phi3, codellama
   - Default endpoint: http://localhost:11434
   - Setup: https://ollama.ai/

### User Configuration

In standalone mode, users configure their LLM provider through:

1. **Settings Dialog** (recommended for end-users):
   - Access via application menu or keyboard shortcut
   - Visual interface for selecting provider and entering credentials
   - Component: `/app/src/renderer/application/components/common/LLMSettingsDialog.tsx`

2. **Settings File** (stored automatically):
   - Located at: `{userData}/llm-settings.json`
   - Contains provider configurations and API keys
   - Managed by: `/app/src/main/settings/llm-settings-service.ts`

### Architecture Changes for Standalone Mode

**Main Process** (`/app/src/main/main.ts`):
```typescript
// Detects STANDALONE_MODE from environment
// If true: initializes MultiProviderAIServiceFactory with user's LLM settings
// If false: initializes BackendAIServiceFactory with authentication
```

**Multi-Provider Service** (`/app/src/main/ai/external/multi-provider-ai-service.ts`):
- Implements `IAIService` interface for all supported providers
- Handles provider-specific message formatting and streaming
- Services: OpenAIService, AnthropicService, GoogleAIService, OllamaService, StandaloneAzureOpenAIService

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

1. For AI features in **Backend Mode**:
   - Backend handles all LLM communication
   - Requires authentication to hosted service
   - See backend setup in `/backend` directory

2. For AI features in **Standalone Mode**:
   - Users provide their own API keys via settings dialog
   - All LLM communication happens directly from the app
   - No authentication or backend required

3. The project uses a tool-based approach for AI:
   - AI responses can trigger tools that modify the presentation
   - Tool system works identically in both modes
   - See `app/src/main/ai/tools/tools.ts` for tool execution

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
   - When multiple elements are selected, dragging any element moves the entire group
   - **Smart Snapping**: Only the dragged element snaps to alignment guides
   - **Relative Positioning**: Other elements maintain their relative positions to the dragged element
   - **Implementation**: Located in element components (`/app/src/renderer/application/components/presentation/elements/`)

3. **Supported Elements**:
   - ✅ ShapeElement (rectangles, circles, triangles)
   - ✅ TextElement (text boxes with rich editing)
   - ✅ ImageElement (embedded images)
   - 🔄 PlotElement and BarChartElement (partial support)

4. **Technical Implementation**:
   - Primary element receives snap calculations via `calculateSnapPosition()`
   - Secondary elements receive the same delta movement without individual snapping
   - Coordinated through `handleMultiElementUpdate()` in SlideRenderer
   - State managed via `selectedElementIds[]` in PresentationContext

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