import { useCallback, useEffect, useState } from 'react';
import {
    Task,
    TaskEvent,
    TaskPriority,
    TaskQuery,
    TaskStatus,
    TaskType,
} from '../../../common/domain/entities/task-types';

interface UseTaskManagerReturn {
    tasks: Task[];
    activeTasks: Task[];
    completedTasks: Task[];
    createTask: (
        name: string,
        toolName: string,
        toolArgs: Record<string, any>,
        options?: {
            type?: TaskType;
            priority?: TaskPriority;
            description?: string;
            scheduledFor?: Date;
            tags?: string[];
        },
    ) => Promise<Task>;
    cancelTask: (taskId: string) => Promise<void>;
    getTask: (taskId: string) => Promise<Task | null>;
    getTaskHistory: (query?: TaskQuery) => Promise<Task[]>;
    isTaskManagerAvailable: boolean;
}

export const useTaskManager = (): UseTaskManagerReturn => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isTaskManagerAvailable, setIsTaskManagerAvailable] = useState(false);

    // Check if task manager is available
    useEffect(() => {
        const checkAvailability = async () => {
            try {
                const available = await window.electron.taskManager.available();
                setIsTaskManagerAvailable(available);
            } catch (error) {
                console.error(
                    'Failed to check task manager availability:',
                    error,
                );
                setIsTaskManagerAvailable(false);
            }
        };

        checkAvailability();
    }, []);

    // Load initial tasks
    useEffect(() => {
        if (isTaskManagerAvailable) {
            loadTasks();
        }
    }, [isTaskManagerAvailable]);

    // Listen for task events
    useEffect(() => {
        if (!isTaskManagerAvailable) return;

        const handleTaskEvent = (event: TaskEvent) => {
            setTasks((prevTasks) => {
                const existingIndex = prevTasks.findIndex(
                    (t) => t.id === event.taskId,
                );

                if (existingIndex >= 0) {
                    // Update existing task
                    const updatedTasks = [...prevTasks];
                    updatedTasks[existingIndex] = event.task;
                    return updatedTasks;
                } else {
                    // Add new task
                    return [...prevTasks, event.task];
                }
            });
        };

        window.electron.ipcRenderer.on('task-manager:event', handleTaskEvent);

        return () => {
            window.electron.ipcRenderer.removeListener(
                'task-manager:event',
                handleTaskEvent,
            );
        };
    }, [isTaskManagerAvailable]);

    const loadTasks = useCallback(async () => {
        try {
            const query: TaskQuery = {
                filter: {
                    status: [
                        TaskStatus.PENDING,
                        TaskStatus.RUNNING,
                        TaskStatus.PAUSED,
                    ],
                },
                sort: {
                    field: 'createdAt',
                    order: 'desc',
                },
            };

            const activeTasks = await window.electron.taskManager.query(query);
            setTasks(activeTasks);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }, []);

    const createTask = useCallback(
        async (
            name: string,
            toolName: string,
            toolArgs: Record<string, any>,
            options: {
                type?: TaskType;
                priority?: TaskPriority;
                description?: string;
                scheduledFor?: Date;
                tags?: string[];
            } = {},
        ): Promise<Task> => {
            if (!isTaskManagerAvailable) {
                throw new Error('Task manager is not available');
            }

            try {
                const task = await window.electron.taskManager.create({
                    name,
                    toolName,
                    toolArgs,
                    options,
                });

                return task;
            } catch (error) {
                console.error('Failed to create task:', error);
                throw error;
            }
        },
        [isTaskManagerAvailable],
    );

    const cancelTask = useCallback(
        async (taskId: string): Promise<void> => {
            if (!isTaskManagerAvailable) {
                throw new Error('Task manager is not available');
            }

            try {
                await window.electron.taskManager.cancel(taskId);
            } catch (error) {
                console.error('Failed to cancel task:', error);
                throw error;
            }
        },
        [isTaskManagerAvailable],
    );

    const getTask = useCallback(
        async (taskId: string): Promise<Task | null> => {
            if (!isTaskManagerAvailable) {
                return null;
            }

            try {
                return await window.electron.taskManager.get(taskId);
            } catch (error) {
                console.error('Failed to get task:', error);
                return null;
            }
        },
        [isTaskManagerAvailable],
    );

    const getTaskHistory = useCallback(
        async (query?: TaskQuery): Promise<Task[]> => {
            if (!isTaskManagerAvailable) {
                return [];
            }

            try {
                const historyQuery: TaskQuery = query || {
                    sort: {
                        field: 'completedAt',
                        order: 'desc',
                    },
                    limit: 100,
                };

                return await window.electron.taskManager.query(historyQuery);
            } catch (error) {
                console.error('Failed to get task history:', error);
                return [];
            }
        },
        [isTaskManagerAvailable],
    );

    const activeTasks = tasks.filter(
        (task) =>
            task.status === TaskStatus.PENDING ||
            task.status === TaskStatus.RUNNING ||
            task.status === TaskStatus.PAUSED,
    );

    const completedTasks = tasks.filter(
        (task) =>
            task.status === TaskStatus.COMPLETED ||
            task.status === TaskStatus.FAILED ||
            task.status === TaskStatus.CANCELLED,
    );

    return {
        tasks,
        activeTasks,
        completedTasks,
        createTask,
        cancelTask,
        getTask,
        getTaskHistory,
        isTaskManagerAvailable,
    };
};
