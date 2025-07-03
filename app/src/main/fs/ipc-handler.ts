import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import { ipcMain } from 'electron';

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
    }
}
