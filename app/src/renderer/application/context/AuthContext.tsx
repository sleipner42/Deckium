import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    IAuthState,
    IUser,
} from '../../../common/domain/interfaces/auth.interface';

interface AuthContextProps {
    authState: IAuthState;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshTokens: () => Promise<boolean>;
    getBalance: () => Promise<number>;
}

const initialState: IAuthState = {
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
};

const AuthContext = createContext<AuthContextProps>({
    authState: initialState,
    login: async () => {},
    logout: async () => {},
    refreshTokens: async () => false,
    getBalance: async () => 0,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const [authState, setAuthState] = useState<IAuthState>(initialState);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const response = await window.electron.auth.getUser();
                if (response.success && response.user) {
                    setAuthState({
                        isAuthenticated: true,
                        user: response.user as IUser,
                        loading: false,
                        error: null,
                    });
                } else {
                    setAuthState({
                        isAuthenticated: false,
                        user: null,
                        loading: false,
                        error: null,
                    });
                }
            } catch (error) {
                setAuthState({
                    isAuthenticated: false,
                    user: null,
                    loading: false,
                    error: (error as Error).message,
                });
            }
        };

        checkAuthStatus();

        const unsubscribe = window.electron.ipcRenderer.on(
            'auth:user-updated',
            (data: unknown) => {
                const user = data as IUser | null;
                setAuthState((prev) => ({
                    ...prev,
                    isAuthenticated: !!user,
                    user,
                    loading: false,
                }));
            },
        );

        return () => {
            unsubscribe();
        };
    }, []);

    const login = async (): Promise<void> => {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await window.electron.auth.login();
            if (response.success) {
                const userResponse = await window.electron.auth.getUser();
                if (userResponse.success && userResponse.user) {
                    setAuthState({
                        isAuthenticated: true,
                        user: userResponse.user as IUser,
                        loading: false,
                        error: null,
                    });
                } else {
                    throw new Error('Failed to get user after login');
                }
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            setAuthState((prev) => ({
                ...prev,
                loading: false,
                error: (error as Error).message,
            }));
            throw error;
        }
    };

    const logout = async (): Promise<void> => {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await window.electron.auth.logout();
            if (response.success) {
                setAuthState({
                    isAuthenticated: false,
                    user: null,
                    loading: false,
                    error: null,
                });
            } else {
                throw new Error(response.error || 'Logout failed');
            }
        } catch (error) {
            setAuthState((prev) => ({
                ...prev,
                loading: false,
                error: (error as Error).message,
            }));
            throw error;
        }
    };

    const refreshTokens = async (): Promise<boolean> => {
        try {
            const response = await window.electron.auth.refreshTokens();
            if (response.success) {
                const userResponse = await window.electron.auth.getUser();
                if (userResponse.success && userResponse.user) {
                    setAuthState((prev) => ({
                        ...prev,
                        user: userResponse.user as IUser,
                    }));
                }
                return true;
            }
            return false;
        } catch (error) {
            setAuthState((prev) => ({
                ...prev,
                error: (error as Error).message,
            }));
            return false;
        }
    };

    const getBalance = async (): Promise<number> => {
        try {
            if (!authState.isAuthenticated || !authState.user) {
                return 0;
            }

            if (!window.electron.auth.getBalance) {
                console.warn(
                    'getBalance function is not available in the electron API',
                );
                return 0;
            }

            const response = await window.electron.auth.getBalance();
            if (response.success && response.balance !== undefined) {
                return response.balance;
            }

            return 0;
        } catch (error) {
            console.error('Error fetching balance:', error);
            return 0;
        }
    };

    return (
        <AuthContext.Provider
            value={{ authState, login, logout, refreshTokens, getBalance }}
        >
            {children}
        </AuthContext.Provider>
    );
};
