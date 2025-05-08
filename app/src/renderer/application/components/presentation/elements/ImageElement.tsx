import React, { useState, useEffect } from 'react';
import { Image } from '../../../../../common/domain/entities/types';

interface ImageElementProps {
  element: Image;
  isSelected: boolean;
  isEditing: boolean;
  onClick?: () => void;
  onElementUpdate?: (elementId: string, updates: Partial<Image>) => void;
  readOnly?: boolean;
}

export const ImageElement: React.FC<ImageElementProps> = ({
  element,
  isSelected,
  isEditing,
  onClick,
  onElementUpdate,
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
    if (onClick) onClick();
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
        outline: isSelected ? '2px solid #0066ff' : 'none',
        outlineOffset: '2px',
        zIndex: zIndex || 1,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
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
    </div>
  );
};
