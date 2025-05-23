# Deckium Deployment Guide

This guide explains how to package, build, and deploy the Deckium Electron application using Electron Forge.

## Quick Start

1. **Setup deployment environment:**
   ```bash
   npm run deploy:setup
   ```

2. **Create distributables:**
   ```bash
   npm run deploy:make
   ```

3. **Publish to GitHub:**
   ```bash
   npm run deploy:publish
   ```

## Available Commands

### Development
- `npm start` - Start the application in development mode
- `npm run build` - Build the application for production
- `npm test` - Run tests

### Packaging & Distribution
- `npm run package` - Package the app (creates executable)
- `npm run make` - Create platform-specific distributables
- `npm run publish` - Publish to GitHub releases

### Deployment Scripts
- `npm run deploy:setup` - Initialize deployment configuration
- `npm run deploy:package` - Build and package the application
- `npm run deploy:make` - Build and create distributables
- `npm run deploy:publish` - Build and publish to GitHub

## Platform-Specific Builds

### macOS
**Outputs:**
- `.app` bundle (via Zip maker)
- `.dmg` installer (via DMG maker)

**Requirements for signing:**
- Apple Developer ID certificate
- App-specific password for notarization

### Windows
**Outputs:**
- `.exe` installer (via Squirrel maker)

**Requirements for signing:**
- Code signing certificate (.p12 file)

### Linux
**Outputs:**
- `.deb` package (Debian/Ubuntu)
- `.rpm` package (Red Hat/Fedora)

## Configuration

### Environment Setup

1. Run the setup command:
   ```bash
   npm run deploy:setup
   ```

2. Edit `.env.forge` file with your configuration:
   ```bash
   # Apple Code Signing (for macOS)
   APPLE_ID=your-apple-id@example.com
   APPLE_PASSWORD=your-app-specific-password
   APPLE_TEAM_ID=your-team-id

   # GitHub Publishing
   GITHUB_OWNER=your-username
   GITHUB_REPO=keynotai2
   GITHUB_TOKEN=your-github-token

   # Windows Code Signing
   WIN_CSC_LINK=path-to-certificate.p12
   WIN_CSC_KEY_PASSWORD=certificate-password
   ```

### Apple Code Signing (macOS)

1. **Get Apple Developer ID:**
   - Enroll in Apple Developer Program
   - Create Developer ID Application certificate
   - Download and install in Keychain

2. **App-specific Password:**
   - Go to appleid.apple.com
   - Generate app-specific password
   - Use this for `APPLE_PASSWORD`

3. **Team ID:**
   - Found in Apple Developer account settings

### GitHub Publishing

1. **Create GitHub Token:**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create token with `repo` permissions
   - Set as `GITHUB_TOKEN`

2. **Repository Configuration:**
   - Update `GITHUB_OWNER` and `GITHUB_REPO` in `.env.forge`
   - Ensure repository exists and you have push access

## Forge Configuration

The app uses `forge.config.js` for Electron Forge configuration:

### Makers
- **Squirrel** - Windows installer
- **Zip** - macOS app bundle
- **DMG** - macOS disk image
- **Deb** - Linux Debian package
- **RPM** - Linux Red Hat package

### Publishers
- **GitHub** - Publishes releases to GitHub

### Plugins
- **Auto Unpack Natives** - Handles native modules
- **Fuses** - Security enhancements

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd app
          npm ci
          
      - name: Build and publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          cd app
          npm run deploy:publish
```

## Troubleshooting

### Common Issues

1. **Code signing fails on macOS:**
   - Ensure certificate is installed in Keychain
   - Check Apple ID and app-specific password
   - Verify team ID is correct

2. **GitHub publishing fails:**
   - Check GitHub token permissions
   - Ensure repository exists
   - Verify repository owner/name

3. **Build fails:**
   - Run `npm run build` first to check for build errors
   - Check that all dependencies are installed
   - Ensure Node.js version compatibility

### Debug Mode

Add `DEBUG=electron-forge:*` to enable detailed logging:

```bash
DEBUG=electron-forge:* npm run deploy:make
```

## Security Considerations

The Forge configuration includes security enhancements:
- **ASAR packaging** - Protects source code
- **Fuses** - Runtime security settings
- **Code signing** - Ensures authenticity
- **Notarization** - macOS security requirement

## Output Locations

After building:
- **Packaged apps:** `out/`
- **Distributables:** `out/make/`
- **Published releases:** GitHub releases page

## Next Steps

1. Set up your environment with `npm run deploy:setup`
2. Configure `.env.forge` with your credentials
3. Test packaging with `npm run deploy:package`
4. Create distributables with `npm run deploy:make`
5. Set up CI/CD for automated releases 