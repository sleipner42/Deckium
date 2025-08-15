import { TaskManager } from '../tasks/task-manager';
import { TaskPriority, TaskType } from '../tasks/types';
import { AITool } from './ai-tool';
import { AIToolResult } from './ai-tool-result';

export class CreateTaskTool extends AITool {
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        super();
        this.taskManager = taskManager;
    }

    get name(): string {
        return 'create_task';
    }

    get description(): string {
        return 'Create a new task for complex operations that should run in the background';
    }

    get parameters(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Human-readable name for the task',
                },
                toolName: {
                    type: 'string',
                    description: 'Name of the tool to execute',
                },
                toolArgs: {
                    type: 'object',
                    description: 'Arguments to pass to the tool',
                },
                type: {
                    type: 'string',
                    enum: [
                        'immediate',
                        'background',
                        'scheduled',
                        'dependent',
                        'workflow',
                    ],
                    description: 'Type of task execution',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'urgent'],
                    description: 'Task priority',
                },
                description: {
                    type: 'string',
                    description: 'Optional description of what the task does',
                },
                scheduledFor: {
                    type: 'string',
                    description:
                        'ISO date string for when to execute (for scheduled tasks)',
                },
                dependencies: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Array of task IDs that must complete before this task',
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags to categorize the task',
                },
            },
            required: ['name', 'toolName', 'toolArgs'],
        };
    }

    async execute(args: Record<string, any>): Promise<AIToolResult> {
        try {
            const context = {
                threadId: args.threadId || 'default',
                presentationId: args.presentationId,
                toolContext: args.toolContext,
            };

            const task = await this.taskManager.createTask(
                args.name,
                args.toolName,
                args.toolArgs,
                context,
                {
                    type: args.type || TaskType.BACKGROUND,
                    priority: args.priority || TaskPriority.MEDIUM,
                    description: args.description,
                    scheduledFor: args.scheduledFor
                        ? new Date(args.scheduledFor)
                        : undefined,
                    dependencies: args.dependencies || [],
                    tags: args.tags || [],
                },
            );

            return new AIToolResult(
                true,
                `Task created successfully: ${task.name} (ID: ${task.id})`,
                {
                    taskId: task.id,
                    name: task.name,
                    status: task.status,
                    type: task.type,
                    priority: task.priority,
                    createdAt: task.createdAt,
                },
            );
        } catch (error) {
            return new AIToolResult(
                false,
                `Failed to create task: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}

export class GetTaskStatusTool extends AITool {
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        super();
        this.taskManager = taskManager;
    }

    get name(): string {
        return 'get_task_status';
    }

    get description(): string {
        return 'Get the current status and progress of a task';
    }

    get parameters(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'ID of the task to check',
                },
            },
            required: ['taskId'],
        };
    }

    async execute(args: Record<string, any>): Promise<AIToolResult> {
        try {
            const task = await this.taskManager.getTask(args.taskId);

            if (!task) {
                return new AIToolResult(
                    false,
                    `Task not found: ${args.taskId}`,
                );
            }

            const progressPercent =
                task.progress.total > 0
                    ? Math.round(
                          (task.progress.current / task.progress.total) * 100,
                      )
                    : 0;

            return new AIToolResult(
                true,
                `Task status: ${task.status} (${progressPercent}% complete)`,
                {
                    id: task.id,
                    name: task.name,
                    status: task.status,
                    progress: {
                        percent: progressPercent,
                        current: task.progress.current,
                        total: task.progress.total,
                        message: task.progress.message,
                    },
                    result: task.result,
                    createdAt: task.createdAt,
                    startedAt: task.startedAt,
                    completedAt: task.completedAt,
                },
            );
        } catch (error) {
            return new AIToolResult(
                false,
                `Failed to get task status: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}

export class CancelTaskTool extends AITool {
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        super();
        this.taskManager = taskManager;
    }

    get name(): string {
        return 'cancel_task';
    }

    get description(): string {
        return 'Cancel a running or pending task';
    }

    get parameters(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'ID of the task to cancel',
                },
            },
            required: ['taskId'],
        };
    }

    async execute(args: Record<string, any>): Promise<AIToolResult> {
        try {
            await this.taskManager.cancelTask(args.taskId);

            return new AIToolResult(
                true,
                `Task cancelled successfully: ${args.taskId}`,
            );
        } catch (error) {
            return new AIToolResult(
                false,
                `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}

export class ListTasksTool extends AITool {
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        super();
        this.taskManager = taskManager;
    }

    get name(): string {
        return 'list_tasks';
    }

    get description(): string {
        return 'List tasks with optional filtering';
    }

    get parameters(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                status: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: [
                            'pending',
                            'running',
                            'paused',
                            'completed',
                            'failed',
                            'cancelled',
                        ],
                    },
                    description: 'Filter by task status',
                },
                type: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: [
                            'immediate',
                            'background',
                            'scheduled',
                            'dependent',
                            'workflow',
                        ],
                    },
                    description: 'Filter by task type',
                },
                threadId: {
                    type: 'string',
                    description: 'Filter by thread ID',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of tasks to return',
                },
            },
        };
    }

    async execute(args: Record<string, any>): Promise<AIToolResult> {
        try {
            const tasks = await this.taskManager.queryTasks({
                filter: {
                    status: args.status,
                    type: args.type,
                    threadId: args.threadId,
                },
                sort: {
                    field: 'createdAt',
                    order: 'desc',
                },
                limit: args.limit || 20,
            });

            const taskSummaries = tasks.map((task) => ({
                id: task.id,
                name: task.name,
                status: task.status,
                type: task.type,
                priority: task.priority,
                toolName: task.toolName,
                progress: task.progress,
                createdAt: task.createdAt,
                completedAt: task.completedAt,
            }));

            return new AIToolResult(
                true,
                `Found ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`,
                {
                    tasks: taskSummaries,
                    total: tasks.length,
                },
            );
        } catch (error) {
            return new AIToolResult(
                false,
                `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}

export class CreateWorkflowTool extends AITool {
    private taskManager: TaskManager;

    constructor(taskManager: TaskManager) {
        super();
        this.taskManager = taskManager;
    }

    get name(): string {
        return 'create_workflow';
    }

    get description(): string {
        return 'Create a multi-step workflow with dependent tasks';
    }

    get parameters(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Name of the workflow',
                },
                description: {
                    type: 'string',
                    description: 'Description of what the workflow does',
                },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            toolName: { type: 'string' },
                            toolArgs: { type: 'object' },
                            dependencies: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                        },
                        required: ['name', 'toolName', 'toolArgs'],
                    },
                    description: 'Array of workflow steps',
                },
            },
            required: ['name', 'steps'],
        };
    }

    async execute(args: Record<string, any>): Promise<AIToolResult> {
        try {
            const workflowDefinition = {
                id: `workflow_${Date.now()}`,
                name: args.name,
                description: args.description,
                steps: args.steps.map((step: any, index: number) => ({
                    id: `step_${index}`,
                    name: step.name,
                    toolName: step.toolName,
                    toolArgs: step.toolArgs,
                    dependencies: step.dependencies || [],
                })),
            };

            const context = {
                threadId: args.threadId || 'default',
                presentationId: args.presentationId,
                toolContext: args.toolContext,
            };

            const task = await this.taskManager.createWorkflow(
                workflowDefinition,
                context,
            );

            return new AIToolResult(
                true,
                `Workflow created successfully: ${args.name} (ID: ${task.id})`,
                {
                    taskId: task.id,
                    workflowId: workflowDefinition.id,
                    name: args.name,
                    steps: workflowDefinition.steps.length,
                    status: task.status,
                },
            );
        } catch (error) {
            return new AIToolResult(
                false,
                `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}
