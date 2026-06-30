import React, { createContext, useContext } from 'react';

interface IUser {
    id: string;
    username: string;
    email: string;
}

interface IAuthState {
    isAuthenticated: boolean;
    user: IUser | null;
    loading: boolean;
    error: string | null;
}

interface AuthContextProps {
    authState: IAuthState;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshTokens: () => Promise<boolean>;
    getBalance: () => Promise<number>;
}

const standaloneUser: IUser = {
    id: 'standalone-user',
    username: 'You',
    email: '',
};

const standaloneAuthState: IAuthState = {
    isAuthenticated: true,
    user: standaloneUser,
    loading: false,
    error: null,
};

const AuthContext = createContext<AuthContextProps>({
    authState: standaloneAuthState,
    login: async () => {},
    logout: async () => {},
    refreshTokens: async () => true,
    getBalance: async () => 0,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    return (
        <AuthContext.Provider
            value={{
                authState: standaloneAuthState,
                login: async () => {},
                logout: async () => {},
                refreshTokens: async () => true,
                getBalance: async () => 0,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
