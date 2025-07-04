import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    ConnectionMode,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Graph } from '../../../../../common/domain/entities/types';

// Custom node component
const CustomNode = ({ data }: { data: { label: string } }) => {
    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '12px',
                minWidth: '60px',
                textAlign: 'center',
            }}
        >
            <Handle type="target" position={Position.Top} />
            {data.label}
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

interface GraphElementProps {
    element: Graph;
    isSelected: boolean;
    isEditing: boolean;
    onUpdate: (updates: Partial<Graph>) => void;
    onDoubleClick: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
    scale?: number;
}

export const GraphElement: React.FC<GraphElementProps> = ({
    element,
    isSelected,
    isEditing,
    onUpdate,
    onDoubleClick,
    onMouseDown,
    onClick,
    style = {},
    scale = 1,
}) => {
    const [editContent, setEditContent] = useState(element.content);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Parse DOT format and convert to React Flow format
    const parseDotToReactFlow = useCallback((dotContent: string) => {
        try {
            // Simple DOT parser - this is a basic implementation
            // You might want to use a more robust parser for complex graphs
            const lines = dotContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
            
            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            let nodeCounter = 0;
            let edgeCounter = 0;
            const nodeMap = new Map<string, number>();

            for (const line of lines) {
                // Parse node definitions: "A [label="Node A"]"
                const nodeMatch = line.match(/^(\w+)\s*\[.*label\s*=\s*"([^"]*)".*\]/);
                if (nodeMatch) {
                    const nodeId = nodeMatch[1];
                    const label = nodeMatch[2];
                    
                    if (!nodeMap.has(nodeId)) {
                        nodeMap.set(nodeId, nodeCounter);
                        newNodes.push({
                            id: nodeId,
                            type: 'custom',
                            position: { 
                                x: (nodeCounter % 3) * 150 + 50, 
                                y: Math.floor(nodeCounter / 3) * 100 + 50 
                            },
                            data: { label: label || nodeId },
                        });
                        nodeCounter++;
                    }
                }

                // Parse simple node definitions: "A"
                const simpleNodeMatch = line.match(/^(\w+)$/);
                if (simpleNodeMatch && !line.includes('->') && !line.includes('--')) {
                    const nodeId = simpleNodeMatch[1];
                    if (!nodeMap.has(nodeId)) {
                        nodeMap.set(nodeId, nodeCounter);
                        newNodes.push({
                            id: nodeId,
                            type: 'custom',
                            position: { 
                                x: (nodeCounter % 3) * 150 + 50, 
                                y: Math.floor(nodeCounter / 3) * 100 + 50 
                            },
                            data: { label: nodeId },
                        });
                        nodeCounter++;
                    }
                }

                // Parse edge definitions: "A -> B" or "A -- B"
                const edgeMatch = line.match(/^(\w+)\s*(->|--)\s*(\w+)/);
                if (edgeMatch) {
                    const source = edgeMatch[1];
                    const target = edgeMatch[3];
                    
                    // Ensure nodes exist
                    if (!nodeMap.has(source)) {
                        nodeMap.set(source, nodeCounter);
                        newNodes.push({
                            id: source,
                            type: 'custom',
                            position: { 
                                x: (nodeCounter % 3) * 150 + 50, 
                                y: Math.floor(nodeCounter / 3) * 100 + 50 
                            },
                            data: { label: source },
                        });
                        nodeCounter++;
                    }
                    
                    if (!nodeMap.has(target)) {
                        nodeMap.set(target, nodeCounter);
                        newNodes.push({
                            id: target,
                            type: 'custom',
                            position: { 
                                x: (nodeCounter % 3) * 150 + 50, 
                                y: Math.floor(nodeCounter / 3) * 100 + 50 
                            },
                            data: { label: target },
                        });
                        nodeCounter++;
                    }

                    newEdges.push({
                        id: `edge-${edgeCounter}`,
                        source,
                        target,
                        type: 'default',
                    });
                    edgeCounter++;
                }
            }

            return { nodes: newNodes, edges: newEdges };
        } catch (error) {
            console.error('Error parsing DOT content:', error);
            return { 
                nodes: [{
                    id: 'error',
                    type: 'custom',
                    position: { x: 50, y: 50 },
                    data: { label: 'Parse Error' },
                }], 
                edges: [] 
            };
        }
    }, []);

    // Update React Flow when content changes
    useEffect(() => {
        if (element.content) {
            const { nodes: newNodes, edges: newEdges } = parseDotToReactFlow(element.content);
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [element.content, parseDotToReactFlow, setNodes, setEdges]);

    // Handle save when exiting edit mode
    useEffect(() => {
        if (!isEditing && editContent !== element.content) {
            onUpdate({ content: editContent });
        }
    }, [isEditing, editContent, element.content, onUpdate]);

    // Focus textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditContent(element.content); // Revert changes
            e.stopPropagation();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.stopPropagation();
            // Save and exit edit mode - this will be handled by the parent
        }
        e.stopPropagation(); // Prevent slide-level shortcuts
    };

    const elementStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        backgroundColor: element.backgroundColor || 'transparent',
        borderRadius: element.borderRadius || 0,
        border: isSelected ? '2px solid #0066ff' : '1px solid #ddd',
        outline: 'none',
        cursor: isEditing ? 'text' : 'move',
        overflow: 'hidden',
        ...style,
    };

    if (isEditing) {
        return (
            <div style={elementStyle}>
                <textarea
                    ref={textAreaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter DOT graph format&#10;Example:&#10;digraph {&#10;  A -> B&#10;  B -> C&#10;}"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'Monaco, Consolas, monospace',
                        fontSize: '12px',
                        padding: '8px',
                        backgroundColor: 'transparent',
                    }}
                />
            </div>
        );
    }

    return (
        <div
            style={elementStyle}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMouseDown}
            onClick={onClick}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                attributionPosition="bottom-left"
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnDoubleClick={false}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                style={{ pointerEvents: isSelected ? 'none' : 'auto' }}
            >
                <Background />
            </ReactFlow>
        </div>
    );
};