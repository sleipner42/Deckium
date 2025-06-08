import React, { useState, useEffect } from 'react';
import { Shape } from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';

interface ShapeElementProps {
  element: Shape;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  onElementUpdate?: (elementId: string, updates: Partial<Shape>) => void;
  onElementMove?: (elementId: string, x: number, y: number) => void;
  onElementResize?: (elementId: string, width: number, height: number) => void;
  isSelected: boolean;
  isEditing: boolean;
  readOnly?: boolean;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({
  element,
  onClick,
  onContextMenu,
  onElementUpdate,
  onElementMove,
  onElementResize,
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

  const commonStyles: React.CSSProperties = {
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
    if (onClick) {
      onClick();
    }
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
