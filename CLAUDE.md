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
npm run lint          # Run linting
npm run lint:fix      # Run linting with auto-fix
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

## Development Notes

1. For AI features, you need to set up OpenAI/Azure OpenAI credentials:
   - Create a `.env` file in the `/app` directory with appropriate API keys
   - See Azure OpenAI Service integration in `app/src/main/ai/external/azure-openai-service.ts`

2. The project uses a tool-based approach for AI:
   - AI responses can trigger tools that modify the presentation
   - See `app/src/main/ai/tools/tools.ts` for tool execution

3. The frontend and backend are separate applications:
   - They can be developed and run independently
   - The backend is not strictly required for basic app functionality