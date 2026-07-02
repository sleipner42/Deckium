import { Box, useTheme } from '@mui/material';
import React from 'react';
import { SlideView } from './SlideView';

const PresentationViewer: React.FC = () => {
    const _theme = useTheme();

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
                <SlideView defaultScale={2} selectableElements={false} />
            </Box>
        </Box>
    );
};

export default PresentationViewer;
