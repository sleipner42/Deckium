import React from 'react';
import { SnapGuide } from '../../utils/snapEngine';

interface SnapGuidesProps {
  guides: SnapGuide[];
  slideWidth: number;
  slideHeight: number;
  scale?: number;
}

export const SnapGuides: React.FC<SnapGuidesProps> = ({
  guides,
  slideWidth,
  slideHeight,
  scale = 1,
}) => {
  if (guides.length === 0) return null;

  const guideStyle = {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    zIndex: 1000,
  };

  const lineStyle = {
    backgroundColor: '#ff4081',
    opacity: 0.8,
    boxShadow: '0 0 1px rgba(255, 64, 129, 0.5)',
  };

  return (
    <div
      style={{
        ...guideStyle,
        width: slideWidth * scale,
        height: slideHeight * scale,
        top: 0,
        left: 0,
      }}
    >
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          return (
            <div
              key={`${guide.type}-${guide.position}-${index}`}
              style={{
                ...lineStyle,
                position: 'absolute',
                left: guide.position * scale,
                top: 0,
                width: 1,
                height: slideHeight * scale,
                transform: 'translateX(-0.5px)',
              }}
            />
          );
        } else {
          return (
            <div
              key={`${guide.type}-${guide.position}-${index}`}
              style={{
                ...lineStyle,
                position: 'absolute',
                left: 0,
                top: guide.position * scale,
                width: slideWidth * scale,
                height: 1,
                transform: 'translateY(-0.5px)',
              }}
            />
          );
        }
      })}
    </div>
  );
};
