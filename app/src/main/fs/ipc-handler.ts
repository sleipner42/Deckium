import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';
import { createHash } from 'crypto';
import { app, ipcMain } from 'electron';

export class FileSystemIpcHandler {
    constructor() {
        this.setupIpcHandlers();
    }

    private setupIpcHandlers(): void {
        ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
            try {
                // Security check: only allow image files
                const ext = extname(filePath).toLowerCase();
                const allowedExtensions = [
                    '.png',
                    '.jpg',
                    '.jpeg',
                    '.gif',
                    '.bmp',
                    '.webp',
                    '.svg',
                ];

                if (!allowedExtensions.includes(ext)) {
                    throw new Error('File type not allowed');
                }

                // Read the file and return as Buffer
                const fileBuffer = await fs.readFile(filePath);
                return fileBuffer;
            } catch (error) {
                console.error('Failed to read file:', error);
                throw error;
            }
        });

        ipcMain.handle(
            'fs:write-temp-file',
            async (_event, filename: string, buffer: Uint8Array) => {
                try {
                    // Create temp directory if it doesn't exist
                    const tempDir = join(
                        app.getPath('temp'),
                        'deckium-pdf-paste',
                    );
                    await fs.mkdir(tempDir, { recursive: true });

                    // Generate unique filename using hash
                    const hash = createHash('md5')
                        .update(buffer)
                        .digest('hex')
                        .substring(0, 8);
                    const ext = extname(filename);
                    const baseName = filename.replace(ext, '');
                    const uniqueFilename = `${baseName}_${hash}${ext}`;
                    const tempPath = join(tempDir, uniqueFilename);

                    // Write the file
                    await fs.writeFile(tempPath, buffer);

                    return tempPath;
                } catch (error) {
                    console.error('Failed to write temp file:', error);
                    throw error;
                }
            },
        );
    }
}
