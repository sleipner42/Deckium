import React, { useEffect, useState } from 'react';

interface ResizeHandlesProps {
    isSelected: boolean;
    isEditing?: boolean;
    elementId: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    rotation?: number;
    onResize: (
        elementId: string,
        updates: {
            position?: { x: number; y: number };
            size?: { width: number; height: number };
        },
    ) => void;
    onRotate?: (elementId: string, rotation: number) => void;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
    isSelected,
    isEditing = false,
    elementId,
    position,
    size,
    rotation = 0,
    onResize,
    onRotate,
    minWidth = 20,
    minHeight = 20,
    maxWidth = 2000,
    maxHeight = 2000,
}) => {
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] =
        useState<ResizeDirection | null>(null);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [startSize, setStartSize] = useState({ width: 0, height: 0 });
    const [startElementPosition, setStartElementPosition] = useState({
        x: 0,
        y: 0,
    });
    const [isRotating, setIsRotating] = useState(false);
    const [startRotation, setStartRotation] = useState(0);
    const [rotationCenter, setRotationCenter] = useState({ x: 0, y: 0 });

    const handleMouseDown =
        (direction: ResizeDirection) => (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            setIsResizing(true);
            setResizeDirection(direction);
            setStartPosition({ x: e.clientX, y: e.clientY });
            setStartSize({ width: size.width, height: size.height });
            setStartElementPosition({ x: position.x, y: position.y });
        };

    const handleRotationMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsRotating(true);
        setStartRotation(rotation);

        // Calculate center of element
        const centerX = position.x + size.width / 2;
        const centerY = position.y + size.height / 2;
        setRotationCenter({ x: centerX, y: centerY });
    };

    useEffect(() => {
        if (!isResizing && !isRotating) return;
        if (isResizing && !resizeDirection) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (isRotating && onRotate) {
                // Calculate rotation based on mouse position relative to element center
                const mouseX = e.clientX;
                const mouseY = e.clientY;

                // Calculate angle from center to mouse position
                const angle =
                    Math.atan2(
                        mouseY - rotationCenter.y,
                        mouseX - rotationCenter.x,
                    ) *
                    (180 / Math.PI);

                // Normalize angle to 0-360 degrees
                let newRotation = (angle + 90) % 360;
                if (newRotation < 0) newRotation += 360;

                // Snap to 15-degree increments when Shift is held
                if (e.shiftKey) {
                    newRotation = Math.round(newRotation / 15) * 15;
                }

                onRotate(elementId, newRotation);
                return;
            }

            const deltaX = e.clientX - startPosition.x;
            const deltaY = e.clientY - startPosition.y;

            let newWidth = startSize.width;
            let newHeight = startSize.height;
            let newX = startElementPosition.x;
            let newY = startElementPosition.y;

            // Calculate new dimensions based on resize direction
            switch (resizeDirection) {
                case 'e': // East (right)
                    newWidth = Math.max(
                        minWidth,
                        Math.min(maxWidth, startSize.width + deltaX),
                    );
                    break;
                case 'w': // West (left)
                    newWidth = Math.max(
                        minWidth,
                        Math.min(maxWidth, startSize.width - deltaX),
                    );
                    newX =
                        startElementPosition.x + (startSize.width - newWidth);
                    break;
                case 's': // South (bottom)
                    newHeight = Math.max(
                        minHeight,
                        Math.min(maxHeight, startSize.height + deltaY),
                    );
                    break;
                case 'n': // North (top)
                    newHeight = Math.max(
                        minHeight,
                        Math.min(maxHeight, startSize.height - deltaY),
                    );
                    newY =
                        startElementPosition.y + (startSize.height - newHeight);
                    break;
                case 'se': // Southeast (bottom-right)
                    newWidth = Math.max(
                        minWidth,
                        Math.min(maxWidth, startSize.width + deltaX),
                    );
                    newHeight = Math.max(
                        minHeight,
                        Math.min(maxHeight, startSize.height + deltaY),
                    );
                    break;
                case 'sw': // Southwest (bottom-left)
                    newWidth = Math.max(
                        minWidth,
                        Math.min(maxWidth, startSize.width - deltaX),
                    );
                    newHeight = Math.max(
                        minHeight,
                        Math.min(maxHeight, startSize.height + deltaY),
                    );
                    newX =
                        startElementPosition.x + (startSize.width - newWidth);
                    break;
                case 'ne': // Northeast (top-right)
                    newWidth = Math.max(
                        minWidth,
                        Math.min(maxWidth, startSize.width + deltaX),
                    );
                    newHeight = Math.max(
                        minHeight,
                        Math.min(maxHeight, startSize.height - deltaY),
                    );
                    newY =
                        startElementPosition.y + (startSize.height - newHeight);
                    break;
                case 'nw': // Northwest (top-left)
                    newWidth = Math.max(
                        minWidth,
                        Math.min(maxWidth, startSize.width - deltaX),
                    );
                    newHeight = Math.max(
                        minHeight,
                        Math.min(maxHeight, startSize.height - deltaY),
                    );
                    newX =
                        startElementPosition.x + (startSize.width - newWidth);
                    newY =
                        startElementPosition.y + (startSize.height - newHeight);
                    break;
            }

            // Apply the resize
            onResize(elementId, {
                position: { x: newX, y: newY },
                size: { width: newWidth, height: newHeight },
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setIsRotating(false);
            setResizeDirection(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [
        isResizing,
        isRotating,
        resizeDirection,
        startPosition,
        startSize,
        startElementPosition,
        elementId,
        onResize,
        onRotate,
        rotation,
        rotationCenter,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
    ]);

    const handleStyle = {
        position: 'absolute' as const,
        backgroundColor: '#0066ff',
        border: '1px solid #ffffff',
        borderRadius: '2px',
        width: '8px',
        height: '8px',
        zIndex: 1000,
    };

    const getHandleCursor = (direction: ResizeDirection): string => {
        switch (direction) {
            case 'n':
            case 's':
                return 'ns-resize';
            case 'e':
            case 'w':
                return 'ew-resize';
            case 'ne':
            case 'sw':
                return 'nesw-resize';
            case 'nw':
            case 'se':
                return 'nwse-resize';
            default:
                return 'default';
        }
    };

    // Don't show handles when editing text or when not selected
    if (!isSelected || isEditing) {
        return null;
    }

    return (
        <>
            {/* Corner handles */}
            {/* Top-left */}
            <div
                style={{
                    ...handleStyle,
                    top: '-4px',
                    left: '-4px',
                    cursor: getHandleCursor('nw'),
                }}
                onMouseDown={handleMouseDown('nw')}
            />

            {/* Top-right */}
            <div
                style={{
                    ...handleStyle,
                    top: '-4px',
                    right: '-4px',
                    cursor: getHandleCursor('ne'),
                }}
                onMouseDown={handleMouseDown('ne')}
            />

            {/* Bottom-left */}
            <div
                style={{
                    ...handleStyle,
                    bottom: '-4px',
                    left: '-4px',
                    cursor: getHandleCursor('sw'),
                }}
                onMouseDown={handleMouseDown('sw')}
            />

            {/* Bottom-right */}
            <div
                style={{
                    ...handleStyle,
                    bottom: '-4px',
                    right: '-4px',
                    cursor: getHandleCursor('se'),
                }}
                onMouseDown={handleMouseDown('se')}
            />

            {/* Side handles */}
            {/* Top */}
            <div
                style={{
                    ...handleStyle,
                    top: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    cursor: getHandleCursor('n'),
                }}
                onMouseDown={handleMouseDown('n')}
            />

            {/* Bottom */}
            <div
                style={{
                    ...handleStyle,
                    bottom: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    cursor: getHandleCursor('s'),
                }}
                onMouseDown={handleMouseDown('s')}
            />

            {/* Left */}
            <div
                style={{
                    ...handleStyle,
                    left: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: getHandleCursor('w'),
                }}
                onMouseDown={handleMouseDown('w')}
            />

            {/* Right */}
            <div
                style={{
                    ...handleStyle,
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: getHandleCursor('e'),
                }}
                onMouseDown={handleMouseDown('e')}
            />

            {/* Rotation handle */}
            {onRotate && (
                <div
                    style={{
                        position: 'absolute',
                        top: '-25px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#00aa00',
                        border: '1px solid #ffffff',
                        borderRadius: '50%',
                        cursor: 'grab',
                        zIndex: 1001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: 'white',
                    }}
                    onMouseDown={handleRotationMouseDown}
                    title="Drag to rotate (hold Shift to snap to 15° increments)"
                >
                    ↻
                </div>
            )}
        </>
    );
};
