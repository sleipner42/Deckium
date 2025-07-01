import { exec } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export class AppImageIntegration {
    private static isAppImage(): boolean {
        return !!process.env.APPIMAGE;
    }

    private static getAppImagePath(): string | null {
        return process.env.APPIMAGE || null;
    }

    private static async checkDesktopFileExists(): Promise<boolean> {
        const homeDir = require('os').homedir();
        const desktopFilePath = path.join(
            homeDir,
            '.local/share/applications/deckium.desktop',
        );

        try {
            await fs.promises.access(desktopFilePath);
            return true;
        } catch {
            return false;
        }
    }

    private static async installDesktopFile(): Promise<void> {
        const homeDir = require('os').homedir();
        const appImagePath = AppImageIntegration.getAppImagePath();

        if (!appImagePath) {
            throw new Error('Not running as AppImage');
        }

        // Ensure .local/share/applications directory exists
        const applicationsDir = path.join(homeDir, '.local/share/applications');
        await fs.promises.mkdir(applicationsDir, { recursive: true });

        // Create desktop file content
        const desktopFileContent = `[Desktop Entry]
Name=Deckium
Exec=${appImagePath} --no-sandbox %U
Terminal=false
Type=Application
Icon=deckium
StartupWMClass=Deckium
Comment=AI-powered presentation tool
Categories=Development;Office;
MimeType=x-scheme-handler/deckium;
`;

        // Write desktop file
        const desktopFilePath = path.join(applicationsDir, 'deckium.desktop');
        await fs.promises.writeFile(desktopFilePath, desktopFileContent);

        // Make desktop file executable
        await fs.promises.chmod(desktopFilePath, 0o755);

        // Copy icon to user icons directory
        await AppImageIntegration.installIcon();

        // Update desktop database
        await AppImageIntegration.updateDesktopDatabase();

        // Register as default protocol handler
        await AppImageIntegration.registerProtocolHandler();
    }

    private static async installIcon(): Promise<void> {
        const homeDir = require('os').homedir();
        const iconsDir = path.join(homeDir, '.local/share/icons/hicolor');

        // Get icon from AppImage resources
        const iconSource = app.isPackaged
            ? path.join(process.resourcesPath, 'assets/icon.png')
            : path.join(__dirname, '../../assets/icon.png');

        // Install icon in various sizes
        const sizes = [
            '16x16',
            '32x32',
            '48x48',
            '64x64',
            '128x128',
            '256x256',
            '512x512',
        ];

        for (const size of sizes) {
            const iconDir = path.join(iconsDir, size, 'apps');
            await fs.promises.mkdir(iconDir, { recursive: true });

            const iconPath = path.join(iconDir, 'deckium.png');
            try {
                await fs.promises.copyFile(iconSource, iconPath);
            } catch (error) {
                console.warn(`Failed to install icon for size ${size}:`, error);
            }
        }
    }

    private static async updateDesktopDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const homeDir = require('os').homedir();
            const applicationsDir = path.join(
                homeDir,
                '.local/share/applications',
            );

            exec(`update-desktop-database "${applicationsDir}"`, (error) => {
                if (error) {
                    console.warn('Failed to update desktop database:', error);
                    // Don't reject, as this is not critical
                }
                resolve();
            });
        });
    }

    private static async registerProtocolHandler(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(
                'xdg-mime default deckium.desktop x-scheme-handler/deckium',
                (error) => {
                    if (error) {
                        console.warn(
                            'Failed to register protocol handler:',
                            error,
                        );
                        // Don't reject, as this is not critical
                    }
                    resolve();
                },
            );
        });
    }

    public static async integrateIfNeeded(): Promise<void> {
        if (!AppImageIntegration.isAppImage()) {
            return; // Not running as AppImage
        }

        try {
            const desktopFileExists =
                await AppImageIntegration.checkDesktopFileExists();

            if (!desktopFileExists) {
                console.log('Installing AppImage desktop integration...');
                await AppImageIntegration.installDesktopFile();
                console.log(
                    'AppImage desktop integration installed successfully',
                );
            }
        } catch (error) {
            console.error('Failed to integrate AppImage:', error);
        }
    }
}
