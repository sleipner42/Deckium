# Contributing to Deckium

Thanks for helping improve Deckium.

## Development setup

Deckium requires Node.js 20 or newer and npm. From the repository root:

```bash
cd app
npm ci
npm start
```

Before opening a pull request, run:

```bash
npm run check
npm run typecheck
npm test -- --runInBand
npm run build
```

Keep pull requests focused, describe user-visible behavior changes, and add or
update tests for changed behavior. Never commit API keys, local settings,
presentation data, logs, signing material, or generated release artifacts.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
