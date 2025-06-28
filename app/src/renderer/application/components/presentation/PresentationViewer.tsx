import { Box, Paper, useTheme } from '@mui/material';
import React from 'react';
import Toolbar from '../common/Toolbar';
import { SlideView } from './SlideView';

const PresentationViewer: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <SlideView defaultScale={2} />
      </Box>
    </Box>
  );
};

export default PresentationViewer;
