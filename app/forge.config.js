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
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'deckium',
        setupExe: 'Deckium-Setup.exe',
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        categories: ['Development', 'Office'],
        maintainer: 'Deckium Team',
        homepage: 'https://deckium.xyz',
        description: 'AI-powered presentation tool',
        genericName: 'Presentation Tool',
        mimeType: ['application/x-deckium'],
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        categories: ['Development', 'Office'],
        maintainer: 'Deckium Team',
        homepage: 'https://deckium.xyz',
        description: 'AI-powered presentation tool',
        genericName: 'Presentation Tool',
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
