import React, { useEffect, useState } from 'react';
import { useTextMeasurement } from '../../../hooks/useTextMeasurement';

interface TextElementMeasurementProps {
  content: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  onMeasurementUpdate?: (measurement: {
    actualHeight: number;
    actualWidth: number;
    lineCount: number;
    naturalWidth: number;
    hasOverflow: boolean;
  }) => void;
}

/**
 * Component that measures text and provides feedback about optimal dimensions
 * This can be used to help users understand how their text will render
 */
export const TextElementMeasurement: React.FC<TextElementMeasurementProps> = ({
  content,
  fontSize,
  fontFamily,
  width,
  onMeasurementUpdate
}) => {
  const { measureTextWithSuggestions } = useTextMeasurement();
  const [measurement, setMeasurement] = useState<any>(null);

  useEffect(() => {
    if (!content) return;

    try {
      const result = measureTextWithSuggestions({
        content,
        fontSize,
        fontFamily,
        width
      });
      
      setMeasurement(result);
      onMeasurementUpdate?.(result);
    } catch (error) {
      console.error('Error measuring text:', error);
    }
  }, [content, fontSize, fontFamily, width, measureTextWithSuggestions, onMeasurementUpdate]);

  if (!measurement) {
    return null;
  }

  return (
    <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
      <div>
        Measured: {measurement.actualWidth}×{measurement.actualHeight}px 
        ({measurement.lineCount} lines)
      </div>
      
      {measurement.hasOverflow && (
        <div style={{ color: '#ff6b35' }}>
          ⚠️ Text overflows! Suggested width: {measurement.suggestedWidth}px
        </div>
      )}
      
      {measurement.isOptimalSize && (
        <div style={{ color: '#28a745' }}>
          ✓ Optimal size
        </div>
      )}
    </div>
  );
};