import { TaskManagerIpcHandler } from './ipc-handler';
import { TaskManager } from './task-manager';
import { MemoryTaskPersistence } from './task-persistence';
import { DefaultTaskScheduler } from './task-scheduler';

export class SimpleTaskManager {
    private taskManager: TaskManager;
    private ipcHandler: TaskManagerIpcHandler;

    constructor(presentationService?: any) {
        // Use memory persistence for now (simpler setup)
        const persistence = new MemoryTaskPersistence();

        this.taskManager = new TaskManager(
            null as any,
            persistence,
            presentationService,
        );
        const scheduler = new DefaultTaskScheduler(this.taskManager);

        // Set the scheduler after TaskManager is created
        (this.taskManager as any).scheduler = scheduler;

        this.ipcHandler = new TaskManagerIpcHandler(this.taskManager);
    }

    getTaskManager(): TaskManager {
        return this.taskManager;
    }

    // Simple method to check if task manager is available
    isAvailable(): boolean {
        return true;
    }
}
