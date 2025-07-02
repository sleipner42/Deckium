import React, { useEffect, useRef, useState } from 'react';
import {
    ContentElement,
    Shape,
} from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';

interface ShapeElementProps {
    element: Shape;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<Shape>) => void;
    onMultiElementUpdate?: (
        primaryElementId: string,
        primaryUpdates: Partial<ContentElement>,
        allUpdates: Array<{
            elementId: string;
            updates: Partial<ContentElement>;
        }>,
    ) => void;
    selectedElementIds?: string[];
    slideElements?: ContentElement[];
    isSelected: boolean;
    isEditing: boolean;
    readOnly?: boolean;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({
    element,
    onClick,
    onContextMenu,
    onElementUpdate,
    onMultiElementUpdate,
    selectedElementIds = [],
    slideElements = [],
    isSelected,
    isEditing,
    readOnly = false,
}) => {
    const {
        position,
        size,
        type,
        fillColor,
        strokeColor,
        strokeWidth,
        style,
        zIndex,
    } = element;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);
    const [_initialPositions, _setInitialPositions] = useState<{
        [key: string]: { x: number; y: number };
    }>({});

    const onElementUpdateRef = useRef(onElementUpdate);
    const onMultiElementUpdateRef = useRef(onMultiElementUpdate);
    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        onMultiElementUpdateRef.current = onMultiElementUpdate;
    }, [onElementUpdate, onMultiElementUpdate]);

    const _commonStyles: React.CSSProperties = {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backgroundColor: fillColor,
        border: `${strokeWidth}px solid ${strokeColor}`,
        cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
        zIndex: zIndex || 1,
        ...style,
        outline: isSelected ? '2px solid #0066ff' : 'none',
        outlineOffset: '2px',
    };

    // Handle mouse events for dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;

        if (isSelected) {
            e.stopPropagation();
            setIsDragging(true);
            setHasDragged(false);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            });
        }
    };

    // Setup mouse move and mouse up event listeners
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setHasDragged(true);
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                const deltaX = newX - position.x;
                const deltaY = newY - position.y;

                // Check if multiple elements are selected and we have multi-element update capability
                if (
                    selectedElementIds.length > 1 &&
                    onMultiElementUpdateRef.current
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
                        updates: Partial<ContentElement>;
                    }>;

                    // Call with primary element (this one being dragged), its intended position, and all updates
                    const primaryUpdates = { position: { x: newX, y: newY } };
                    onMultiElementUpdateRef.current(
                        element.id,
                        primaryUpdates,
                        allUpdates,
                    );
                } else if (onElementUpdateRef.current) {
                    // Single element move
                    onElementUpdateRef.current(element.id, {
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
        selectedElementIds,
        slideElements,
        position.x,
        position.y,
    ]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.stopPropagation();
        // Don't trigger click if we just finished dragging
        if (!hasDragged && onClick) {
            onClick(e);
        }
        // Reset drag flag after a short delay to allow for future clicks
        setTimeout(() => setHasDragged(false), 100);
    };

    const renderShape = () => {
        switch (type) {
            case 'rectangle':
                return (
                    <div
                        data-element-id={element.id}
                        data-element-type="shape"
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: fillColor,
                            border: `${strokeWidth}px solid ${strokeColor}`,
                        }}
                        onClick={handleClick}
                        onMouseDown={handleMouseDown}
                        onContextMenu={onContextMenu}
                    />
                );
            case 'circle':
                return (
                    <div
                        data-element-id={element.id}
                        data-element-type="shape"
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: fillColor,
                            border: `${strokeWidth}px solid ${strokeColor}`,
                            borderRadius: '50%',
                        }}
                        onClick={handleClick}
                        onMouseDown={handleMouseDown}
                        onContextMenu={onContextMenu}
                    />
                );
            case 'triangle':
                return (
                    <div
                        data-element-id={element.id}
                        data-element-type="shape"
                        style={{
                            width: '100%',
                            height: '100%',
                            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                            backgroundColor: fillColor,
                        }}
                        onClick={handleClick}
                        onMouseDown={handleMouseDown}
                        onContextMenu={onContextMenu}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
                zIndex: zIndex || 1,
                ...style,
                outline: isSelected ? '2px solid #0066ff' : 'none',
                outlineOffset: '2px',
            }}
        >
            {renderShape()}
            <ResizeHandles
                isSelected={isSelected}
                isEditing={isEditing}
                elementId={element.id}
                position={position}
                size={size}
                onResize={
                    onElementUpdate
                        ? (id, updates) => onElementUpdate(id, updates)
                        : () => {}
                }
                minWidth={20}
                minHeight={20}
            />
        </div>
    );
};
