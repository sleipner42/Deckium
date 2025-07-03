import * as fs from 'node:fs';
import * as path from 'node:path';
import { ipcMain } from 'electron';

export class FileSystemIpcHandler {
    constructor() {
        this.setupIpcHandlers();
    }

    private setupIpcHandlers(): void {
        ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
            try {
                const absolutePath = path.resolve(filePath);
                const content = await fs.promises.readFile(
                    absolutePath,
                    'utf-8',
                );
                return { success: true, content };
            } catch (error) {
                console.error('Error reading file:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                };
            }
        });
    }
}
