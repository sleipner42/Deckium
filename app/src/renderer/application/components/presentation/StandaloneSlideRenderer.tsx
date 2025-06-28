import React from 'react';
import {
  BarChart,
  ContentElement,
  Image,
  Plot,
  Shape,
  Slide,
  TextBox,
} from '../../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../../common/utils/constants';

interface StandaloneSlideRendererProps {
  slide: Slide;
  style?: React.CSSProperties;
  className?: string;
  scale?: number;
}

// Standalone element renderers that don't use context
const StandaloneTextElement: React.FC<{ element: TextBox }> = ({ element }) => {
  const { position, size, content, backgroundColor, borderRadius, zIndex } = element;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backgroundColor: backgroundColor || 'transparent',
        borderRadius: borderRadius !== undefined ? `${borderRadius}px` : undefined,
        zIndex: zIndex || 1,
        padding: '5px',
        overflow: 'hidden',
        color: 'black',
        fontSize: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
      dangerouslySetInnerHTML={{ __html: content || '' }}
    />
  );
};

const StandaloneShapeElement: React.FC<{ element: Shape }> = ({ element }) => {
  const { position, size, type, fillColor, strokeColor, strokeWidth, zIndex } = element;

  const getShapeStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      backgroundColor: fillColor,
      border: `${strokeWidth}px solid ${strokeColor}`,
      zIndex: zIndex || 1,
    };

    switch (type) {
      case 'circle':
        return { ...baseStyles, borderRadius: '50%' };
      case 'triangle':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          width: 0,
          height: 0,
          borderLeft: `${size.width / 2}px solid transparent`,
          borderRight: `${size.width / 2}px solid transparent`,
          borderBottom: `${size.height}px solid ${fillColor}`,
          border: 'none',
        };
      default: // rectangle
        return baseStyles;
    }
  };

  return <div style={getShapeStyles()} />;
};

const StandaloneImageElement: React.FC<{ element: Image }> = ({ element }) => {
  const { position, size, content, zIndex } = element;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: zIndex || 1,
      }}
    >
      <img
        src={content}
        alt="Slide element"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        crossOrigin="anonymous"
      />
    </div>
  );
};

const StandaloneBarChartElement: React.FC<{ element: BarChart }> = ({ element }) => {
  const { position, size, data, title, xAxisLabel, yAxisLabel, barColor, zIndex } = element;

  // For PDF export, we'll render a simple placeholder or try to render the chart
  // Since Plotly might not work in the detached DOM, we'll create a simple representation
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = size.width / data.length * 0.8;
  const chartHeight = size.height - 60; // Leave space for labels

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: zIndex || 1,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        padding: '10px',
        boxSizing: 'border-box',
      }}
    >
      {title && (
        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>
          {title}
        </div>
      )}
      <div style={{ position: 'relative', height: chartHeight }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (chartHeight - 40);
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${index * (size.width / data.length) + (size.width / data.length - barWidth) / 2}px`,
                bottom: '20px',
                width: `${barWidth}px`,
                height: `${barHeight}px`,
                backgroundColor: barColor || '#3498db',
              }}
            />
          );
        })}
      </div>
      {yAxisLabel && (
        <div style={{ position: 'absolute', left: '5px', top: '50%', transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          {yAxisLabel}
        </div>
      )}
      {xAxisLabel && (
        <div style={{ position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)' }}>
          {xAxisLabel}
        </div>
      )}
    </div>
  );
};

const StandalonePlotElement: React.FC<{ element: Plot }> = ({ element }) => {
  const { position, size, zIndex } = element;

  // For PDF export, render a placeholder for plot elements
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: zIndex || 1,
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6c757d',
      }}
    >
      <div>Plot Element</div>
    </div>
  );
};

export const StandaloneSlideRenderer: React.FC<StandaloneSlideRendererProps> = ({
  slide,
  style,
  className,
  scale = 1,
}) => {
  const renderElement = (element: ContentElement) => {
    switch (element.type) {
      case 'rectangle':
      case 'circle':
      case 'triangle':
        return <StandaloneShapeElement key={element.id} element={element as Shape} />;
      case 'textbox':
        return <StandaloneTextElement key={element.id} element={element as TextBox} />;
      case 'image':
        return <StandaloneImageElement key={element.id} element={element as Image} />;
      case 'plot':
        return <StandalonePlotElement key={element.id} element={element as Plot} />;
      case 'barchart':
        return <StandaloneBarChartElement key={element.id} element={element as BarChart} />;
      default:
        return null;
    }
  };

  return (
    <div
      data-slide-container
      style={{
        width: PRESENTATION_DIMENSIONS.WIDTH,
        height: PRESENTATION_DIMENSIONS.HEIGHT,
        backgroundColor: slide.background || '#ffffff',
        overflow: 'hidden',
        position: 'relative',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        ...style,
      }}
      className={className}
    >
      {slide.elements.map(renderElement)}
    </div>
  );
};