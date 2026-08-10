# Deckium App

This directory contains the Electron application for Deckium.

## Quick Start

See the main [README.md](../README.md) in the project root for setup instructions.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Package for distribution
npm run package
```

## Configuration

The app runs without a Deckium backend or account. AI requests go directly to
the LLM provider configured by the user.

To configure your LLM provider:
- Go to **Edit > LLM Settings...**
- Or press **Cmd+,** (Mac) / **Ctrl+,** (Windows/Linux)

For detailed setup and privacy information, see the main
[README.md](../README.md).

## Architecture

See [../README.md](../README.md) for architecture details and project structure.
