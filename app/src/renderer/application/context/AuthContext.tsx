import React, { createContext, useContext, useEffect, useState } from 'react';
import { IAuthState, IUser } from '../../../common/domain/interfaces/auth.interface';

interface AuthContextProps {
  authState: IAuthState;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
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
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [authState, setAuthState] = useState<IAuthState>(initialState);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await window.electron.auth.getUser();
        if (response.success && response.user) {
          setAuthState({
            isAuthenticated: true,
            user: response.user,
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

    const unsubscribe = window.electron.ipcRenderer.on('auth:user-updated', (user: IUser | null) => {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: !!user,
        user,
        loading: false,
      }));
    });

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
            user: userResponse.user,
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
            user: userResponse.user,
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

  return (
    <AuthContext.Provider value={{ authState, login, logout, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
}; 