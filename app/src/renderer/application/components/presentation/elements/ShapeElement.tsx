import React from 'react';
import {
    ContentElement,
    Shape,
} from '../../../../../common/domain/entities/types';
import { useDraggableElement } from '../../../hooks/useDraggableElement';
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

const ShapeElementComponent: React.FC<ShapeElementProps> = ({
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

    const { handleMouseDown, handleClick } = useDraggableElement({
        element,
        isSelected,
        readOnly,
        selectedElementIds,
        slideElements,
        onElementUpdate,
        onMultiElementUpdate,
    });

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
                        onClick={(e) => handleClick(e, onClick)}
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
                        onClick={(e) => handleClick(e, onClick)}
                        onMouseDown={handleMouseDown}
                        onContextMenu={onContextMenu}
                    />
                );
            case 'triangle':
                return (
                    <svg
                        data-element-id={element.id}
                        data-element-type="shape"
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                        onClick={(e) => handleClick(e, onClick)}
                        onMouseDown={handleMouseDown}
                        onContextMenu={onContextMenu}
                    >
                        <polygon
                            points={`${size.width / 2},${strokeWidth} ${strokeWidth},${size.height - strokeWidth} ${size.width - strokeWidth},${size.height - strokeWidth}`}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeLinejoin="round"
                        />
                    </svg>
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

export const ShapeElement = React.memo(ShapeElementComponent);
