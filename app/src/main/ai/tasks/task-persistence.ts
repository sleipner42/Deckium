import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Task, TaskFilter, TaskPersistence, TaskQuery } from './types';

export class FileTaskPersistence implements TaskPersistence {
    private tasksDir: string;
    private taskCache: Map<string, Task> = new Map();

    constructor() {
        this.tasksDir = path.join(app.getPath('userData'), 'tasks');
        this.ensureTasksDirectory();
        this.loadTasksFromDisk();
    }

    private ensureTasksDirectory(): void {
        if (!fs.existsSync(this.tasksDir)) {
            fs.mkdirSync(this.tasksDir, { recursive: true });
        }
    }

    private loadTasksFromDisk(): void {
        try {
            const files = fs.readdirSync(this.tasksDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.tasksDir, file);
                    const data = fs.readFileSync(filePath, 'utf-8');
                    const task = JSON.parse(data) as Task;

                    // Convert date strings back to Date objects
                    task.createdAt = new Date(task.createdAt);
                    task.updatedAt = new Date(task.updatedAt);
                    if (task.startedAt)
                        task.startedAt = new Date(task.startedAt);
                    if (task.completedAt)
                        task.completedAt = new Date(task.completedAt);
                    if (task.scheduledFor)
                        task.scheduledFor = new Date(task.scheduledFor);

                    this.taskCache.set(task.id, task);
                }
            }
        } catch (error) {
            console.error('Error loading tasks from disk:', error);
        }
    }

    async save(task: Task): Promise<void> {
        try {
            const filePath = path.join(this.tasksDir, `${task.id}.json`);
            const data = JSON.stringify(task, null, 2);
            fs.writeFileSync(filePath, data);
            this.taskCache.set(task.id, task);
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    }

    async load(taskId: string): Promise<Task | null> {
        // Check cache first
        if (this.taskCache.has(taskId)) {
            return this.taskCache.get(taskId)!;
        }

        try {
            const filePath = path.join(this.tasksDir, `${taskId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const data = fs.readFileSync(filePath, 'utf-8');
            const task = JSON.parse(data) as Task;

            // Convert date strings back to Date objects
            task.createdAt = new Date(task.createdAt);
            task.updatedAt = new Date(task.updatedAt);
            if (task.startedAt) task.startedAt = new Date(task.startedAt);
            if (task.completedAt) task.completedAt = new Date(task.completedAt);
            if (task.scheduledFor)
                task.scheduledFor = new Date(task.scheduledFor);

            this.taskCache.set(taskId, task);
            return task;
        } catch (error) {
            console.error('Error loading task:', error);
            return null;
        }
    }

    async query(query: TaskQuery): Promise<Task[]> {
        let tasks = Array.from(this.taskCache.values());

        // Apply filters
        if (query.filter) {
            tasks = this.applyFilters(tasks, query.filter);
        }

        // Apply sorting
        if (query.sort) {
            tasks = this.applySorting(tasks, query.sort);
        }

        // Apply pagination
        if (query.offset !== undefined) {
            tasks = tasks.slice(query.offset);
        }
        if (query.limit !== undefined) {
            tasks = tasks.slice(0, query.limit);
        }

        return tasks;
    }

    private applyFilters(tasks: Task[], filter: TaskFilter): Task[] {
        return tasks.filter((task) => {
            // Status filter
            if (filter.status && !filter.status.includes(task.status)) {
                return false;
            }

            // Type filter
            if (filter.type && !filter.type.includes(task.type)) {
                return false;
            }

            // Priority filter
            if (filter.priority && !filter.priority.includes(task.priority)) {
                return false;
            }

            // Thread ID filter
            if (filter.threadId && task.context.threadId !== filter.threadId) {
                return false;
            }

            // Presentation ID filter
            if (
                filter.presentationId &&
                task.context.presentationId !== filter.presentationId
            ) {
                return false;
            }

            // Tags filter
            if (filter.tags && filter.tags.length > 0) {
                const hasTag = filter.tags.some((tag) =>
                    task.tags.includes(tag),
                );
                if (!hasTag) {
                    return false;
                }
            }

            // Date range filter
            if (filter.dateRange) {
                const taskDate = task.createdAt;
                if (
                    taskDate < filter.dateRange.start ||
                    taskDate > filter.dateRange.end
                ) {
                    return false;
                }
            }

            return true;
        });
    }

    private applySorting(
        tasks: Task[],
        sort: { field: keyof Task; order: 'asc' | 'desc' },
    ): Task[] {
        return tasks.sort((a, b) => {
            const aValue = a[sort.field];
            const bValue = b[sort.field];

            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;

            return sort.order === 'desc' ? -comparison : comparison;
        });
    }

    async delete(taskId: string): Promise<void> {
        try {
            const filePath = path.join(this.tasksDir, `${taskId}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            this.taskCache.delete(taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async clear(): Promise<void> {
        try {
            const files = fs.readdirSync(this.tasksDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(this.tasksDir, file));
                }
            }
            this.taskCache.clear();
        } catch (error) {
            console.error('Error clearing tasks:', error);
            throw error;
        }
    }
}

export class MemoryTaskPersistence implements TaskPersistence {
    private tasks: Map<string, Task> = new Map();

    async save(task: Task): Promise<void> {
        this.tasks.set(task.id, { ...task });
    }

    async load(taskId: string): Promise<Task | null> {
        const task = this.tasks.get(taskId);
        return task ? { ...task } : null;
    }

    async query(query: TaskQuery): Promise<Task[]> {
        let tasks = Array.from(this.tasks.values());

        // Apply filters
        if (query.filter) {
            tasks = this.applyFilters(tasks, query.filter);
        }

        // Apply sorting
        if (query.sort) {
            tasks = this.applySorting(tasks, query.sort);
        }

        // Apply pagination
        if (query.offset !== undefined) {
            tasks = tasks.slice(query.offset);
        }
        if (query.limit !== undefined) {
            tasks = tasks.slice(0, query.limit);
        }

        return tasks.map((task) => ({ ...task }));
    }

    private applyFilters(tasks: Task[], filter: TaskFilter): Task[] {
        return tasks.filter((task) => {
            if (filter.status && !filter.status.includes(task.status)) {
                return false;
            }
            if (filter.type && !filter.type.includes(task.type)) {
                return false;
            }
            if (filter.priority && !filter.priority.includes(task.priority)) {
                return false;
            }
            if (filter.threadId && task.context.threadId !== filter.threadId) {
                return false;
            }
            if (
                filter.presentationId &&
                task.context.presentationId !== filter.presentationId
            ) {
                return false;
            }
            if (filter.tags && filter.tags.length > 0) {
                const hasTag = filter.tags.some((tag) =>
                    task.tags.includes(tag),
                );
                if (!hasTag) {
                    return false;
                }
            }
            if (filter.dateRange) {
                const taskDate = task.createdAt;
                if (
                    taskDate < filter.dateRange.start ||
                    taskDate > filter.dateRange.end
                ) {
                    return false;
                }
            }
            return true;
        });
    }

    private applySorting(
        tasks: Task[],
        sort: { field: keyof Task; order: 'asc' | 'desc' },
    ): Task[] {
        return tasks.sort((a, b) => {
            const aValue = a[sort.field];
            const bValue = b[sort.field];

            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;

            return sort.order === 'desc' ? -comparison : comparison;
        });
    }

    async delete(taskId: string): Promise<void> {
        this.tasks.delete(taskId);
    }

    async clear(): Promise<void> {
        this.tasks.clear();
    }
}
