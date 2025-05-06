import React from 'react';
import { useLocation } from 'react-router-dom';
import PresentationEditor from '../components/presentation/PresentationEditor';
import PresentationViewer from '../components/presentation/PresentationViewer';
import LoginScreen from '../components/auth/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { authState } = useAuth();
  
  const searchParams = new URLSearchParams(location.search);
  const layout = searchParams.get('layout') || 'editor';
  
  if (authState.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!authState.isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>{layout === 'editor' ? <PresentationEditor /> : <PresentationViewer />}</>
  );
};

export default AppContent;
