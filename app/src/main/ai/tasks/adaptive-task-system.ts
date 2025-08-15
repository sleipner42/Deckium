import { EventEmitter } from 'events';
import { AIToolCall } from '../../../common/domain/entities/ai-types';
import {
    Task,
    TaskPriority,
    TaskStatus,
    TaskType,
} from '../../../common/domain/entities/task-types';
import {
    RequestAnalysis,
    RequestAnalyzer,
    TaskSuggestion,
} from './request-analyzer';
import { TaskManager } from './task-manager';

export interface AdaptiveTaskResult {
    executionType: 'DIRECT' | 'PROGRESSIVE' | 'TASK_BASED';
    tasks?: Task[];
    directResponse?: string;
    progressMessage?: string;
}

export interface TaskExecutionEvent {
    type: 'started' | 'completed' | 'failed' | 'progress';
    taskId: string;
    task: Task;
    progress?: number;
    error?: string;
}

export class AdaptiveTaskSystem extends EventEmitter {
    private taskManager: TaskManager;
    private currentExecution: {
        type: 'DIRECT' | 'PROGRESSIVE' | 'TASK_BASED';
        tasks: Task[];
        currentTaskIndex: number;
        analysis: RequestAnalysis;
    } | null = null;

    constructor(taskManager: TaskManager) {
        super();
        this.taskManager = taskManager;
    }

    async processRequest(userMessage: string): Promise<AdaptiveTaskResult> {
        console.log('🔍 Analyzing request:', userMessage);

        // Analyze the request
        const analysis = RequestAnalyzer.analyzeRequest(userMessage);
        console.log('📊 Analysis result:', analysis);

        // Create execution context
        this.currentExecution = {
            type: analysis.executionType,
            tasks: [],
            currentTaskIndex: 0,
            analysis,
        };

        switch (analysis.executionType) {
            case 'DIRECT':
                return this.handleDirectExecution(analysis);

            case 'PROGRESSIVE':
                return this.handleProgressiveExecution(analysis);

            case 'TASK_BASED':
                return this.handleTaskBasedExecution(analysis);

            default:
                return this.handleDirectExecution(analysis);
        }
    }

    private async handleDirectExecution(
        analysis: RequestAnalysis,
    ): Promise<AdaptiveTaskResult> {
        console.log('⚡ Using direct execution');

        // For direct execution, we don't create visible tasks
        // The AI will handle the request immediately
        return {
            executionType: 'DIRECT',
            directResponse: 'Processing request directly...',
        };
    }

    private async handleProgressiveExecution(
        analysis: RequestAnalysis,
    ): Promise<AdaptiveTaskResult> {
        console.log('📈 Using progressive execution');

        // Create tasks but show simpler progress
        const tasks = await this.createTasksFromSuggestions(
            analysis.suggestedTasks,
        );

        // Set up current execution
        if (this.currentExecution) {
            this.currentExecution.tasks = tasks;
        }

        return {
            executionType: 'PROGRESSIVE',
            tasks,
            progressMessage: `Processing ${tasks.length} steps...`,
        };
    }

    private async handleTaskBasedExecution(
        analysis: RequestAnalysis,
    ): Promise<AdaptiveTaskResult> {
        console.log('🎯 Using task-based execution');

        // Create full task breakdown
        const tasks = await this.createTasksFromSuggestions(
            analysis.suggestedTasks,
        );

        // Set up current execution
        if (this.currentExecution) {
            this.currentExecution.tasks = tasks;
        }

        return {
            executionType: 'TASK_BASED',
            tasks,
        };
    }

    private async createTasksFromSuggestions(
        suggestions: TaskSuggestion[],
    ): Promise<Task[]> {
        const tasks: Task[] = [];

        for (const suggestion of suggestions) {
            const task = await this.taskManager.createTask(
                suggestion.name,
                suggestion.toolName,
                {}, // Will be filled during execution
                {
                    type: suggestion.type,
                    priority: suggestion.priority,
                    description: suggestion.description,
                    tags: ['adaptive-system'],
                },
            );

            tasks.push(task);
        }

        return tasks;
    }

    async executeNextTask(): Promise<Task | null> {
        if (!this.currentExecution || !this.currentExecution.tasks.length) {
            return null;
        }

        const { tasks, currentTaskIndex } = this.currentExecution;

        if (currentTaskIndex >= tasks.length) {
            return null; // All tasks completed
        }

        const currentTask = tasks[currentTaskIndex];
        this.currentExecution.currentTaskIndex++;

        // Emit task started event
        this.emit('taskStarted', {
            type: 'started',
            taskId: currentTask.id,
            task: currentTask,
        });

        return currentTask;
    }

