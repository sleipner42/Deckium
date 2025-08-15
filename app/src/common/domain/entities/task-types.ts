export enum TaskType {
    IMMEDIATE = 'immediate', // Execute now (current behavior)
    BACKGROUND = 'background', // Execute in background
    SCHEDULED = 'scheduled', // Execute at specific time
    DEPENDENT = 'dependent', // Execute after dependencies complete
    WORKFLOW = 'workflow', // Multi-step task with subtasks
}

export enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

export interface TaskProgress {
    current: number;
    total: number;
    message?: string;
    details?: Record<string, any>;
}

export interface TaskResult {
    success: boolean;
    data?: any;
    error?: string;
    artifacts?: TaskArtifact[];
}

export interface TaskArtifact {
    type: 'slide' | 'image' | 'file' | 'screenshot';
    id: string;
    name: string;
    data?: any;
}

export interface TaskDependency {
    taskId: string;
    required: boolean;
    condition?: (result: TaskResult) => boolean;
}

export interface TaskExecutionContext {
    threadId: string;
    userId?: string;
    presentationId?: string;
    toolContext?: Record<string, any>;
}

export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    priority: TaskPriority;

    // Basic metadata
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;

    // Execution details
    toolName: string;
    toolArgs: Record<string, any>;
    context: TaskExecutionContext;

    // Progress tracking
    progress: TaskProgress;
    result?: TaskResult;

    // Dependencies and scheduling
    dependencies: TaskDependency[];
    scheduledFor?: Date;
    retryCount: number;
    maxRetries: number;

    // Workflow management
    parentTaskId?: string;
    subtasks: string[];

    // Cancellation
    abortController?: AbortController;

    // Metadata
    tags: string[];
    metadata: Record<string, any>;
}

export interface TaskEvent {
    type:
        | 'created'
        | 'started'
        | 'progress'
        | 'completed'
        | 'failed'
        | 'cancelled';
    taskId: string;
    task: Task;
    timestamp: Date;
    data?: any;
}

export interface TaskFilter {
    status?: TaskStatus[];
    type?: TaskType[];
    priority?: TaskPriority[];
    threadId?: string;
    presentationId?: string;
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export interface TaskQuery {
    filter?: TaskFilter;
    sort?: {
        field: keyof Task;
        order: 'asc' | 'desc';
    };
    limit?: number;
    offset?: number;
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    variables?: Record<string, any>;
}

export interface WorkflowStep {
    id: string;
    name: string;
    toolName: string;
    toolArgs: Record<string, any>;
    dependencies: string[];
    condition?: string; // JavaScript expression
    onSuccess?: WorkflowAction[];
    onFailure?: WorkflowAction[];
}

export interface WorkflowAction {
    type: 'continue' | 'stop' | 'retry' | 'skip' | 'branch';
    target?: string;
    params?: Record<string, any>;
}
