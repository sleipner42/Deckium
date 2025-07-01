import {
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginScreen: React.FC = () => {
    const { authState, login } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authState.error) {
            setError(authState.error);
            setIsLoggingIn(false);
        }
    }, [authState.error]);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        setError(null);
        try {
            await login();
        } catch (err) {
            setError((err as Error).message);
            setIsLoggingIn(false);
        }
    };

    return (
        <Container
            maxWidth="sm"
            sx={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    width: '100%',
                    borderRadius: 2,
                }}
            >
                <Typography variant="h4" component="h1">
                    Welcome to Deckium
                </Typography>
                <Typography variant="body1" textAlign="center">
                    Please log in to continue using the application.
                </Typography>

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}

                <Box sx={{ width: '100%', mt: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        sx={{ height: 48 }}
                    >
                        {isLoggingIn ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            'Log In'
                        )}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default LoginScreen;
