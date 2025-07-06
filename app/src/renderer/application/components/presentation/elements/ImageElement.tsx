import React, { useEffect, useRef, useState } from 'react';
import {
    ContentElement,
    Image,
} from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';

interface ImageElementProps {
    element: Image;
    isSelected: boolean;
    isEditing: boolean;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<Image>) => void;
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
    readOnly?: boolean;
}

export const ImageElement: React.FC<ImageElementProps> = ({
    element,
    isSelected,
    isEditing,
    onClick,
    onContextMenu,
    onElementUpdate,
    onMultiElementUpdate,
    selectedElementIds = [],
    slideElements = [],
    readOnly = false,
}) => {
    const { position, size, content, style, zIndex, rotation } = element;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);

    const onElementUpdateRef = useRef(onElementUpdate);
    const onMultiElementUpdateRef = useRef(onMultiElementUpdate);
    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        onMultiElementUpdateRef.current = onMultiElementUpdate;
    }, [onElementUpdate, onMultiElementUpdate]);

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

    return (
        <div
            data-element-id={element.id}
            data-element-type="image"
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
                outline: isSelected ? '2px solid #0066ff' : 'none',
                outlineOffset: '2px',
                zIndex: zIndex || 1,
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                transformOrigin: 'center center',
            }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
        >
            <img
                src={content}
                alt="Slide element"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    ...style,
                }}
                draggable={false}
            />
            <ResizeHandles
                isSelected={isSelected}
                isEditing={isEditing}
                elementId={element.id}
                position={position}
                size={size}
                rotation={rotation}
                onResize={
                    onElementUpdate
                        ? (id, updates) => onElementUpdate(id, updates)
                        : () => {}
                }
                onRotate={
                    onElementUpdate
                        ? (id, newRotation) =>
                              onElementUpdate(id, { rotation: newRotation })
                        : undefined
                }
                minWidth={20}
                minHeight={20}
            />
        </div>
    );
};
