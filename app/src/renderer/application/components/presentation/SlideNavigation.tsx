import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Stack,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { SlideRenderer } from './SlideRenderer';
import { usePresentation } from '../../context/PresentationContext';
import { SlideView } from './SlideView';

interface SlideNavigationProps {
  className?: string;
}

export const SlideNavigation: React.FC<SlideNavigationProps> = ({
  className,
}) => {
  const {
    currentPresentation,
    currentSlideIndex,
    selectedSlide,
    nextSlide,
    previousSlide,
    goToSlide,
    deleteSlide,
    reorderSlides,
  } = usePresentation();

  const [contextMenuAnchorEl, setContextMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const [contextMenuSlideId, setContextMenuSlideId] = useState<null | string>(
    null,
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleContextMenuOpen = (
    event: React.MouseEvent<HTMLDivElement>,
    slideId: string,
  ) => {
    event.preventDefault();
    setContextMenuAnchorEl(event.currentTarget);
    setContextMenuSlideId(slideId);
  };

  const handleContextMenuClose = () => {
    setContextMenuAnchorEl(null);
    setContextMenuSlideId(null);
  };

  const handleDeleteSlide = () => {
    if (contextMenuSlideId) {
      deleteSlide(contextMenuSlideId);
    }
    handleContextMenuClose();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('Drag start:', index);
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      // Determine if we should insert before or after based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const mouseY = e.clientY;
      
      // If mouse is in the top half, insert before (same index)
      // If mouse is in the bottom half, insert after (index + 1)
      const insertIndex = mouseY < midpoint ? index : index + 1;
      setDragOverIndex(insertIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're leaving the entire container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, slideIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use the calculated dragOverIndex instead of the slideIndex
    let targetIndex = dragOverIndex !== null ? dragOverIndex : slideIndex;
    
    // Clamp target index to valid bounds - if targeting beyond last slide, move to last position
    const maxIndex = currentPresentation.slides.length - 1;
    if (targetIndex > maxIndex) {
      targetIndex = maxIndex;
    }
    
    console.log('Drop triggered on slide:', { 
      draggedIndex, 
      slideIndex, 
      dragOverIndex, 
      targetIndex,
      maxIndex 
    });
    
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      try {
        console.log('Calling reorderSlides:', draggedIndex, '→', targetIndex);
        await reorderSlides(draggedIndex, targetIndex);
        console.log('Reorder completed successfully');
      } catch (error) {
        console.error('Error reordering slides:', error);
      }
    } else {
      console.log('No reorder needed - same position or invalid drag');
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    console.log('Drag end');
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleSlideClick = (index: number) => {
    if (!isDragging) {
      goToSlide(index);
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, px: 1, flexShrink: 0 }}
      >
        <IconButton
          size="small"
          onClick={previousSlide}
          disabled={currentSlideIndex === 0}
          sx={{
            color: 'text.secondary',
            '&.Mui-disabled': {
              color: 'action.disabled',
            },
          }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>

        <Chip
          label={`${currentSlideIndex + 1} / ${currentPresentation.slides.length}`}
          size="small"
          variant="outlined"
          sx={{
            borderRadius: 1,
            height: 24,
            fontSize: '0.75rem',
            fontWeight: 500,
            bgcolor: 'background.paper',
            borderColor: 'divider',
          }}
        />

        <IconButton
          size="small"
          onClick={nextSlide}
          disabled={currentSlideIndex === currentPresentation.slides.length - 1}
          sx={{
            color: 'text.secondary',
            '&.Mui-disabled': {
              color: 'action.disabled',
            },
          }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          px: 0.5,
          pb: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0,0,0,0.3)',
          },
        }}
      >
        {/* Drop indicator at the top */}
        {dragOverIndex === 0 && draggedIndex !== null && (
          <Box
            sx={{
              height: '4px',
              backgroundColor: 'primary.main',
              borderRadius: '2px',
              mx: 1,
              mb: -0.75,
              zIndex: 1000,
            }}
          />
        )}

        {currentPresentation.slides.map((slide, index) => (
          <React.Fragment key={slide.id}>
            <Paper
              elevation={0}
              draggable
              onClick={() => handleSlideClick(index)}
              onContextMenu={(event) => handleContextMenuOpen(event, slide.id)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              sx={{
                position: 'relative',
                width: '100%',
                pt: '56.25%',
                borderRadius: 1,
                overflow: 'hidden',
                cursor: draggedIndex === index ? 'grabbing' : 'grab',
                border: '2px solid',
                borderColor: 
                  dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
                    ? 'primary.main'
                    : selectedSlide?.id === slide.id 
                      ? 'primary.main' 
                      : 'divider',
                boxShadow: selectedSlide?.id === slide.id
                  ? '0 0 0 2px rgba(0, 122, 255, 0.2)'
                  : 'none',
                opacity: draggedIndex === index ? 0.5 : 1,
                transition: 'all 0.2s ease-in-out',
                transform: draggedIndex === index ? 'scale(0.95)' : 'scale(1)',
                '&:hover': {
                  borderColor:
                    selectedSlide?.id === slide.id
                      ? 'primary.main'
                      : 'primary.light',
                },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'background.paper',
                  pointerEvents: 'none',
                }}
              >
                <SlideView
                  defaultScale={0.2}
                  selectedSlideOverride={slide}
                  selectableElements={false}
                />
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  py: 0.5,
                  px: 1,
                  bgcolor: 'rgba(0,0,0,0.03)',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                    fontWeight: selectedSlide?.id === slide.id ? 600 : 400,
                  }}
                >
                  Slide {index + 1}
                </Typography>
              </Box>
            </Paper>

            {/* Drop indicator after each slide */}
            {dragOverIndex === index + 1 && draggedIndex !== null && (
              <Box
                sx={{
                  height: '4px',
                  backgroundColor: 'primary.main',
                  borderRadius: '2px',
                  mx: 1,
                  mt: -0.75,
                  mb: -0.75,
                  zIndex: 1000,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </Box>

      <Menu
        anchorEl={contextMenuAnchorEl}
        open={Boolean(contextMenuAnchorEl)}
        onClose={handleContextMenuClose}
        MenuListProps={{
          'aria-labelledby': 'slide-context-menu',
        }}
      >
        <MenuItem onClick={handleDeleteSlide} disabled={!contextMenuSlideId}>
          Delete Slide
        </MenuItem>
      </Menu>
    </Box>
  );
};