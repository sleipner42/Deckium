import { Box, Paper } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { Slide } from '../../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../../common/utils/constants';
import { usePresentation } from '../../context/PresentationContext';
import { SlideRenderer } from './SlideRenderer';

export const SlideView: React.FC<{
  defaultScale?: number;
  selectedSlideOverride?: Slide;
  selectableElements?: boolean;
}> = ({ defaultScale = 0.7, selectedSlideOverride, selectableElements }) => {
  const { selectedSlide } = usePresentation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(defaultScale);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const slideWidth = PRESENTATION_DIMENSIONS.WIDTH;
      const slideHeight = PRESENTATION_DIMENSIONS.HEIGHT;

      const widthScale = (containerWidth * 0.85) / slideWidth;
      const heightScale = (containerHeight * 0.85) / slideHeight;

      const newScale = Math.min(widthScale, heightScale);
      setScale(newScale);

      setDimensions({
        width: slideWidth,
        height: slideHeight,
      });
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: PRESENTATION_DIMENSIONS.WIDTH,
          height: PRESENTATION_DIMENSIONS.HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          position: 'relative',
        }}
      >
        {selectedSlide ? (
          <SlideRenderer
            slide={selectedSlideOverride || selectedSlide}
            selectableElements={selectableElements}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              color: 'text.secondary',
            }}
          >
            No slide selected. Please add or select a slide.
          </Box>
        )}
      </Paper>
    </Box>
  );
};
