import React from 'react';
import { usePresentation } from '../../context/PresentationContext';
import { SlideNavigation } from './SlideNavigation';
import { SlideView } from './SlideView';
import { ChatInterface } from '../common/ChatInterface';
import {
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Toolbar from '../common/Toolbar';

const PresentationEditor: React.FC = () => {
  const { 
    addSlide, 
  } = usePresentation();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      bgcolor: 'background.default',
      color: 'text.primary',
    }}>
      {/* Apple Music style toolbar at the top */}
      <Toolbar />
      
      {/* Main content with sidebar and slide view */}
      <Box sx={{ 
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <Paper 
          elevation={0}
          sx={{
            width: 400,
            minWidth: 400,
            maxWidth: 400,
            height: '100%',
            bgcolor: 'background.paper',
            borderRight: '1px solid',
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
              overflowY: 'auto',
              px: 2,
              pb: 2,
            }}
          >
            <SlideNavigation className="slide-navigation" />
          </Box>
          
          <Paper
            elevation={0}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              p: 2,
              bgcolor: 'background.paper',
              height: 650,
              minHeight: 650,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <Box sx={{ 
              fontWeight: 600, 
              mb: 1.5,
              color: 'text.primary',
            }}>
              AI Assistant
            </Box>
            <Box sx={{ 
              flex: 1, 
              bgcolor: 'background.default', 
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}>
              <ChatInterface className="ai-chat-interface" />
            </Box>
          </Paper>
        </Paper>

        {/* Main content area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Slide view */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            width: '100%',
            position: 'relative',
          }}>
            <SlideView />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PresentationEditor; 