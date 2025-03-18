import React from 'react';
import { SlideView } from './SlideView';
import { Box, Paper, useTheme } from '@mui/material';

const PresentationViewer: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      bgcolor: 'background.default',
    }}>
      <SlideView defaultScale={1}/>
    </Box>
  );
};

export default PresentationViewer; 