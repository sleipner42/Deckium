import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../../../common/domain/entities/types';

library.add(fas);

interface IconElementProps {
    element: Icon;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<Icon>) => void;
    isSelected: boolean;
    isEditing: boolean;
    readOnly?: boolean;
}

export const IconElement: React.FC<IconElementProps> = ({
    element,
    onClick,
    onContextMenu,
    onElementUpdate,
    isSelected,
    isEditing,
    readOnly = false,
}) => {
    const { position, size, color, iconName } = element;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);
    const onElementUpdateRef = useRef(onElementUpdate);
    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
    }, [onElementUpdate]);
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        color,
        cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
        outline: isSelected ? '2px solid #0066ff' : 'none',
        outlineOffset: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size}px`,
        userSelect: 'none',
    };
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
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setHasDragged(true);
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                if (onElementUpdateRef.current) {
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
    }, [isDragging, dragOffset, element.id]);
    const handleClick = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.stopPropagation();
        if (!hasDragged && onClick) onClick(e);
        setTimeout(() => setHasDragged(false), 100);
    };
    return (
        <div
            style={style}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            data-element-id={element.id}
            data-element-type="icon"
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onClick) onClick();
                }
            }}
        >
            <FontAwesomeIcon
                icon={iconName as any}
                style={{ fontSize: `${size}px`, color }}
            />
        </div>
    );
};
