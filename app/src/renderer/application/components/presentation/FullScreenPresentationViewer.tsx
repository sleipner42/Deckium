import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { usePresentation } from '../../context/PresentationContext';
import { SlideView } from './SlideView';

const FullScreenPresentationViewer: React.FC = () => {
  const { slides } = usePresentation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'Space':
        // Move to next slide if available
        if (currentIndex < slides.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
        break;
      case 'ArrowLeft':
        // Move to previous slide if available
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
        break;
      case 'Escape':
        window.electron.presentation.closeFullscreen();
        break;
      default:
        // Check for number keys 1-9
        if (/^[1-9]$/.test(e.key)) {
          const slideNumber = parseInt(e.key, 10) - 1;
          if (slideNumber < slides.length) {
            setCurrentIndex(slideNumber);
          }
        }
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [slides.length, currentIndex]); // Add currentIndex as dependency

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        bgcolor: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {slides.length > 0 && (
        <SlideView
          defaultScale={1}
          selectedSlideOverride={slides[currentIndex]}
        />
      )}
    </Box>
  );
};

export default FullScreenPresentationViewer;
