import { Thread } from '../../../common/domain/entities/ai-types';
import { AIEventBus } from '../event-bus';
import { AIService } from '../service';
import { AIToolsService } from '../tools/tools';
import { TaskManager } from './task-manager';
import { TaskExecutionContext, TaskPriority, TaskType } from './types';

export class AITaskIntegration {
    private aiService: AIService;
    private taskManager: TaskManager;
    private eventBus: AIEventBus;
    private toolsService: AIToolsService;

    constructor(
        aiService: AIService,
        taskManager: TaskManager,
        eventBus: AIEventBus,
        toolsService: AIToolsService,
    ) {
        this.aiService = aiService;
        this.taskManager = taskManager;
        this.eventBus = eventBus;
        this.toolsService = toolsService;

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Listen for task events and broadcast them through AI event bus
        this.taskManager.on('taskEvent', (event) => {
            this.eventBus.broadcastTaskEvent(event);
        });

        // Listen for AI processing events to manage task context
        this.eventBus.on('processingStarted', (threadId: string) => {
            this.handleProcessingStarted(threadId);
        });

        this.eventBus.on('processingComplete', (threadId: string) => {
            this.handleProcessingComplete(threadId);
        });
    }

    private handleProcessingStarted(threadId: string): void {
        // Mark any running tasks for this thread as context-aware
        console.log(`AI processing started for thread: ${threadId}`);
    }

    private handleProcessingComplete(threadId: string): void {
        // Clean up any thread-specific task context
        console.log(`AI processing completed for thread: ${threadId}`);
    }

    /**
     * Enhanced tool execution that supports both immediate and task-based execution
     */
    async executeToolWithTaskSupport(
        toolCall: any,
        thread: Thread,
        abortSignal?: AbortSignal,
    ): Promise<any> {
        const toolName = toolCall.tool;
        const toolParams = toolCall.params || {};

        // Check if this tool should create a task instead of executing immediately
        const shouldCreateTask = this.shouldCreateTask(toolName, toolParams);

        if (shouldCreateTask) {
            return this.createTaskForTool(toolCall, thread, abortSignal);
        } else {
            // Execute immediately (existing behavior)
            return this.toolsService.executeTool(toolCall);
        }
    }

    private shouldCreateTask(toolName: string, toolParams: any): boolean {
        // Define which tools should create tasks based on complexity/duration
        const taskRequiredTools = [
            'create_multi_slide_presentation',
            'analyze_large_dataset',
            'generate_complex_chart',
            'process_bulk_images',
            'export_presentation',
            'import_external_data',
        ];

        // Check if tool is in the task-required list
        if (taskRequiredTools.includes(toolName)) {
            return true;
        }

        // Check for tool parameters that indicate complexity
        if (
            toolParams.slides &&
            Array.isArray(toolParams.slides) &&
            toolParams.slides.length > 5
        ) {
            return true;
        }

        if (toolParams.duration && toolParams.duration > 30000) {
            // 30 seconds
            return true;
        }

        if (toolParams.complexity && toolParams.complexity === 'high') {
            return true;
        }

        return false;
    }

    private async createTaskForTool(
        toolCall: any,
        thread: Thread,
        abortSignal?: AbortSignal,
    ): Promise<any> {
        const context: TaskExecutionContext = {
            threadId: thread.id,
            toolContext: {
                abortSignal: abortSignal,
                threadMessages: thread.messages.length,
            },
        };

        // Determine task type based on tool characteristics
        const taskType = this.getTaskTypeForTool(toolCall.tool);
        const priority = this.getPriorityForTool(toolCall.tool);

        const task = await this.taskManager.createTask(
            `Execute ${toolCall.tool}`,
            toolCall.tool,
            toolCall.params || {},
            context,
            {
                type: taskType,
                priority: priority,
                description: `AI requested execution of ${toolCall.tool}`,
                tags: ['ai-requested', 'tool-execution'],
            },
        );

        // Return task reference for immediate feedback
        return {
            success: true,
            data: {
                taskId: task.id,
                message: `Task created: ${task.name}`,
                taskType: task.type,
                status: task.status,
            },
            isTask: true,
        };
    }

