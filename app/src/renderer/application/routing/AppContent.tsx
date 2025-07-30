import { Box, CircularProgress } from '@mui/material';
import React from 'react';
import { useLocation } from 'react-router-dom';
import LoginScreen from '../components/auth/LoginScreen';
import { DebugPanel } from '../components/common/DebugPanel';
import FullScreenPresentationViewer from '../components/presentation/FullScreenPresentationViewer';
import PresentationEditor from '../components/presentation/PresentationEditor';
import PresentationViewer from '../components/presentation/PresentationViewer';
import { useAuth } from '../context/AuthContext';

const AppContent: React.FC = () => {
    const location = useLocation();
    const { authState } = useAuth();

    const searchParams = new URLSearchParams(location.search);
    const layout = searchParams.get('layout') || 'editor';

    if (authState.loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!authState.isAuthenticated) {
        return <LoginScreen />;
    }

    if (layout === 'fullscreen') {
        return <FullScreenPresentationViewer />;
    }

    return (
        <>
            {layout === 'editor' ? (
                <PresentationEditor />
            ) : (
                <PresentationViewer />
            )}
            <DebugPanel />
        </>
    );
};

export default AppContent;
