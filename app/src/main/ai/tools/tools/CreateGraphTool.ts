import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { createGraph } from '../../../../common/domain/entities/element-factory';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class CreateGraphTool extends BaseTool {
    name = 'createGraph';

    description = 'Create a graph visualization element using DOT format';

    requiredParams = {
        slideId: 'The ID of the slide to add the graph to',
        content:
            'The graph content in DOT format. DOT is a graph description language used by Graphviz.\n\n' +
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
        x: 'X position of the graph (optional, defaults to center)',
        y: 'Y position of the graph (optional, defaults to center)',
        positionReference:
            'The reference position of the element (optional, defaults to top left), choose from top left or center',
        width: 'The width of the graph (optional, defaults to 500)',
        height: 'The height of the graph (optional, defaults to 400)',
        backgroundColor:
            'The background color of the graph (optional, defaults to transparent). Supports hex (#ff0000), rgb (rgb(255,0,0)), rgba (rgba(255,0,0,0.5)), hsl (hsl(0,100%,50%)), hsla (hsla(0,100%,50%,0.5)), and named colors (red, blue, etc.). Use rgba or hsla formats to include opacity/transparency.',
        borderRadius:
            'The border radius of the graph container (optional, defaults to 0)',
        zIndex: 'The z-index of the graph (optional, defaults to 1) - controls stacking order with higher values appearing on top',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            content,
            x,
            y,
            positionReference,
            backgroundColor,
            borderRadius,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!content) {
            return {
                success: false,
                error: 'Content is required for graph element (DOT format)',
            };
        }

        const width = Number(params.width) || 500;
        const height = Number(params.height) || 400;

        let xPos = x !== undefined ? Number(x) : 1280 / 2 - width / 2;
        let yPos = y !== undefined ? Number(y) : 720 / 2 - height / 2;

        if (positionReference === 'center') {
            xPos -= width / 2;
            yPos -= height / 2;
        }

        const presentation = presentationService.getPresentation();
        const slide = presentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        const zIndex = params.zIndex !== undefined ? Number(params.zIndex) : 1;

        const element = createGraph({
            content,
            position: { x: xPos, y: yPos },
            size: { width, height },
            backgroundColor: backgroundColor || 'transparent',
            borderRadius: Number(borderRadius) || 0,
            zIndex,
        });

        const updatedSlide = presentationService.addElement(slideId, element);

        if (!updatedSlide) {
            return {
                success: false,
                error: `Failed to add graph to slide with ID ${slideId}`,
            };
        }

        const message = `Graph element created successfully at position (${element.position.x}, ${element.position.y}) with size ${element.size.width}x${element.size.height}px.`;

        return {
            success: true,
            data: {
                elementId: element.id,
                slideId,
                position: element.position,
                size: element.size,
                content: element.content,
            },
            message,
        };
    }
}
