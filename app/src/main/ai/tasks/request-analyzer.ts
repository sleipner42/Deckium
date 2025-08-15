import {
    TaskPriority,
    TaskType,
} from '../../../common/domain/entities/task-types';

export interface RequestAnalysis {
    complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
    estimatedTools: number;
    suggestedTasks: TaskSuggestion[];
    executionType: 'DIRECT' | 'PROGRESSIVE' | 'TASK_BASED';
    confidence: number;
}

export interface TaskSuggestion {
    name: string;
    description: string;
    toolName: string;
    priority: TaskPriority;
    type: TaskType;
    estimatedDuration: number; // in seconds
    dependencies?: string[];
}

export class RequestAnalyzer {
    // Complexity indicators for different request types
    private static readonly COMPLEXITY_INDICATORS = {
        SIMPLE: [
            'add text',
            'make bold',
            'change color',
            'resize',
            'move',
            'delete',
            'copy',
            'paste',
            'align',
            'update text',
        ],
        MEDIUM: [
            'add chart',
            'add image',
            'create slide',
            'add multiple',
            'format slide',
            'style slide',
            'add bullet points',
        ],
        COMPLEX: [
            'create presentation',
            'presentation about',
            'slide deck',
            'entire presentation',
            'full presentation',
            'complete presentation',
            'presentation on',
            'make a presentation',
            'build presentation',
        ],
    };

    // Tool mapping for different requests
    private static readonly TOOL_PATTERNS = {
        'add text': ['addTextElement'],
        'create slide': ['createSlide', 'addTextElement'],
        'add chart': ['createBarChart', 'addTextElement'],
        'add image': ['searchPexelsImages', 'addImageFromUrl'],
        'create presentation': [
            'createSlide',
            'addTextElement',
            'createBarChart',
            'searchPexelsImages',
            'alignElements',
        ],
        'presentation about': [
            'createSlide',
            'addTextElement',
            'createBarChart',
            'searchPexelsImages',
            'getDataFromUrl',
        ],
    };

    // Topic-based slide count estimation
    private static readonly TOPIC_SLIDE_ESTIMATES = {
        introduction: 3,
        overview: 5,
        tutorial: 8,
        training: 10,
        course: 15,
        workshop: 12,
        conference: 20,
        thesis: 25,
        research: 18,
    };

    static analyzeRequest(userMessage: string): RequestAnalysis {
        const normalizedMessage = userMessage.toLowerCase();

        // Detect complexity based on keywords
        const complexity = RequestAnalyzer.detectComplexity(normalizedMessage);

        // Estimate tools needed
        const estimatedTools =
            RequestAnalyzer.estimateToolsNeeded(normalizedMessage);

        // Generate task suggestions
        const suggestedTasks = RequestAnalyzer.generateTaskSuggestions(
            normalizedMessage,
            complexity,
        );

        // Determine execution type
        const executionType = RequestAnalyzer.determineExecutionType(
            complexity,
            estimatedTools,
        );

        // Calculate confidence
        const confidence = RequestAnalyzer.calculateConfidence(
            normalizedMessage,
            complexity,
        );

        return {
            complexity,
            estimatedTools,
            suggestedTasks,
            executionType,
            confidence,
        };
    }

    private static detectComplexity(
        message: string,
    ): 'SIMPLE' | 'MEDIUM' | 'COMPLEX' {
        // Check for complex indicators first
        for (const indicator of RequestAnalyzer.COMPLEXITY_INDICATORS.COMPLEX) {
            if (message.includes(indicator)) {
                return 'COMPLEX';
            }
        }

        // Check for medium indicators
        for (const indicator of RequestAnalyzer.COMPLEXITY_INDICATORS.MEDIUM) {
            if (message.includes(indicator)) {
                return 'MEDIUM';
            }
        }

        // Default to simple
        return 'SIMPLE';
    }

    private static estimateToolsNeeded(message: string): number {
        let toolCount = 0;

        // Count potential tools based on patterns
        for (const [pattern, tools] of Object.entries(
            RequestAnalyzer.TOOL_PATTERNS,
        )) {
            if (message.includes(pattern)) {
                toolCount += tools.length;
            }
        }

        // If no patterns matched, estimate based on complexity
        if (toolCount === 0) {
            if (message.includes('presentation')) {
                toolCount = 8; // Average for a presentation
            } else if (message.includes('slide')) {
                toolCount = 3; // Average for a slide
            } else {
                toolCount = 1; // Single action
            }
        }

        return toolCount;
    }

