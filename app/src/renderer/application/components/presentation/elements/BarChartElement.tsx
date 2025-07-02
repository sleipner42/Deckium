import React, { useEffect, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { BarChart } from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';
import { BarChartEditor } from './BarChartEditor';

interface BarChartElementProps {
    element: BarChart;
    isSelected: boolean;
    isEditing: boolean;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<BarChart>) => void;
    onStartEditing?: () => void;
    onStopEditing?: () => void;
    readOnly?: boolean;
}

export const BarChartElement: React.FC<BarChartElementProps> = ({
    element,
    isSelected,
    isEditing,
    onClick,
    onContextMenu,
    onElementUpdate,
    onStartEditing,
    onStopEditing,
    readOnly = false,
}) => {
    const {
        position,
        size,
        data,
        title,
        xAxisLabel,
        yAxisLabel,
        style,
        barColor,
    } = element;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showEditor, setShowEditor] = useState(false);

    const onElementUpdateRef = useRef(onElementUpdate);
    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
    }, [onElementUpdate]);

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

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && onElementUpdateRef.current) {
                onElementUpdateRef.current(element.id, {
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
    }, [isDragging, dragOffset, element.id]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.stopPropagation();
        if (onClick) onClick(e);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.stopPropagation();
        setShowEditor(true);
        if (onStartEditing) onStartEditing();
    };

    const handleEditorClose = () => {
        setShowEditor(false);
        if (onStopEditing) onStopEditing();
    };

    return (
        <>
            <div
                data-element-id={element.id}
                data-element-type="barChart"
                style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    cursor: readOnly
                        ? 'default'
                        : isSelected
                          ? 'move'
                          : 'pointer',
                    outline: isSelected ? '2px solid #0066ff' : 'none',
                    outlineOffset: '2px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    ...style,
                }}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onContextMenu={onContextMenu}
            >
                <Plot
                    data={[
                        {
                            type: 'bar',
                            x: data.x.map(String),
                            y: data.y,
                            marker: {
                                color: barColor || '#007bff',
                            },
                        },
                    ]}
                    layout={{
                        title: {
                            text: title,
                            font: {
                                size: 14,
                            },
                        },
                        autosize: true,
                        width: size.width,
                        height: size.height,
                        margin: {
                            l: 50,
                            r: 30,
                            b: 50,
                            t: 50,
                            pad: 0,
                        },
                        xaxis: {
                            title: xAxisLabel,
                            automargin: true,
                        },
                        yaxis: {
                            title: yAxisLabel,
                            automargin: true,
                        },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                    }}
                    config={{
                        displayModeBar: false,
                        responsive: true,
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
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
                    minWidth={200}
                    minHeight={150}
                />
            </div>

            {!readOnly && (
                <BarChartEditor
                    element={element}
                    open={showEditor}
                    onClose={handleEditorClose}
                    onUpdate={onElementUpdate || (() => {})}
                />
            )}
        </>
    );
};
