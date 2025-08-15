import { EventEmitter } from 'events';
import {
    Task,
    TaskEvent,
    TaskExecutionContext,
    TaskExecutor,
    TaskPersistence,
    TaskPriority,
    TaskQuery,
    TaskResult,
    TaskScheduler,
    TaskStatus,
    TaskType,
    WorkflowDefinition,
    WorkflowStep,
} from '../../../common/domain/entities/task-types';
import { AITool } from '../tools/AITool';
import { ToolFactory } from '../tools/ToolFactory';

export class TaskManager extends EventEmitter {
    private tasks: Map<string, Task> = new Map();
    private executors: Map<string, TaskExecutor> = new Map();
    private scheduler: TaskScheduler;
    private persistence: TaskPersistence;
    private isProcessing = false;
    private processingQueue: Task[] = [];

    constructor(
        scheduler: TaskScheduler,
        persistence: TaskPersistence,
        presentationService?: any,
    ) {
        super();
        this.scheduler = scheduler;
        this.persistence = persistence;
        this.setupDefaultExecutors(presentationService);
        this.startProcessingLoop();
    }

    private setupDefaultExecutors(presentationService?: any): void {
        // Default executor for AI tools with presentation service
        this.executors.set('ai-tool', new AIToolExecutor(presentationService));

        // Workflow executor for complex multi-step tasks
        this.executors.set('workflow', new WorkflowExecutor(this));
    }

    private startProcessingLoop(): void {
        // Disable automatic processing for now
        // Tasks will be executed manually by the AI service
        // setInterval(() => {
        //     if (!this.isProcessing) {
        //         this.processNextTask();
        //     }
        // }, 100);
    }

    async createTask(
        name: string,
        toolName: string,
        toolArgs: Record<string, any>,
        context: TaskExecutionContext,
        options: {
            type?: TaskType;
            priority?: TaskPriority;
            description?: string;
            dependencies?: string[];
            scheduledFor?: Date;
            tags?: string[];
            metadata?: Record<string, any>;
        } = {},
    ): Promise<Task> {
        const task: Task = {
            id: this.generateTaskId(),
            type: options.type || TaskType.IMMEDIATE,
            status: TaskStatus.PENDING,
            priority: options.priority || TaskPriority.MEDIUM,

            name,
            description: options.description,
            createdAt: new Date(),
            updatedAt: new Date(),

            toolName,
            toolArgs,
            context,

            progress: { current: 0, total: 1 },

            dependencies: (options.dependencies || []).map((id) => ({
                taskId: id,
                required: true,
            })),
            scheduledFor: options.scheduledFor,
            retryCount: 0,
            maxRetries: 3,

            subtasks: [],

            tags: options.tags || [],
            metadata: options.metadata || {},
        };

        this.tasks.set(task.id, task);
        await this.persistence.save(task);

        this.emitTaskEvent('created', task);

        // Don't automatically queue tasks for execution
        // Tasks are for tracking purposes only
        // The AI service will handle actual execution

        // Store task but don't automatically execute
        // if (task.type === TaskType.IMMEDIATE) {
        //     this.queueTask(task);
        // } else if (task.type === TaskType.SCHEDULED && task.scheduledFor) {
        //     this.scheduler.schedule(task);
        // } else if (task.type === TaskType.BACKGROUND) {
        //     this.queueTask(task);
        // }

        return task;
    }

    async executeTask(taskId: string): Promise<TaskResult> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        if (task.status === TaskStatus.RUNNING) {
            throw new Error(`Task already running: ${taskId}`);
        }

        // Check dependencies
        const unmetDependencies = await this.checkDependencies(task);
        if (unmetDependencies.length > 0) {
            throw new Error(
                `Unmet dependencies: ${unmetDependencies.join(', ')}`,
            );
        }

