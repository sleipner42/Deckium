const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'Deckium',
    executableName: 'deckium',
    asar: true,
    icon: './assets/icon',
    ignore: [
      /^\/src/,
      /^\/\.erb/,
      /^\/scripts/,
      /^\/node_modules/,
      /\.ts$/,
      /\.tsx$/,
      /tsconfig\.json$/,
      /webpack\.config/,
      /\.eslint/,
      /\.prettier/,
      /^\/DEPLOYMENT\.md/,
      /^\/forge\.config\.js/,
      /^\/\.env\.forge/,
    ],
    protocols: [
      {
        name: 'deckium-auth-protocol',
        schemes: ['deckium'],
      },
    ],
    osxSign: process.env.APPLE_ID ? {
      identity: 'Developer ID Application: Your Name',
      hardenedRuntime: true,
      entitlements: './assets/entitlements.mac.plist',
      entitlementsInherit: './assets/entitlements.mac.plist',
      gatekeeperAssess: false,
    } : undefined,
    osxNotarize: process.env.APPLE_ID ? {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    } : undefined,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'deckium',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        categories: ['Development'],
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        categories: ['Development'],
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: process.env.GITHUB_OWNER || 'your-github-username',
          name: process.env.GITHUB_REPO || 'keynotai2',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
}; 