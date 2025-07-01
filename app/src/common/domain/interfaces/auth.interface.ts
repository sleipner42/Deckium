import { IpcMainInvokeEvent } from 'electron';

export interface IUser {
    id: string;
    username: string;
    email: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
}

export interface IAuthState {
    isAuthenticated: boolean;
    user: IUser | null;
    loading: boolean;
    error: string | null;
}

export interface IAuthService {
    login(): Promise<void>;
    logout(): Promise<void>;
    getUser(): Promise<IUser | null>;
    refreshTokens(): Promise<boolean>;
    getBalance(): Promise<number>;
}

export type AuthChannels =
    | 'auth:login'
    | 'auth:logout'
    | 'auth:get-user'
    | 'auth:refresh-tokens'
    | 'auth:user-updated'
    | 'auth:get-balance';

export interface IAuthEvents {
    'auth:login': (event: IpcMainInvokeEvent) => Promise<void>;
    'auth:logout': (event: IpcMainInvokeEvent) => Promise<void>;
    'auth:get-user': (event: IpcMainInvokeEvent) => Promise<IUser | null>;
    'auth:refresh-tokens': (event: IpcMainInvokeEvent) => Promise<boolean>;
    'auth:get-balance': (event: IpcMainInvokeEvent) => Promise<number>;
}
