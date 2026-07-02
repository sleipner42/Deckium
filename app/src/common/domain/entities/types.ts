export type UUID = string;

export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface ElementStyle {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    zIndex?: number;
}

export interface ElementState {
    isSelected: boolean;
    isEditing: boolean;
}

export interface Shape {
    id: UUID;
    type: 'rectangle' | 'circle' | 'triangle';
    position: Position;
    size: Size;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    zIndex?: number;
    style?: ElementStyle;
}

export interface BarChartData {
    x: (string | number)[];
    y: number[];
}

export interface BarChart {
    id: UUID;
    type: 'barchart';
    position: Position;
    size: Size;
    data: BarChartData;
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    zIndex?: number;
    style?: ElementStyle;
    barColor?: string;
}

export interface TextBox {
    id: UUID;
    type: 'textbox';
    position: Position;
    size: Size;
    content: string; // HTML content
    zIndex?: number;
    backgroundColor?: string;
    borderRadius?: number;
    verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface PlotSeries {
    name?: string;
    x: (string | number)[];
    y: number[];
}

// line/bar plots use `series`; pie plots use `labels` + `values`
export interface PlotData {
    series?: PlotSeries[];
    labels?: string[];
    values?: number[];
}

export interface Plot {
    id: UUID;
    type: 'plot';
    position: Position;
    size: Size;
    data: PlotData;
    plotType: 'line' | 'bar' | 'pie';
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    zIndex?: number;
    style?: ElementStyle;
}

export interface Image {
    id: UUID;
    type: 'image';
    position: Position;
    size: Size;
    content: string; // URL or base64
    zIndex?: number;
    style?: ElementStyle;
}

export type ContentElement = Shape | TextBox | Plot | Image | BarChart;

export interface Slide {
    id: UUID;
    elements: ContentElement[];
    background: string;
    transition?: string;
}

export interface Presentation {
    id: UUID;
    title: string;
    slides: Slide[];
    createdAt: Date;
    updatedAt: Date;
}

// Export AI related types
export * from './ai-types';