        return this.executeTaskInternal(task);
    }

    private async executeTaskInternal(task: Task): Promise<TaskResult> {
        task.status = TaskStatus.RUNNING;
        task.startedAt = new Date();
        task.updatedAt = new Date();

        this.emitTaskEvent('started', task);

        try {
            const executor = this.getExecutor(task);
            const result = await executor.execute(task);

            task.result = result;
            task.status = result.success
                ? TaskStatus.COMPLETED
                : TaskStatus.FAILED;
            task.completedAt = new Date();
            task.updatedAt = new Date();

            if (result.success) {
                this.emitTaskEvent('completed', task);
                // Check if any dependent tasks can now be executed
                this.checkDependentTasks(task.id);
            } else {
                this.emitTaskEvent('failed', task);
                // Retry if configured
                if (task.retryCount < task.maxRetries) {
                    task.retryCount++;
                    task.status = TaskStatus.PENDING;
                    this.queueTask(task);
                }
            }

            await this.persistence.save(task);
            return result;
        } catch (error) {
            task.status = TaskStatus.FAILED;
            task.result = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
            task.completedAt = new Date();
            task.updatedAt = new Date();

            this.emitTaskEvent('failed', task);
            await this.persistence.save(task);

            throw error;
        }
    }

    private getExecutor(task: Task): TaskExecutor {
        // Try to find specific executor for the tool
        const toolExecutor = this.executors.get(task.toolName);
        if (toolExecutor && toolExecutor.canExecute(task)) {
            return toolExecutor;
        }

        // Fall back to default AI tool executor
        const defaultExecutor = this.executors.get('ai-tool');
        if (defaultExecutor && defaultExecutor.canExecute(task)) {
            return defaultExecutor;
        }

        throw new Error(`No executor found for task: ${task.toolName}`);
    }

    private async checkDependencies(task: Task): Promise<string[]> {
        const unmetDependencies: string[] = [];

        for (const dep of task.dependencies) {
            const depTask = this.tasks.get(dep.taskId);
            if (!depTask) {
                unmetDependencies.push(dep.taskId);
                continue;
            }

            if (dep.required && depTask.status !== TaskStatus.COMPLETED) {
                unmetDependencies.push(dep.taskId);
                continue;
            }

            if (
                dep.condition &&
                depTask.result &&
                !dep.condition(depTask.result)
            ) {
                unmetDependencies.push(dep.taskId);
            }
        }

        return unmetDependencies;
    }

    private async checkDependentTasks(completedTaskId: string): void {
        const dependentTasks = Array.from(this.tasks.values()).filter((task) =>
            task.dependencies.some((dep) => dep.taskId === completedTaskId),
        );

        for (const task of dependentTasks) {
            if (task.status === TaskStatus.PENDING) {
                const unmetDependencies = await this.checkDependencies(task);
                if (unmetDependencies.length === 0) {
                    this.queueTask(task);
                }
            }
        }
    }

    private queueTask(task: Task): void {
        // Add to processing queue based on priority
        const index = this.processingQueue.findIndex(
            (t) =>
                this.getPriorityValue(t.priority) <
                this.getPriorityValue(task.priority),
        );

        if (index === -1) {
            this.processingQueue.push(task);
        } else {
            this.processingQueue.splice(index, 0, task);
        }
    }

    private getPriorityValue(priority: TaskPriority): number {
        switch (priority) {
            case TaskPriority.LOW:
                return 1;
            case TaskPriority.MEDIUM:
                return 2;
            case TaskPriority.HIGH:
                return 3;
            case TaskPriority.URGENT:
                return 4;
            default:
                return 2;
        }
    }

    private async processNextTask(): Promise<void> {
        if (this.processingQueue.length === 0) return;

        this.isProcessing = true;
        const task = this.processingQueue.shift()!;

        try {
            await this.executeTaskInternal(task);
        } catch (error) {
            console.error('Task execution failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async cancelTask(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        if (task.status === TaskStatus.COMPLETED) {
            throw new Error(`Cannot cancel completed task: ${taskId}`);
        }

        // Remove from queue if pending
        if (task.status === TaskStatus.PENDING) {
            const index = this.processingQueue.findIndex(
                (t) => t.id === taskId,
            );
            if (index !== -1) {
                this.processingQueue.splice(index, 1);
            }
        }

        // Cancel running task
        if (task.status === TaskStatus.RUNNING && task.abortController) {
            task.abortController.abort();
        }

        task.status = TaskStatus.CANCELLED;
        task.updatedAt = new Date();

        this.emitTaskEvent('cancelled', task);
        await this.persistence.save(task);
    }

    async updateTaskProgress(
        taskId: string,
        current: number,
        total: number,
        message?: string,
    ): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.progress = { current, total, message };
        task.updatedAt = new Date();

        this.emitTaskEvent('progress', task);
        await this.persistence.save(task);
    }

    async completeTask(
        taskId: string,
        result: { success: boolean; result?: any; error?: string },
    ): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        task.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
        task.completedAt = new Date();
        task.updatedAt = new Date();
        task.result = {
            success: result.success,
            data: result.result,
            error: result.error,
        };

        this.emitTaskEvent(result.success ? 'completed' : 'failed', task);
        await this.persistence.save(task);

        // Check for dependent tasks if completed successfully
        if (result.success) {
            await this.checkDependentTasks(taskId);
        }
    }

    async getTask(taskId: string): Promise<Task | null> {
        return this.tasks.get(taskId) || (await this.persistence.load(taskId));
    }

    async queryTasks(query: TaskQuery): Promise<Task[]> {
        return await this.persistence.query(query);
    }

    async createWorkflow(
        definition: WorkflowDefinition,
        context: TaskExecutionContext,
    ): Promise<Task> {
        return this.createTask(
            definition.name,
            'workflow',
            { definition },
            context,
            {
                type: TaskType.WORKFLOW,
                description: definition.description,
                tags: ['workflow'],
            },
        );
    }

    private generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private emitTaskEvent(
        type: TaskEvent['type'],
        task: Task,
        data?: any,
    ): void {
        const event: TaskEvent = {
            type,
            taskId: task.id,
            task: { ...task },
            timestamp: new Date(),
            data,
        };

        this.emit('taskEvent', event);
        this.emit(`task:${type}`, event);
    }
}

