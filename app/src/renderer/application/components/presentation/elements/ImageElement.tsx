<<<<<<< Updated upstream
import React from 'react';
=======
import React, { useEffect, useRef, useState } from 'react';
import { shadowCss } from '../../../../../common/config/design';
>>>>>>> Stashed changes
import {
    ContentElement,
    Image,
} from '../../../../../common/domain/entities/types';
import { useDraggableElement } from '../../../hooks/useDraggableElement';
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

const ImageElementComponent: React.FC<ImageElementProps> = ({
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
<<<<<<< Updated upstream
    const { position, size, content, style, zIndex } = element;
=======
    const { position, size, content, borderRadius, shadow, style, zIndex } =
        element;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);
>>>>>>> Stashed changes

    const { handleMouseDown, handleClick } = useDraggableElement({
        element,
        isSelected,
        readOnly,
        selectedElementIds,
        slideElements,
        onElementUpdate,
        onMultiElementUpdate,
    });

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
            }}
            onClick={(e) => handleClick(e, onClick)}
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
                    borderRadius: `${borderRadius || 0}px`,
                    boxShadow: shadowCss(shadow),
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

export const ImageElement = React.memo(ImageElementComponent);