    private getTaskTypeForTool(toolName: string): TaskType {
        // Map tool names to appropriate task types
        const immediateTools = [
            'get_slide_info',
            'get_current_slide',
            'take_screenshot',
        ];
        const backgroundTools = ['export_presentation', 'import_external_data'];
        const workflowTools = ['create_multi_slide_presentation'];

        if (immediateTools.includes(toolName)) {
            return TaskType.IMMEDIATE;
        } else if (backgroundTools.includes(toolName)) {
            return TaskType.BACKGROUND;
        } else if (workflowTools.includes(toolName)) {
            return TaskType.WORKFLOW;
        }

        return TaskType.BACKGROUND;
    }

    private getPriorityForTool(toolName: string): TaskPriority {
        // Map tool names to priorities
        const highPriorityTools = [
            'create_slide',
            'update_slide',
            'delete_slide',
        ];
        const mediumPriorityTools = [
            'add_text_element',
            'create_shape',
            'add_image',
        ];
        const lowPriorityTools = ['export_presentation', 'take_screenshot'];

        if (highPriorityTools.includes(toolName)) {
            return TaskPriority.HIGH;
        } else if (mediumPriorityTools.includes(toolName)) {
            return TaskPriority.MEDIUM;
        } else if (lowPriorityTools.includes(toolName)) {
            return TaskPriority.LOW;
        }

        return TaskPriority.MEDIUM;
    }

    /**
     * Create a workflow task for complex multi-step operations
     */
    async createWorkflowTask(
        name: string,
        steps: Array<{
            toolName: string;
            toolArgs: any;
            dependencies?: string[];
        }>,
        thread: Thread,
    ): Promise<any> {
        const workflowDefinition = {
            id: `workflow_${Date.now()}`,
            name,
            steps: steps.map((step, index) => ({
                id: `step_${index}`,
                name: `Step ${index + 1}: ${step.toolName}`,
                toolName: step.toolName,
                toolArgs: step.toolArgs,
                dependencies: step.dependencies || [],
            })),
        };

        const context: TaskExecutionContext = {
            threadId: thread.id,
            toolContext: {
                threadMessages: thread.messages.length,
            },
        };

        const task = await this.taskManager.createWorkflow(
            workflowDefinition,
            context,
        );

        return {
            success: true,
            data: {
                taskId: task.id,
                workflowId: workflowDefinition.id,
                message: `Workflow created: ${name}`,
                steps: workflowDefinition.steps.length,
            },
            isTask: true,
        };
    }

    /**
     * Get task status for AI to provide feedback
     */
    async getTaskStatus(taskId: string): Promise<any> {
        const task = await this.taskManager.getTask(taskId);
        if (!task) {
            return {
                success: false,
                error: `Task not found: ${taskId}`,
            };
        }

        return {
            success: true,
            data: {
                id: task.id,
                name: task.name,
                status: task.status,
                progress: task.progress,
                result: task.result,
                createdAt: task.createdAt,
                completedAt: task.completedAt,
            },
        };
    }

    /**
     * Cancel a task requested by AI
     */
    async cancelTask(taskId: string): Promise<any> {
        try {
            await this.taskManager.cancelTask(taskId);
            return {
                success: true,
                data: {
                    message: `Task cancelled: ${taskId}`,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Get active tasks for the current thread
     */
    async getActiveTasks(threadId: string): Promise<any> {
        const tasks = await this.taskManager.queryTasks({
            filter: {
                threadId,
                status: ['pending', 'running', 'paused'],
            },
            sort: {
                field: 'createdAt',
                order: 'desc',
            },
        });

        return {
            success: true,
            data: {
                tasks: tasks.map((task) => ({
                    id: task.id,
                    name: task.name,
                    status: task.status,
                    progress: task.progress,
                    toolName: task.toolName,
                    createdAt: task.createdAt,
                })),
            },
        };
    }
}
