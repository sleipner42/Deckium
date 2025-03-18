import { v4 as uuidv4 } from 'uuid';
import { ContentElement, TextBox, Shape, BarChart, BarChartData } from './types';

export class ElementFactory {
  static createTextBox(options: { 
    content: string, 
    position: { x: number, y: number }, 
    size: { width: number, height: number },
    fontSize: number,
    fontFamily: string,
    color: string,
    borderRadius?: number,
    backgroundColor?: string,
    backgroundOpacity?: number,
    align?: 'left' | 'center' | 'right',
    verticalAlign?: 'top' | 'middle' | 'bottom'
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
      verticalAlign: options.verticalAlign || 'top'
    };
  }

  static createShape(options: {
    shapeType: 'rectangle' | 'circle' | 'triangle',
    position: { x: number, y: number },
    size: { width: number, height: number },
    fillColor: string,
    strokeColor: string,
    strokeWidth: number
  }): ContentElement {
    return {
      id: uuidv4(),
      type: options.shapeType,
      position: options.position,
      size: options.size,
      fillColor: options.fillColor,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth
    };
  }

  static createBarChart(options: {
    position: { x: number, y: number },
    size: { width: number, height: number },
    data?: BarChartData,
    title: string,
    xAxisLabel: string,
    yAxisLabel: string
  }): ContentElement {
    return {
      id: uuidv4(),
      type: 'barchart',
      position: options.position,
      size: options.size,
      data: options.data || { x: [1, 2, 3, 4, 5], y: [10, 45, 30, 25, 60] },
      title: options.title,
      xAxisLabel: options.xAxisLabel,
      yAxisLabel: options.yAxisLabel
    };
  }

  static calculateHeightBasedOnContent(element: TextBox): number {
    if (!element.content) {
      return element.size.height;
    }

    const lineCount = element.content.split('\n').length;
    
    const averageCharWidth = element.fontSize * 0.6;
    const charsPerLine = Math.floor(element.size.width / averageCharWidth);
    const padding = 20;
    
    const lines = element.content.split('\n');
    let totalLines = 0;
    
    for (const line of lines) {
      totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
    }
    
    const lineHeight = element.fontSize * 1.2;
    const calculatedHeight = (totalLines * lineHeight) + padding;
    
    return Math.max(element.size.height);
  }

  static calculateBoxAroundTextElement(element: TextBox): string {
    const calculatedHeight = ElementFactory.calculateHeightBasedOnContent(element);
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