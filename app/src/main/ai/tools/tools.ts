import { AITool } from './AITool';
import { ToolFactory } from './ToolFactory';

export class AIToolsService {
    private tools: AITool[];

    constructor() {
        this.tools = ToolFactory.getBuiltInTools();
    }

    getTools(): AITool[] {
        return this.tools;
    }
}
