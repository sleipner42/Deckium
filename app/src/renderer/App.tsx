import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { PresentationProvider } from './application/context/PresentationContext';
import { AIProvider } from './application/context/AIContext';
import { CriticProvider } from './application/context/CriticContext';
import { AuthProvider } from './application/context/AuthContext';
import { TextEditingProvider } from './application/context/TextEditingContext';
import theme from './application/theme';
import './App.css';
import 'quill/dist/quill.snow.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AppContent from './application/routing/AppContent';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <PresentationProvider>
            <TextEditingProvider>
              <AIProvider>
                <CriticProvider>
                  <Routes>
                    <Route path="/" element={<AppContent />} />
                  </Routes>
                </CriticProvider>
              </AIProvider>
            </TextEditingProvider>
          </PresentationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