class AIToolExecutor implements TaskExecutor {
    private presentationService: any;

    constructor(presentationService?: any) {
        this.presentationService = presentationService;
    }

    canExecute(task: Task): boolean {
        const tools = ToolFactory.getBuiltInTools();
        return tools.some((tool) => tool.name === task.toolName);
    }

    async execute(task: Task): Promise<TaskResult> {
        if (!this.presentationService) {
            throw new Error(
                'PresentationService not available for tool execution',
            );
        }

        const tools = ToolFactory.getBuiltInTools();
        const tool = tools.find((t) => t.name === task.toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${task.toolName}`);
        }

        // Set the presentation service on the tool
        if (tool.setPresentationService) {
            tool.setPresentationService(this.presentationService);
        }

        const result = await tool.execute(task.toolArgs);

        return {
            success: result.success,
            data: result.data,
            error: result.error,
            artifacts: result.editedSlides?.map((slideId) => ({
                type: 'slide' as const,
                id: slideId,
                name: `Slide ${slideId}`,
            })),
        };
    }

    async cancel(taskId: string): Promise<void> {
        // AI tools don't support cancellation yet
        // This would need to be implemented in the tool system
    }
}

class WorkflowExecutor implements TaskExecutor {
    constructor(private taskManager: TaskManager) {}

    canExecute(task: Task): boolean {
        return task.toolName === 'workflow' && task.toolArgs.definition;
    }

    async execute(task: Task): Promise<TaskResult> {
        const definition = task.toolArgs.definition as WorkflowDefinition;
        const subtasks: string[] = [];

        // Create subtasks for each workflow step
        for (const step of definition.steps) {
            const subtask = await this.taskManager.createTask(
                step.name,
                step.toolName,
                step.toolArgs,
                task.context,
                {
                    type: TaskType.DEPENDENT,
                    priority: task.priority,
                    dependencies: step.dependencies,
                    tags: ['workflow-step'],
                    metadata: { workflowId: definition.id, stepId: step.id },
                },
            );

            subtasks.push(subtask.id);
        }

        // Update parent task with subtasks
        task.subtasks = subtasks;

        return {
            success: true,
            data: { subtasks },
            artifacts: [],
        };
    }

    async cancel(taskId: string): Promise<void> {
        // Cancel all subtasks
        const task = await this.taskManager.getTask(taskId);
        if (task) {
            for (const subtaskId of task.subtasks) {
                await this.taskManager.cancelTask(subtaskId);
            }
        }
    }
}
