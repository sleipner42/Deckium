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
      /^\/\.git/,
      /^\/release\/app\/node_modules/,
      /\.ts$/,
      /\.tsx$/,
      /tsconfig\.json$/,
      /webpack\.config/,
      /\.eslint/,
      /\.prettier/,
      /forge\.config\.js/,
      /\.env\.forge/,
    ],
    protocols: [
      {
        name: 'deckium-auth-protocol',
        schemes: ['deckium'],
      },
    ],
  },
  rebuildConfig: {},
  hooks: {
    prePackage: async (forgeConfig, platform, arch) => {
      const fs = require('fs');
      const path = require('path');
      
      console.log('Setting up packaging from release/app structure...');
      
      const releaseAppPath = path.join(__dirname, 'release', 'app');
      const productionMainPath = path.join(releaseAppPath, 'dist', 'main', 'main.js');
      
      if (!fs.existsSync(productionMainPath)) {
        throw new Error('Production build not found. Please run "npm run build" first.');
      }
      
      const tempMainPath = path.join(__dirname, 'main.js');
      const tempPackageJsonPath = path.join(__dirname, 'package.json.backup');
      const packageJsonPath = path.join(__dirname, 'package.json');
      
      fs.copyFileSync(packageJsonPath, tempPackageJsonPath);
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.main = './release/app/dist/main/main.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      console.log('✓ Temporarily updated package.json main field for packaging');
    },
    postPackage: async (forgeConfig, result) => {
      const fs = require('fs');
      const path = require('path');
      
      const tempPackageJsonPath = path.join(__dirname, 'package.json.backup');
      const packageJsonPath = path.join(__dirname, 'package.json');
      
      if (fs.existsSync(tempPackageJsonPath)) {
        fs.copyFileSync(tempPackageJsonPath, packageJsonPath);
        fs.unlinkSync(tempPackageJsonPath);
        console.log('✓ Restored original package.json');
      }
    }
  },
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