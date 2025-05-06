import React from 'react';
import { PresentationProvider } from './application/context/PresentationContext';
import { AIProvider } from './application/context/AIContext';
import { 
  ThemeProvider, 
  CssBaseline,
} from '@mui/material';
import theme from './application/theme';
import './App.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AppContent from './application/routing/AppContent';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <PresentationProvider>
          <AIProvider>
            <Routes>
              <Route path="/" element={<AppContent />} />
            </Routes>
          </AIProvider>
        </PresentationProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App; 