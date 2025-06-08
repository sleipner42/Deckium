import React, { useState, useEffect } from 'react';
import { Image } from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';

interface ImageElementProps {
  element: Image;
  isSelected: boolean;
  isEditing: boolean;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  onElementUpdate?: (elementId: string, updates: Partial<Image>) => void;
  onElementMove?: (elementId: string, x: number, y: number) => void;
  onElementResize?: (elementId: string, width: number, height: number) => void;
  readOnly?: boolean;
}

export const ImageElement: React.FC<ImageElementProps> = ({
  element,
  isSelected,
  isEditing,
  onClick,
  onContextMenu,
  onElementUpdate,
  onElementMove,
  onElementResize,
  readOnly = false,
}) => {
  const { position, size, content, style, zIndex } = element;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;

    if (isSelected) {
      e.stopPropagation();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  // Setup mouse move and mouse up event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && onElementMove) {
        onElementMove(
          element.id,
          e.clientX - dragOffset.x,
          e.clientY - dragOffset.y
        );
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
  }, [isDragging, dragOffset, element.id, onElementMove]);

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) return;

    e.stopPropagation();
    if (onClick) onClick();
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
        onResize={
          onElementResize && onElementMove
            ? (id, updates) => {
                if (updates.size) {
                  onElementResize(id, updates.size.width, updates.size.height);
                }
                if (updates.position) {
                  onElementMove(id, updates.position.x, updates.position.y);
                }
              }
            : onElementUpdate
            ? (id, updates) => onElementUpdate(id, updates)
            : () => {}
        }
        minWidth={20}
        minHeight={20}
      />
    </div>
  );
};
