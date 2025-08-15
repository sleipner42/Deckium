import { TaskManager } from './task-manager';
import { Task, TaskScheduler, TaskStatus } from './types';

export class DefaultTaskScheduler implements TaskScheduler {
    private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        this.taskManager = taskManager;
    }

    schedule(task: Task): void {
        if (!task.scheduledFor) {
            throw new Error(`Task ${task.id} has no scheduled time`);
        }

        // Clear any existing schedule
        this.unschedule(task.id);

        const now = new Date();
        const delay = task.scheduledFor.getTime() - now.getTime();

        if (delay <= 0) {
            // Execute immediately if scheduled time has passed
            this.executeScheduledTask(task);
            return;
        }

        const timeout = setTimeout(() => {
            this.executeScheduledTask(task);
        }, delay);

        this.scheduledTasks.set(task.id, timeout);
    }

    unschedule(taskId: string): void {
        const timeout = this.scheduledTasks.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.scheduledTasks.delete(taskId);
        }
    }

    getScheduledTasks(): Task[] {
        // This would need to be implemented to return actual scheduled tasks
        // For now, return empty array
        return [];
    }

    private async executeScheduledTask(task: Task): Promise<void> {
        this.scheduledTasks.delete(task.id);

        try {
            await this.taskManager.executeTask(task.id);
        } catch (error) {
            console.error(
                `Failed to execute scheduled task ${task.id}:`,
                error,
            );
        }
    }
}
