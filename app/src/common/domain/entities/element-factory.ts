import { v4 as uuidv4 } from 'uuid';
import { ContentElement, TextBox, BarChartData } from './types';

export class ElementFactory {
  static createTextBox(options: {
    content: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    fontSize: number;
    fontFamily: string;
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
      fontSize: options.fontSize || 24,
      fontFamily: options.fontFamily || 'Arial',
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

  static calculateHeightBasedOnContent(element: TextBox): number {
    if (!element.content) {
      return element.size.height;
    }

    const averageCharWidth = element.fontSize * 0.6;
    const charsPerLine = Math.floor(element.size.width / averageCharWidth);
    const padding = 20;

    const lines = element.content.split('\n');
    // Calculate total line count using array methods instead of for-loop (for lint compliance)
    const totalLines = lines.reduce(
      (acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0,
    );

    const lineHeight = element.fontSize * 1.2;
    const calculatedHeight = totalLines * lineHeight + padding;

    return Math.max(calculatedHeight, element.size.height);
  }

  static calculateBoxAroundTextElement(element: TextBox): string {
    // Get the calculated height that accounts for text content
    const calculatedHeight =
      ElementFactory.calculateHeightBasedOnContent(element);
    const calculatedEndY = element.position.y + calculatedHeight;
    const isOutsideSlide = calculatedEndY > 720;

    return `
      The element starts at:
      x: ${element.position.x}
      y: ${element.position.y}
      
      And ends at:
      x: ${element.position.x + element.size.width}
      y: ${calculatedEndY} ${isOutsideSlide ? '(outside slide)' : ''}
    `;
  }
}
