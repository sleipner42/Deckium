import { CssBaseline, ThemeProvider } from '@mui/material';
import React from 'react';
import { AIProvider } from './application/context/AIContext';
import { AuthProvider } from './application/context/AuthContext';
import { LintingProvider } from './application/context/LintingContext';
import { PresentationProvider } from './application/context/PresentationContext';
import { TextEditingProvider } from './application/context/TextEditingContext';
import theme from './application/theme';
import './App.css';
import 'quill/dist/quill.snow.css';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import AppContent from './application/routing/AppContent';

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <AuthProvider>
                    <PresentationProvider>
                        <LintingProvider>
                            <TextEditingProvider>
                                <AIProvider>
                                    <Routes>
                                        <Route
                                            path="/"
                                            element={<AppContent />}
                                        />
                                    </Routes>
                                </AIProvider>
                            </TextEditingProvider>
                        </LintingProvider>
                    </PresentationProvider>
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
};

export default App;
