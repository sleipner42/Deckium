// Re-export types from common location
export * from '../../../common/domain/entities/task-types';

import { Task, TaskResult } from '../../../common/domain/entities/task-types';

export interface TaskExecutor {
    canExecute(task: Task): boolean;
    execute(task: Task): Promise<TaskResult>;
    cancel(taskId: string): Promise<void>;
}

export interface TaskScheduler {
    schedule(task: Task): void;
    unschedule(taskId: string): void;
    getScheduledTasks(): Task[];
}

export interface TaskPersistence {
    save(task: Task): Promise<void>;
    load(taskId: string): Promise<Task | null>;
    query(query: TaskQuery): Promise<Task[]>;
    delete(taskId: string): Promise<void>;
    clear(): Promise<void>;
}
