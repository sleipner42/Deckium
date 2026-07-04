import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import {
    BarChart,
    ContentElement,
} from '../../../../../common/domain/entities/types';
import { useDraggableElement } from '../../../hooks/useDraggableElement';
import { ResizeHandles } from '../ResizeHandles';
import { BarChartEditor } from './BarChartEditor';

interface BarChartElementProps {
    element: BarChart;
    isSelected: boolean;
    isEditing: boolean;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<BarChart>) => void;
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
    onStartEditing?: () => void;
    onStopEditing?: () => void;
    readOnly?: boolean;
}

const BarChartElementComponent: React.FC<BarChartElementProps> = ({
    element,
    isSelected,
    isEditing,
    onClick,
    onContextMenu,
    onElementUpdate,
    onMultiElementUpdate,
    selectedElementIds = [],
    slideElements = [],
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
    const [showEditor, setShowEditor] = useState(false);

    const { handleMouseDown, handleClick } = useDraggableElement({
        element,
        isSelected,
        readOnly,
        selectedElementIds,
        slideElements,
        onElementUpdate,
        onMultiElementUpdate,
    });

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
                onClick={(e) => handleClick(e, onClick)}
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
                            title: { text: xAxisLabel },
                            automargin: true,
                        },
                        yaxis: {
                            title: { text: yAxisLabel },
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

export const BarChartElement = React.memo(BarChartElementComponent);