    async findCorrespondingTask(toolCall: AIToolCall): Promise<Task | null> {
        if (!this.currentExecution) {
            return null;
        }

        const { tasks, currentTaskIndex } = this.currentExecution;

        // Ensure we have tasks array
        if (!tasks || tasks.length === 0) {
            return null;
        }

        // Find the next pending task that matches the tool
        for (let i = Math.max(0, currentTaskIndex - 1); i < tasks.length; i++) {
            const task = tasks[i];

            // Add null check for task
            if (!task) {
                continue;
            }

            if (
                task.status === TaskStatus.PENDING &&
                (task.toolName === toolCall.toolName ||
                    this.toolsAreCompatible(task.toolName, toolCall.toolName))
            ) {
                return task;
            }
        }

        // If no exact match, find the first pending task with null check
        const foundTask = tasks.find(
            (task) => task && task.status === TaskStatus.PENDING,
        );
        return foundTask || null;
    }

    private toolsAreCompatible(taskTool: string, callTool: string): boolean {
        // Define tool compatibility mapping
        const compatibilityMap: { [key: string]: string[] } = {
            addTextElement: ['addTextElement', 'updateTextElement'],
            createSlide: ['createSlide', 'updateSlide'],
            createBarChart: ['createBarChart', 'updateBarChart'],
            searchPexelsImages: ['searchPexelsImages', 'addImageFromUrl'],
            alignElements: ['alignElements', 'spaceElementsEvenly'],
        };

        const compatibleTools = compatibilityMap[taskTool] || [taskTool];
        return compatibleTools.includes(callTool);
    }

    async completeTask(
        taskId: string,
        result: { success: boolean; result?: any; error?: string },
    ): Promise<void> {
        if (!this.currentExecution || !this.currentExecution.tasks) {
            return;
        }

        const task = this.currentExecution.tasks.find(
            (t) => t && t.id === taskId,
        );
        if (!task) {
            return;
        }

        // Update task status
        await this.taskManager.completeTask(taskId, result);

        // Emit task completed event
        this.emit('taskCompleted', {
            type: result.success ? 'completed' : 'failed',
            taskId,
            task,
            error: result.error,
        });

        // Calculate overall progress with null checks
        const completedTasks = this.currentExecution.tasks.filter(
            (t) =>
                t &&
                (t.status === TaskStatus.COMPLETED ||
                    t.status === TaskStatus.FAILED),
        ).length;

        const totalTasks = this.currentExecution.tasks.length;
        const progress =
            totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Emit progress event
        this.emit('progress', {
            type: 'progress',
            taskId,
            task,
            progress,
        });

        // Check if all tasks are completed
        if (completedTasks === totalTasks && totalTasks > 0) {
            this.emit('allTasksCompleted', {
                tasks: this.currentExecution.tasks,
                analysis: this.currentExecution.analysis,
            });
        }
    }

    getCurrentExecution() {
        return this.currentExecution;
    }

    getProgress(): number {
        if (!this.currentExecution || !this.currentExecution.tasks) {
            return 0;
        }

        const completedTasks = this.currentExecution.tasks.filter(
            (t) =>
                t &&
                (t.status === TaskStatus.COMPLETED ||
                    t.status === TaskStatus.FAILED),
        ).length;

        const totalTasks = this.currentExecution.tasks.length;
        return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    }

    getProgressMessage(): string {
        if (!this.currentExecution || !this.currentExecution.tasks) {
            return '';
        }

        const { tasks, analysis } = this.currentExecution;
        const completedTasks = tasks.filter(
            (t) =>
                t &&
                (t.status === TaskStatus.COMPLETED ||
                    t.status === TaskStatus.FAILED),
        ).length;

        const totalTasks = tasks.length;

        switch (analysis.executionType) {
            case 'PROGRESSIVE':
                return `Processing... ${completedTasks}/${totalTasks} steps completed`;

            case 'TASK_BASED':
                return `${completedTasks}/${totalTasks} tasks completed`;

            default:
                return '';
        }
    }

    reset(): void {
        this.currentExecution = null;
        this.removeAllListeners();
    }

    // Helper method to get task statistics
    getTaskStatistics() {
        if (!this.currentExecution || !this.currentExecution.tasks) {
            return null;
        }

        const { tasks } = this.currentExecution;
        const stats = {
            total: tasks.length,
            completed: tasks.filter(
                (t) => t && t.status === TaskStatus.COMPLETED,
            ).length,
            failed: tasks.filter((t) => t && t.status === TaskStatus.FAILED)
                .length,
            pending: tasks.filter((t) => t && t.status === TaskStatus.PENDING)
                .length,
            running: tasks.filter((t) => t && t.status === TaskStatus.RUNNING)
                .length,
        };

        return stats;
    }

    // Helper method to get estimated time remaining
    getEstimatedTimeRemaining(): number {
        if (!this.currentExecution || !this.currentExecution.tasks) {
            return 0;
        }

        const { tasks, analysis } = this.currentExecution;
        const pendingTasks = tasks.filter(
            (t) => t && t.status === TaskStatus.PENDING,
        );

        // Use suggested task durations if available
        const totalEstimatedTime = analysis.suggestedTasks
            .filter((_, index) => index < pendingTasks.length)
            .reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);

        return totalEstimatedTime;
    }
}
