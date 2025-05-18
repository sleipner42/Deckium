import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { PresentationProvider } from './application/context/PresentationContext';
import { AIProvider } from './application/context/AIContext';
import { CriticProvider } from './application/context/CriticContext';
import { AuthProvider } from './application/context/AuthContext';
import theme from './application/theme';
import './App.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AppContent from './application/routing/AppContent';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <PresentationProvider>
            <AIProvider>
              <CriticProvider>
                <Routes>
                  <Route path="/" element={<AppContent />} />
                </Routes>
              </CriticProvider>
            </AIProvider>
          </PresentationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
