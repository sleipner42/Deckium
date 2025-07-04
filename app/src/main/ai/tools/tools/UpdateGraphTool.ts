import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import type { Graph } from '../../../../common/domain/entities/types';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class UpdateGraphTool extends BaseTool {
    name = 'updateGraph';

    description = 'Update an existing graph element by changing its DOT content or other properties';

    requiredParams = {
        elementId: 'The ID of the graph element to update',
        content:
            'The new graph content in DOT format (optional). DOT is a graph description language used by Graphviz.\n\n' +
            'BASIC STRUCTURE:\n' +
            '- Directed graph: digraph { A -> B; B -> C; }\n' +
            '- Undirected graph: graph { A -- B; B -- C; }\n\n' +
            'NODE DEFINITIONS:\n' +
            '- Simple node: A\n' +
            '- Labeled node: A [label="Node A"]\n' +
            '- Multiple nodes: A B C\n\n' +
            'EDGE DEFINITIONS:\n' +
            '- Directed edge: A -> B\n' +
            '- Undirected edge: A -- B\n' +
            '- Multiple edges: A -> B; B -> C; C -> A;\n\n' +
            'EXAMPLES:\n' +
            '- Simple flow: digraph { Start -> Process -> End; }\n' +
            '- Labeled nodes: digraph { A [label="Input"]; B [label="Process"]; C [label="Output"]; A -> B -> C; }\n' +
            '- Network: graph { Server -- Router; Router -- Client1; Router -- Client2; }\n' +
            '- Hierarchical: digraph { CEO -> Manager1; CEO -> Manager2; Manager1 -> Employee1; Manager1 -> Employee2; }\n\n' +
            'TIPS:\n' +
            '- Use semicolons to separate statements\n' +
            '- Use quotes for labels with spaces\n' +
            '- Keep it simple for best visualization',
        x: 'New X position of the graph (optional)',
        y: 'New Y position of the graph (optional)',
        width: 'New width of the graph (optional)',
        height: 'New height of the graph (optional)',
        backgroundColor:
            'New background color of the graph (optional). Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla formats to include opacity/transparency.',
        borderRadius:
            'New border radius of the graph container (optional)',
        zIndex: 'New z-index of the graph (optional) - controls stacking order with higher values appearing on top',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { elementId } = params;

        if (!elementId) {
            return {
                success: false,
                error: 'elementId is required',
            };
        }

        const presentation = presentationService.getPresentation();
        
        // Find the element across all slides
        let targetSlide = null;
        let targetElement = null;

        for (const slide of presentation.slides) {
            const element = slide.elements.find((el) => el.id === elementId);
            if (element) {
                if (element.type !== 'graph') {
                    return {
                        success: false,
                        error: `Element with ID ${elementId} is not a graph element (found type: ${element.type})`,
                    };
                }
                targetSlide = slide;
                targetElement = element as Graph;
                break;
            }
        }

        if (!targetElement || !targetSlide) {
            return {
                success: false,
                error: `Graph element with ID ${elementId} not found`,
            };
        }

        // Build updates object with only provided parameters
        const updates: Partial<Graph> = {};

        if (params.content !== undefined) {
            updates.content = params.content;
        }

        if (params.x !== undefined || params.y !== undefined) {
            updates.position = {
                x: params.x !== undefined ? Number(params.x) : targetElement.position.x,
                y: params.y !== undefined ? Number(params.y) : targetElement.position.y,
            };
        }

        if (params.width !== undefined || params.height !== undefined) {
            updates.size = {
                width: params.width !== undefined ? Number(params.width) : targetElement.size.width,
                height: params.height !== undefined ? Number(params.height) : targetElement.size.height,
            };
        }

        if (params.backgroundColor !== undefined) {
            updates.backgroundColor = params.backgroundColor;
        }

        if (params.borderRadius !== undefined) {
            updates.borderRadius = Number(params.borderRadius);
        }

        if (params.zIndex !== undefined) {
            updates.zIndex = Number(params.zIndex);
        }

        if (Object.keys(updates).length === 0) {
            return {
                success: false,
                error: 'At least one property must be provided to update',
            };
        }

        const updatedSlide = presentationService.updateElement(elementId, updates);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to update graph element with ID ${elementId}`,
            };
        }

        // Find the updated element
        const updatedElement = updatedSlide.elements.find((el) => el.id === elementId) as Graph;
        
        let changeDescription = 'Graph element updated successfully:';
        if (updates.content) changeDescription += ' content modified,';
        if (updates.position) changeDescription += ` moved to (${updates.position.x}, ${updates.position.y}),`;
        if (updates.size) changeDescription += ` resized to ${updates.size.width}x${updates.size.height}px,`;
        if (updates.backgroundColor) changeDescription += ` background color changed to ${updates.backgroundColor},`;
        if (updates.borderRadius) changeDescription += ` border radius changed to ${updates.borderRadius}px,`;
        if (updates.zIndex) changeDescription += ` z-index changed to ${updates.zIndex},`;
        
        // Remove trailing comma
        changeDescription = changeDescription.replace(/,$/, '.');

        return {
            success: true,
            data: {
                elementId: updatedElement.id,
                slideId: targetSlide.id,
                position: updatedElement.position,
                size: updatedElement.size,
                content: updatedElement.content,
                backgroundColor: updatedElement.backgroundColor,
                borderRadius: updatedElement.borderRadius,
                zIndex: updatedElement.zIndex,
            },
            message: changeDescription,
        };
    }
}