    private static generateTaskSuggestions(
        message: string,
        complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX',
    ): TaskSuggestion[] {
        const tasks: TaskSuggestion[] = [];

        if (complexity === 'SIMPLE') {
            // For simple requests, create a single task
            tasks.push({
                name: RequestAnalyzer.generateSimpleTaskName(message),
                description: `Execute user request: ${message}`,
                toolName: RequestAnalyzer.inferToolFromMessage(message),
                priority: TaskPriority.HIGH,
                type: TaskType.IMMEDIATE,
                estimatedDuration: 5,
            });
        } else if (complexity === 'MEDIUM') {
            // For medium requests, create 2-5 tasks
            tasks.push(...RequestAnalyzer.generateMediumTasks(message));
        } else {
            // For complex requests, create comprehensive task breakdown
            tasks.push(...RequestAnalyzer.generateComplexTasks(message));
        }

        return tasks;
    }

    private static generateSimpleTaskName(message: string): string {
        if (message.includes('add text')) return 'Add text element';
        if (message.includes('create slide')) return 'Create new slide';
        if (message.includes('add chart')) return 'Add chart';
        if (message.includes('add image')) return 'Add image';
        if (message.includes('align')) return 'Align elements';
        if (message.includes('delete')) return 'Delete element';
        if (message.includes('update')) return 'Update content';
        return 'Process request';
    }

    private static generateMediumTasks(message: string): TaskSuggestion[] {
        const tasks: TaskSuggestion[] = [];

        if (message.includes('slide')) {
            tasks.push({
                name: 'Create slide structure',
                description: 'Set up the basic slide layout',
                toolName: 'createSlide',
                priority: TaskPriority.HIGH,
                type: TaskType.IMMEDIATE,
                estimatedDuration: 10,
            });

            tasks.push({
                name: 'Add content elements',
                description: 'Add text, images, or other content',
                toolName: 'addTextElement',
                priority: TaskPriority.HIGH,
                type: TaskType.IMMEDIATE,
                estimatedDuration: 15,
            });

            if (message.includes('chart') || message.includes('data')) {
                tasks.push({
                    name: 'Add data visualization',
                    description: 'Create charts or graphs',
                    toolName: 'createBarChart',
                    priority: TaskPriority.MEDIUM,
                    type: TaskType.IMMEDIATE,
                    estimatedDuration: 20,
                });
            }
        }

        return tasks;
    }

    private static generateComplexTasks(message: string): TaskSuggestion[] {
        const tasks: TaskSuggestion[] = [];
        const topic = RequestAnalyzer.extractTopic(message);
        const estimatedSlides = RequestAnalyzer.estimateSlideCount(
            message,
            topic,
        );

        // 1. Research and Planning
        tasks.push({
            name: `Research topic: ${topic}`,
            description: `Gather information and data about ${topic}`,
            toolName: 'getDataFromUrl',
            priority: TaskPriority.HIGH,
            type: TaskType.IMMEDIATE,
            estimatedDuration: 30,
        });

        // 2. Create title slide
        tasks.push({
            name: 'Create title slide',
            description: `Create an engaging title slide for ${topic}`,
            toolName: 'addTextElement',
            priority: TaskPriority.HIGH,
            type: TaskType.IMMEDIATE,
            estimatedDuration: 15,
            dependencies: ['Research topic: ' + topic],
        });

        // 3. Create outline/agenda slide
        tasks.push({
            name: 'Create outline slide',
            description: 'Create a slide outlining the presentation structure',
            toolName: 'addTextElement',
            priority: TaskPriority.HIGH,
            type: TaskType.IMMEDIATE,
            estimatedDuration: 10,
            dependencies: ['Research topic: ' + topic],
        });

        // 4. Create content slides
        for (let i = 1; i <= Math.min(estimatedSlides - 2, 8); i++) {
            tasks.push({
                name: `Create content slide ${i}`,
                description: `Create slide ${i} with relevant content about ${topic}`,
                toolName: 'createSlide',
                priority: TaskPriority.HIGH,
                type: TaskType.IMMEDIATE,
                estimatedDuration: 25,
                dependencies: ['Create outline slide'],
            });
        }

        // 5. Add visual elements
        tasks.push({
            name: 'Add visual elements',
            description: 'Search for and add relevant images',
            toolName: 'searchPexelsImages',
            priority: TaskPriority.MEDIUM,
            type: TaskType.BACKGROUND,
            estimatedDuration: 45,
        });

        // 6. Add data visualizations
        if (RequestAnalyzer.topicLikelyNeedsCharts(topic)) {
            tasks.push({
                name: 'Create data visualizations',
                description: 'Add charts and graphs to support the content',
                toolName: 'createBarChart',
                priority: TaskPriority.MEDIUM,
                type: TaskType.IMMEDIATE,
                estimatedDuration: 30,
            });
        }

        // 7. Apply consistent styling
        tasks.push({
            name: 'Apply consistent styling',
            description: 'Ensure consistent design across all slides',
            toolName: 'alignElements',
            priority: TaskPriority.LOW,
            type: TaskType.BACKGROUND,
            estimatedDuration: 20,
        });

        // 8. Create conclusion slide
        tasks.push({
            name: 'Create conclusion slide',
            description: 'Summarize key points and provide next steps',
            toolName: 'addTextElement',
            priority: TaskPriority.MEDIUM,
            type: TaskType.IMMEDIATE,
            estimatedDuration: 15,
        });

        return tasks;
    }

