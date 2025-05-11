import React, { useState } from 'react';
import { Box, Typography, IconButton, Paper, Stack, Chip, Menu, MenuItem } from '@mui/material';
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
  } = usePresentation();

  const [contextMenuAnchorEl, setContextMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuSlideId, setContextMenuSlideId] = useState<null | string>(null);

  const handleContextMenuOpen = (event: React.MouseEvent<HTMLDivElement>, slideId: string) => {
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

  return (
    <Box
      className={className}
      sx={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Navigation Controls */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, px: 1 }}
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

      {/* Slide Thumbnails */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          overflowY: 'auto',
          px: 0.5,
          pb: 1,
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '2px',
          },
        }}
      >
        {currentPresentation.slides.map((slide, index) => (
          <Paper
            key={slide.id}
            elevation={0}
            onClick={() => goToSlide(index)}
            onContextMenu={(event) => handleContextMenuOpen(event, slide.id)}
            sx={{
              position: 'relative',
              width: '100%',
              pt: '56.25%', // 16:9 aspect ratio
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid',
              borderColor:
                selectedSlide?.id === slide.id ? 'primary.main' : 'divider',
              boxShadow:
                selectedSlide?.id === slide.id
                  ? '0 0 0 2px rgba(0, 122, 255, 0.2)'
                  : 'none',
              transition: 'all 0.2s ease-in-out',
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
              }}
            >
              <SlideView defaultScale={0.2} selectedSlideOverride={slide} selectableElements={false} />
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
        ))}
      </Box>

      {/* Context Menu for Slides */}
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
