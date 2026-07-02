import React, { useEffect, useRef, useState } from 'react';
import PlotlyChart from 'react-plotly.js';
import {
    ContentElement,
    Plot,
    PlotData,
} from '../../../../../common/domain/entities/types';
import { ResizeHandles } from '../ResizeHandles';

const SERIES_COLORS = [
    '#007bff',
    '#fd7e14',
    '#28a745',
    '#dc3545',
    '#6f42c1',
    '#20c997',
];

function buildTraces(plotType: Plot['plotType'], data: PlotData): object[] {
    if (plotType === 'pie') {
        return [
            {
                type: 'pie',
                labels: data.labels ?? [],
                values: data.values ?? [],
                textinfo: 'label+percent',
            },
        ];
    }

    return (data.series ?? []).map((series, index) => ({
        type: plotType === 'bar' ? 'bar' : 'scatter',
        mode: plotType === 'line' ? 'lines+markers' : undefined,
        name: series.name,
        x: series.x,
        y: series.y,
        marker: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
    }));
}

interface PlotElementProps {
    element: Plot;
    isSelected: boolean;
    isEditing: boolean;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<Plot>) => void;
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

export const PlotElement: React.FC<PlotElementProps> = ({
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
    const { position, size, data, plotType, style } = element;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);

    const onElementUpdateRef = useRef(onElementUpdate);
    const onMultiElementUpdateRef = useRef(onMultiElementUpdate);
    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        onMultiElementUpdateRef.current = onMultiElementUpdate;
    }, [onElementUpdate, onMultiElementUpdate]);

    // Handle mouse events for dragging
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

    // Setup mouse move and mouse up event listeners
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setHasDragged(true);
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                const deltaX = newX - position.x;
                const deltaY = newY - position.y;

                // Check if multiple elements are selected and we have multi-element update capability
                if (
                    selectedElementIds.length > 1 &&
                    onMultiElementUpdateRef.current
                ) {
                    // Prepare updates for all selected elements
                    const allUpdates = selectedElementIds
                        .map((elementId) => {
                            const elem = slideElements.find(
                                (el) => el.id === elementId,
                            );
                            if (elem) {
                                return {
                                    elementId,
                                    updates: {
                                        position: {
                                            x: elem.position.x + deltaX,
                                            y: elem.position.y + deltaY,
                                        },
                                    },
                                };
                            }
                            return null;
                        })
                        .filter(Boolean) as Array<{
                        elementId: string;
                        updates: Partial<ContentElement>;
                    }>;

                    // Call with primary element (this one being dragged), its intended position, and all updates
                    const primaryUpdates = { position: { x: newX, y: newY } };
                    onMultiElementUpdateRef.current(
                        element.id,
                        primaryUpdates,
                        allUpdates,
                    );
                } else if (onElementUpdateRef.current) {
                    // Single element move
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
    }, [
        isDragging,
        dragOffset,
        element.id,
        selectedElementIds,
        slideElements,
        position.x,
        position.y,
    ]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.stopPropagation();
        // Don't trigger click if we just finished dragging
        if (!hasDragged && onClick) {
            onClick(e);
        }
        // Reset drag flag after a short delay to allow for future clicks
        setTimeout(() => setHasDragged(false), 100);
    };

    const showLegend =
        plotType === 'pie' ||
        (data.series ?? []).filter((series) => series.name).length > 1;

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
                cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
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
            onContextMenu={onContextMenu}
        >
            <PlotlyChart
                data={buildTraces(plotType, data) as any}
                layout={{
                    title: {
                        text: element.title,
                        font: { size: 14 },
                    },
                    autosize: true,
                    width: size.width,
                    height: size.height,
                    margin: { l: 50, r: 30, b: 50, t: 50, pad: 0 },
                    xaxis:
                        plotType === 'pie'
                            ? undefined
                            : {
                                  title: { text: element.xAxisLabel },
                                  automargin: true,
                              },
                    yaxis:
                        plotType === 'pie'
                            ? undefined
                            : {
                                  title: { text: element.yAxisLabel },
                                  automargin: true,
                              },
                    showlegend: showLegend,
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
                minWidth={100}
                minHeight={80}
            />
        </div>
    );
};
