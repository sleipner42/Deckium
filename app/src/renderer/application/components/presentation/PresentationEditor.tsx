import React, { useEffect } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePresentation } from '../../context/PresentationContext';
import { SlideNavigation } from './SlideNavigation';
import { SlideView } from './SlideView';
import { ChatInterface } from '../common/ChatInterface';
import Toolbar from '../common/Toolbar';

const PresentationEditor: React.FC = () => {
  const { addSlide, undo, redo } = usePresentation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (Undo) or Cmd+Z on Mac
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Check for Ctrl+Y (Redo) or Ctrl+Shift+Z or Cmd+Shift+Z on Mac
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      {/* Apple Music style toolbar at the top */}
      <Toolbar />

      {/* Main content with sidebar and slide view */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Navigation Pane (Add Slide & Slide Navigation) - Moved to the LEFMOST */}
        <Paper
          elevation={0}
          sx={{
            width: 280, // Fixed width for navigation pane
            minWidth: 280,
            height: '100%',
            bgcolor: 'background.paper',
            // borderLeft: '1px solid', // Removed
            borderRight: '1px solid', // Added
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => addSlide()}
            sx={{
              m: 2,
              borderRadius: 1.5,
              py: 1,
            }}
          >
            Add Slide
          </Button>
          <Box
            sx={{
              flex: 1,
              px: 2,
              pb: 2,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <SlideNavigation className="slide-navigation" />
          </Box>
        </Paper>

        {/* Main content area (Slide View) - Stays in the middle */}
        <Box
          sx={{
            flex: 1, // Takes remaining space
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            // backgroundColor: 'lightgreen', // For debugging layout
          }}
        >
          {/* Slide view */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              width: '100%',
              position: 'relative',
            }}
          >
            <SlideView />
          </Box>
        </Box>

        {/* AI Assistant Pane (Chat Interface) - Moved to the RIGHTMOST */}
        <Paper
          elevation={0}
          sx={{
            width: 350, // Fixed width for chat pane
            minWidth: 350,
            height: '100%',
            bgcolor: 'background.paper',
            // borderRight: '1px solid', // Removed
            borderLeft: '1px solid', // Added
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            p: 2, // Retained padding consistent with original chat container
          }}
        >
          <Box
            sx={{
              fontWeight: 600,
              mb: 1.5,
              color: 'text.primary',
            }}
          >
            AI Assistant
          </Box>
          <Box
            sx={{
              flex: 1,
              bgcolor: 'background.default', // Or background.paper if preferred
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ChatInterface className="ai-chat-interface" />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default PresentationEditor;
