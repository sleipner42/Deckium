import { useCallback } from 'react';

export interface TextMeasurementResult {
  actualHeight: number;
  actualWidth: number;
  lineCount: number;
  naturalWidth: number;
  hasOverflow: boolean;
}

export interface TextMeasurementRequest {
  content: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  lineHeight?: number;
}

/**
 * Hook for measuring text dimensions in the renderer process
 * This provides precise measurements using actual DOM rendering
 */
export function useTextMeasurement() {
  const measureText = useCallback((request: TextMeasurementRequest): TextMeasurementResult => {
    const {
      content,
      fontSize,
      fontFamily,
      width,
      lineHeight = 1.2
    } = request;

    // Create a temporary div for measurement
    const testDiv = document.createElement('div');
    testDiv.style.position = 'absolute';
    testDiv.style.visibility = 'hidden';
    testDiv.style.top = '-9999px';
    testDiv.style.left = '-9999px';
    testDiv.style.whiteSpace = 'pre-wrap';
    testDiv.style.wordWrap = 'break-word';
    testDiv.style.fontSize = `${fontSize}px`;
    testDiv.style.fontFamily = fontFamily;
    testDiv.style.lineHeight = lineHeight.toString();
    testDiv.style.padding = '0';
    testDiv.style.margin = '0';
    testDiv.style.border = 'none';
    testDiv.style.width = `${width}px`;
    testDiv.style.boxSizing = 'border-box';
    testDiv.textContent = content || '';
    
    document.body.appendChild(testDiv);
    
    try {
      const actualHeight = testDiv.offsetHeight;
      const actualWidth = testDiv.offsetWidth;
      
      // Measure natural width without constraints
      testDiv.style.width = 'auto';
      testDiv.style.whiteSpace = 'nowrap';
      const naturalWidth = testDiv.offsetWidth;
      
      // Reset for line counting
      testDiv.style.width = `${width}px`;
      testDiv.style.whiteSpace = 'pre-wrap';
      
      // Count lines by measuring height of single line vs total height
      const singleLineDiv = testDiv.cloneNode(true) as HTMLElement;
      singleLineDiv.style.whiteSpace = 'nowrap';
      singleLineDiv.style.width = 'auto';
      singleLineDiv.textContent = 'Mg'; // Use tall characters for accurate line height
      document.body.appendChild(singleLineDiv);
      const singleLineHeight = singleLineDiv.offsetHeight;
      document.body.removeChild(singleLineDiv);
      
      const lineCount = Math.max(1, Math.round(actualHeight / singleLineHeight));
      
      return {
        actualHeight,
        actualWidth,
        lineCount,
        naturalWidth,
        hasOverflow: naturalWidth > width
      };
    } finally {
      document.body.removeChild(testDiv);
    }
  }, []);

  /**
   * Measure text and get suggestions for optimal dimensions
   */
  const measureTextWithSuggestions = useCallback((request: TextMeasurementRequest) => {
    const measurement = measureText(request);
    
    return {
      ...measurement,
      suggestedWidth: measurement.hasOverflow ? measurement.naturalWidth : request.width,
      suggestedHeight: measurement.actualHeight,
      isOptimalSize: !measurement.hasOverflow && measurement.actualHeight <= request.width
    };
  }, [measureText]);

  return {
    measureText,
    measureTextWithSuggestions
  };
}