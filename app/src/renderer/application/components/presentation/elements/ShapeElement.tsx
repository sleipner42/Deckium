import React, { useState, useEffect } from 'react';
import { Shape } from '../../../../../common/domain/entities/types';

interface ShapeElementProps {
  element: Shape;
  onClick?: () => void;
  onElementUpdate?: (elementId: string, updates: Partial<Shape>) => void;
  isSelected: boolean;
  isEditing: boolean;
  readOnly?: boolean;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({
  element,
  onClick,
  onElementUpdate,
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
      if (isDragging && onElementUpdate) {
        onElementUpdate(element.id, {
          position: {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
          },
        });
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
  }, [isDragging, dragOffset, element.id, onElementUpdate]);

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
            style={commonStyles}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
          />
        );
      case 'circle':
        return (
          <div
            style={{
              ...commonStyles,
              borderRadius: '50%',
            }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
          />
        );
      case 'triangle':
        return (
          <div
            style={{
              ...commonStyles,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              backgroundColor: fillColor,
            }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
          />
        );
      default:
        return null;
    }
  };

  return renderShape();
};
