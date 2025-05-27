import React, { useState, useEffect } from 'react';
import { Plot } from '../../../../../common/domain/entities/types';

interface PlotElementProps {
  element: Plot;
  isSelected: boolean;
  isEditing: boolean;
  onClick?: () => void;
  onElementUpdate?: (elementId: string, updates: Partial<Plot>) => void;
  readOnly?: boolean;
}

export const PlotElement: React.FC<PlotElementProps> = ({
  element,
  isSelected,
  isEditing,
  onClick,
  onElementUpdate,
  readOnly = false,
}) => {
  const { position, size, data, plotType, style } = element;
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

  // This is a placeholder for actual plot rendering
  // You would typically use a charting library like Chart.js, Recharts, or D3.js
  return (
    <div
      data-element-id={element.id}
      data-element-type="plot"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: isSelected ? '2px solid #0066ff' : 'none',
        outlineOffset: '2px',
        ...style,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <div>
        {plotType} Chart Placeholder
        <pre style={{ fontSize: '10px' }}>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};
