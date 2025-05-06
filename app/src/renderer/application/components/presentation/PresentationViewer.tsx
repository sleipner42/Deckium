import React from 'react';
import { SlideView } from './SlideView';
import { Box, Paper, useTheme } from '@mui/material';
import Toolbar from '../common/Toolbar';

const PresentationViewer: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      bgcolor: 'background.default',
    }}>
      {/* Apple Music style toolbar */}
      <Toolbar />
      
      {/* Presentation content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <SlideView defaultScale={1}/>
      </Box>
    </Box>
  );
};

export default PresentationViewer; 