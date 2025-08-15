import { ipcMain } from 'electron';
import { TaskManager } from './task-manager';
import { TaskPriority, TaskQuery, TaskType } from './types';

export class TaskManagerIpcHandler {
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        this.taskManager = taskManager;
        this.setupIpcHandlers();
    }

    private setupIpcHandlers(): void {
        // Check if task manager is available
        ipcMain.handle('task-manager:available', () => {
            return this.taskManager !== null;
        });

        // Create a new task
        ipcMain.handle('task-manager:create', async (event, data) => {
            const { name, toolName, toolArgs, options } = data;

            // Get thread ID from the current context (would need to be passed from renderer)
            const context = {
                threadId: options.threadId || 'default',
                presentationId: options.presentationId,
                toolContext: options.toolContext,
            };

            return await this.taskManager.createTask(
                name,
                toolName,
                toolArgs,
                context,
                {
                    type: options.type || TaskType.IMMEDIATE,
                    priority: options.priority || TaskPriority.MEDIUM,
                    description: options.description,
                    scheduledFor: options.scheduledFor
                        ? new Date(options.scheduledFor)
                        : undefined,
                    tags: options.tags || [],
                    metadata: options.metadata || {},
                },
            );
        });

        // Execute a task
        ipcMain.handle(
            'task-manager:execute',
            async (event, taskId: string) => {
                return await this.taskManager.executeTask(taskId);
            },
        );

        // Cancel a task
        ipcMain.handle('task-manager:cancel', async (event, taskId: string) => {
            return await this.taskManager.cancelTask(taskId);
        });

        // Get a specific task
        ipcMain.handle('task-manager:get', async (event, taskId: string) => {
            return await this.taskManager.getTask(taskId);
        });

        // Query tasks
        ipcMain.handle(
            'task-manager:query',
            async (event, query: TaskQuery) => {
                return await this.taskManager.queryTasks(query);
            },
        );

        // Update task progress
        ipcMain.handle('task-manager:update-progress', async (event, data) => {
            const { taskId, current, total, message } = data;
            return await this.taskManager.updateTaskProgress(
                taskId,
                current,
                total,
                message,
            );
        });

        // Create workflow
        ipcMain.handle('task-manager:create-workflow', async (event, data) => {
            const { definition, context } = data;
            return await this.taskManager.createWorkflow(definition, context);
        });

        // Forward task events to renderer processes
        this.taskManager.on('taskEvent', (event) => {
            // Send to all windows
            const windows = require('electron').BrowserWindow.getAllWindows();
            windows.forEach((window) => {
                window.webContents.send('task-manager:event', event);
            });
        });
    }
}
