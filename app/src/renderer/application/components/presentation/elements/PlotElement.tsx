import React from 'react';
import PlotlyChart from 'react-plotly.js';
import {
    ContentElement,
    Plot,
    PlotData,
} from '../../../../../common/domain/entities/types';
import { useDraggableElement } from '../../../hooks/useDraggableElement';
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

const PlotElementComponent: React.FC<PlotElementProps> = ({
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

    const { handleMouseDown, handleClick } = useDraggableElement({
        element,
        isSelected,
        readOnly,
        selectedElementIds,
        slideElements,
        onElementUpdate,
        onMultiElementUpdate,
    });

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
            onClick={(e) => handleClick(e, onClick)}
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

export const PlotElement = React.memo(PlotElementComponent);
