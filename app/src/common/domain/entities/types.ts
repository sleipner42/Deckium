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

export type ElementShadow = 'none' | 'soft' | 'medium';

export interface Shape {
    id: UUID;
    type: 'rectangle' | 'circle' | 'triangle';
    position: Position;
    size: Size;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderRadius?: number;
    opacity?: number;
    shadow?: ElementShadow;
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
    borderRadius?: number;
    shadow?: ElementShadow;
    zIndex?: number;
    style?: ElementStyle;
}

// A table cell holds sanitized rich-text HTML — the same formatting contract as
// TextBox.content (see common/config/text-formats.ts). `rows[r][c]` is the cell
// at row r, column c; every row has `columnWidths.length` cells.
export interface TableCell {
    content: string; // HTML content
    backgroundColor?: string;
}

export interface Table {
    id: UUID;
    type: 'table';
    position: Position;
    size: Size;
    // rows[r][c] — rectangular: every row has columnWidths.length cells.
    rows: TableCell[][];
    // Relative column/row weights (not pixels); rendered proportionally to the
    // element's size so the table always fills its box.
    columnWidths: number[];
    rowHeights: number[];
    // Style the first row as a header (distinct background + bold default).
    headerRow?: boolean;
    borderColor?: string;
    borderWidth?: number;
    headerBackgroundColor?: string;
    zIndex?: number;
    style?: ElementStyle;
}

export type ContentElement = Shape | TextBox | Plot | Image | BarChart | Table;

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
