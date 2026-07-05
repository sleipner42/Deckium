import { promises as fs } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import { ipcMain } from 'electron';

const ALLOWED_IMAGE_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
];

export class FileSystemIpcHandler {
    constructor() {
        this.setupIpcHandlers();
    }

    private setupIpcHandlers(): void {
        ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
            try {
                return await FileSystemIpcHandler.readImageFile(filePath);
            } catch (error) {
                console.error('Failed to read file:', error);
                throw error;
            }
        });
    }

    /**
     * Read an image file requested by the renderer.
     *
     * Policy: the renderer only calls this for user-picked image paths
     * (drag-and-drop of an absolute path onto a slide — see SlideRenderer),
     * so we intentionally allow any absolute location the user chose rather
     * than confining reads to app directories. We still harden against the
     * obvious abuses:
     *   - reject non-absolute paths (blocks relative-path escapes and
     *     ambiguity relative to the process cwd),
     *   - reject embedded NUL bytes,
     *   - resolve/normalise the path (collapsing any `..` traversal) and
     *     re-validate the extension on the *resolved* path, so a crafted
     *     `foo.png/../../secret` cannot smuggle in a non-image target.
     */
    static async readImageFile(filePath: string): Promise<Buffer> {
        if (typeof filePath !== 'string' || filePath.length === 0) {
            throw new Error('Invalid file path');
        }
        if (filePath.includes('\0')) {
            throw new Error('Invalid file path');
        }
        if (!isAbsolute(filePath)) {
            throw new Error('Only absolute file paths are allowed');
        }

        // Collapse any traversal segments, then validate the real target.
        const resolvedPath = resolve(filePath);
        const ext = extname(resolvedPath).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            throw new Error('File type not allowed');
        }

        return fs.readFile(resolvedPath);
    }
}
