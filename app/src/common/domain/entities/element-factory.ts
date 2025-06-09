import { v4 as uuidv4 } from 'uuid';
import { ContentElement, TextBox, BarChartData } from './types';

export class ElementFactory {
  static createTextBox(options: {
    content: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    color: string;
    borderRadius?: number;
    backgroundColor?: string;
    backgroundOpacity?: number;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    zIndex?: number;
  }): ContentElement {
    return {
      id: uuidv4(),
      type: 'textbox',
      position: options.position,
      size: options.size,
      content: options.content,
      color: options.color || '#000000',
      borderRadius: options.borderRadius || 0,
      backgroundColor: options.backgroundColor || 'transparent',
      backgroundOpacity: options.backgroundOpacity || 0,
      align: options.align || 'left',
      verticalAlign: options.verticalAlign || 'top',
      zIndex: options.zIndex || 1,
    };
  }

  static createShape(options: {
    shapeType: 'rectangle' | 'circle' | 'triangle';
    position: { x: number; y: number };
    size: { width: number; height: number };
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    zIndex?: number;
  }): ContentElement {
    return {
      id: uuidv4(),
      type: options.shapeType,
      position: options.position,
      size: options.size,
      fillColor: options.fillColor,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      zIndex: options.zIndex || 1,
    };
  }

  static createBarChart(options: {
    position: { x: number; y: number };
    size: { width: number; height: number };
    data?: BarChartData;
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    barColor?: string;
    zIndex?: number;
  }): ContentElement {
    return {
      id: uuidv4(),
      type: 'barchart',
      position: options.position,
      size: options.size,
      data: options.data || { x: [1, 2, 3, 4, 5], y: [10, 45, 30, 25, 60] },
      title: options.title,
      xAxisLabel: options.xAxisLabel,
      yAxisLabel: options.yAxisLabel,
      barColor: options.barColor || '#000000',
      zIndex: options.zIndex || 1,
    };
  }

  static createImage(options: {
    content: string; // URL or base64
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex?: number;
  }): ContentElement {
    return {
      id: uuidv4(),
      type: 'image',
      position: options.position,
      size: options.size,
      content: options.content,
      zIndex: options.zIndex || 1,
    };
  }

}
