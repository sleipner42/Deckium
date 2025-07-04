import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import ReactFlow, {
    Background,
    ConnectionMode,
    Controls,
    Edge,
    Handle,
    Node,
    Position,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Graph } from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';

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
    onElementUpdate?: (elementId: string, updates: Partial<Graph>) => void;
    onMultiElementUpdate?: (
        primaryElementId: string,
        primaryUpdates: Partial<Graph>,
        allUpdates: Array<{
            elementId: string;
            updates: Partial<Graph>;
        }>,
    ) => void;
    selectedElementIds?: string[];
    slideElements?: any[];
    style?: React.CSSProperties;
    scale?: number;
    readOnly?: boolean;
}

export const GraphElement: React.FC<GraphElementProps> = ({
    element,
    isSelected,
    isEditing,
    onUpdate,
    onDoubleClick,
    onMouseDown,
    onClick,
    onElementUpdate,
    onMultiElementUpdate,
    selectedElementIds = [],
    slideElements = [],
    style = {},
    scale = 1,
    readOnly = false,
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);

    // Parse DOT format and convert to React Flow format
    const parseDotToReactFlow = useCallback((dotContent: string) => {
        try {
            // Simple DOT parser - this is a basic implementation
            // You might want to use a more robust parser for complex graphs
            const lines = dotContent
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('//'));

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            let nodeCounter = 0;
            let edgeCounter = 0;
            const nodeMap = new Map<string, number>();

            for (const line of lines) {
                // Parse node definitions: "A [label="Node A"]"
                const nodeMatch = line.match(
                    /^(\w+)\s*\[.*label\s*=\s*"([^"]*)".*\]/,
                );
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
                                y: Math.floor(nodeCounter / 3) * 100 + 50,
                            },
                            data: { label: label || nodeId },
                        });
                        nodeCounter++;
                    }
                }

                // Parse simple node definitions: "A"
                const simpleNodeMatch = line.match(/^(\w+)$/);
                if (
                    simpleNodeMatch &&
                    !line.includes('->') &&
                    !line.includes('--')
                ) {
                    const nodeId = simpleNodeMatch[1];
                    if (!nodeMap.has(nodeId)) {
                        nodeMap.set(nodeId, nodeCounter);
                        newNodes.push({
                            id: nodeId,
                            type: 'custom',
                            position: {
                                x: (nodeCounter % 3) * 150 + 50,
                                y: Math.floor(nodeCounter / 3) * 100 + 50,
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
                                y: Math.floor(nodeCounter / 3) * 100 + 50,
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
                                y: Math.floor(nodeCounter / 3) * 100 + 50,
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
                nodes: [
                    {
                        id: 'error',
                        type: 'custom',
                        position: { x: 50, y: 50 },
                        data: { label: 'Parse Error' },
                    },
                ],
                edges: [],
            };
        }
    }, []);

    // Update React Flow when content changes
    useEffect(() => {
        if (element.content) {
            const { nodes: newNodes, edges: newEdges } = parseDotToReactFlow(
                element.content,
            );
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [element.content, parseDotToReactFlow, setNodes, setEdges]);

    // Convert React Flow data back to DOT format
    const convertToDot = useCallback((nodes: Node[], edges: Edge[]) => {
        const lines: string[] = ['digraph {'];
        
        // Add nodes with labels
        nodes.forEach(node => {
            if (node.data.label !== node.id) {
                lines.push(`  ${node.id} [label="${node.data.label}"]`);
            } else {
                lines.push(`  ${node.id}`);
            }
        });
        
        // Add edges
        edges.forEach(edge => {
            lines.push(`  ${edge.source} -> ${edge.target}`);
        });
        
        lines.push('}');
        return lines.join('\n');
    }, []);

    // Handle node changes and update content
    const handleNodesChange = useCallback((changes: any) => {
        onNodesChange(changes);
        
        // If we're in editing mode, update the content when nodes change
        if (isEditing) {
            // Use a timeout to batch rapid changes
            setTimeout(() => {
                const updatedContent = convertToDot(nodes, edges);
                onUpdate({ content: updatedContent });
            }, 100);
        }
    }, [onNodesChange, isEditing, convertToDot, nodes, edges, onUpdate]);

    // Handle edge changes and update content
    const handleEdgesChange = useCallback((changes: any) => {
        onEdgesChange(changes);
        
        // If we're in editing mode, update the content when edges change
        if (isEditing) {
            // Use a timeout to batch rapid changes
            setTimeout(() => {
                const updatedContent = convertToDot(nodes, edges);
                onUpdate({ content: updatedContent });
            }, 100);
        }
    }, [onEdgesChange, isEditing, convertToDot, nodes, edges, onUpdate]);

    // Handle dragging for moving the element
    const handleMouseDownInternal = (e: React.MouseEvent) => {
        if (readOnly) return;

        if (isSelected && !isEditing) {
            e.stopPropagation();
            setIsDragging(true);
            setHasDragged(false);
            setDragOffset({
                x: e.clientX - element.position.x,
                y: e.clientY - element.position.y,
            });
        }
        
        // Call the external onMouseDown
        onMouseDown(e);
    };

    // Handle mouse movement for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setHasDragged(true);
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                const deltaX = newX - element.position.x;
                const deltaY = newY - element.position.y;

                // Check if multiple elements are selected and we have multi-element update capability
                if (
                    selectedElementIds.length > 1 &&
                    onMultiElementUpdate
                ) {
                    // Prepare updates for all selected elements
                    const allUpdates = selectedElementIds
                        .map((elementId) => {
                            const elem = slideElements.find(
                                (el) => el.id === elementId,
                            );
                            if (elem) {
                                return {
                                    elementId,
                                    updates: {
                                        position: {
                                            x: elem.position.x + deltaX,
                                            y: elem.position.y + deltaY,
                                        },
                                    },
                                };
                            }
                            return null;
                        })
                        .filter(Boolean) as Array<{
                            elementId: string;
                            updates: Partial<Graph>;
                        }>;

                    // Call with primary element (this one being dragged), its intended position, and all updates
                    const primaryUpdates = { position: { x: newX, y: newY } };
                    onMultiElementUpdate(
                        element.id,
                        primaryUpdates,
                        allUpdates,
                    );
                } else if (onElementUpdate) {
                    // Single element move
                    onElementUpdate(element.id, {
                        position: { x: newX, y: newY },
                    });
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [
        isDragging,
        dragOffset,
        element.id,
        element.position.x,
        element.position.y,
        selectedElementIds,
        slideElements,
        onMultiElementUpdate,
        onElementUpdate,
    ]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.stopPropagation();
        // Don't trigger click if we just finished dragging
        if (!isEditing && !hasDragged) {
            onClick(e);
        }
        // Reset drag flag after a short delay to allow for future clicks
        setTimeout(() => setHasDragged(false), 100);
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
        cursor: readOnly ? 'default' : isEditing ? 'default' : isSelected ? 'move' : 'pointer',
        overflow: 'hidden',
        ...style,
    };

    return (
        <div style={elementStyle}>
            {/* React Flow for rendering the graph */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                attributionPosition="bottom-left"
                proOptions={{ hideAttribution: true }}
                nodesDraggable={isEditing && !readOnly}
                nodesConnectable={isEditing && !readOnly}
                elementsSelectable={isEditing && !readOnly}
                zoomOnDoubleClick={false}
                panOnDrag={isEditing && !readOnly}
                zoomOnScroll={isEditing && !readOnly}
                zoomOnPinch={isEditing && !readOnly}
                panOnScroll={false}
                preventScrolling={!isEditing}
                style={{ 
                    pointerEvents: isEditing ? 'auto' : 'none'
                }}
            >
                <Background />
                {isEditing && !readOnly && <Controls />}
            </ReactFlow>

            {/* Transparent overlay to handle mouse events when not editing */}
            {!isEditing && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'transparent',
                        cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
                        zIndex: 10,
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onDoubleClick();
                    }}
                    onMouseDown={handleMouseDownInternal}
                    onClick={handleClick}
                />
            )}
            
            {/* Resize handles */}
            <ResizeHandles
                isSelected={isSelected}
                isEditing={isEditing}
                elementId={element.id}
                position={element.position}
                size={element.size}
                onResize={
                    onElementUpdate
                        ? (id, updates) => onElementUpdate(id, updates)
                        : () => {}
                }
                minWidth={200}
                minHeight={150}
            />
        </div>
    );
};