    private static extractTopic(message: string): string {
        const aboutMatch = message.match(/about\s+([^.?!]+)/i);
        const onMatch = message.match(/on\s+([^.?!]+)/i);
        const forMatch = message.match(/for\s+([^.?!]+)/i);

        if (aboutMatch) return aboutMatch[1].trim();
        if (onMatch) return onMatch[1].trim();
        if (forMatch) return forMatch[1].trim();

        return 'the topic';
    }

    private static estimateSlideCount(message: string, topic: string): number {
        // Check for explicit slide count
        const slideCountMatch = message.match(/(\d+)\s+slides?/i);
        if (slideCountMatch) {
            return parseInt(slideCountMatch[1]);
        }

        // Estimate based on topic type
        const topicLower = topic.toLowerCase();
        for (const [keyword, count] of Object.entries(
            RequestAnalyzer.TOPIC_SLIDE_ESTIMATES,
        )) {
            if (topicLower.includes(keyword)) {
                return count;
            }
        }

        // Default estimation based on complexity indicators
        if (message.includes('comprehensive') || message.includes('detailed'))
            return 15;
        if (message.includes('overview') || message.includes('introduction'))
            return 8;
        if (message.includes('brief') || message.includes('summary')) return 5;

        return 10; // Default
    }

    private static topicLikelyNeedsCharts(topic: string): boolean {
        const chartKeywords = [
            'data',
            'statistics',
            'analysis',
            'research',
            'metrics',
            'performance',
            'results',
            'trends',
            'comparison',
            'growth',
            'sales',
            'revenue',
            'market',
            'financial',
            'budget',
        ];

        return chartKeywords.some((keyword) =>
            topic.toLowerCase().includes(keyword),
        );
    }

    private static inferToolFromMessage(message: string): string {
        if (message.includes('text')) return 'addTextElement';
        if (message.includes('slide')) return 'createSlide';
        if (message.includes('chart')) return 'createBarChart';
        if (message.includes('image')) return 'searchPexelsImages';
        if (message.includes('align')) return 'alignElements';
        if (message.includes('delete')) return 'deleteElement';
        if (message.includes('shape')) return 'createShape';
        return 'getPresentationInfo';
    }

    private static determineExecutionType(
        complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX',
        toolCount: number,
    ): 'DIRECT' | 'PROGRESSIVE' | 'TASK_BASED' {
        if (complexity === 'SIMPLE' && toolCount <= 2) {
            return 'DIRECT';
        } else if (complexity === 'MEDIUM' && toolCount <= 5) {
            return 'PROGRESSIVE';
        } else {
            return 'TASK_BASED';
        }
    }

    private static calculateConfidence(
        message: string,
        complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX',
    ): number {
        let confidence = 0.5; // Base confidence

        // Increase confidence for clear indicators
        const indicators = [
            ...RequestAnalyzer.COMPLEXITY_INDICATORS.SIMPLE,
            ...RequestAnalyzer.COMPLEXITY_INDICATORS.MEDIUM,
            ...RequestAnalyzer.COMPLEXITY_INDICATORS.COMPLEX,
        ];

        const matchedIndicators = indicators.filter((indicator) =>
            message.includes(indicator),
        );
        confidence += matchedIndicators.length * 0.1;

        // Increase confidence for specific patterns
        if (
            message.includes('create') ||
            message.includes('add') ||
            message.includes('make')
        ) {
            confidence += 0.2;
        }

        // Cap confidence at 1.0
        return Math.min(confidence, 1.0);
    }
}
