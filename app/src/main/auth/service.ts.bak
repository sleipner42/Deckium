import * as path from 'path';
import * as fs from 'fs';
import { URL } from 'url';
import { app, BrowserWindow, session } from 'electron';
import {
  IAuthService,
  IUser,
} from '../../common/domain/interfaces/auth.interface';

const API_BASE_URL = 'http://localhost:8000';
const AUTH_URL = `${API_BASE_URL}/auth/login`;
const USER_DATA_FILE = path.join(app.getPath('userData'), 'user-auth.json');

export default class AuthService implements IAuthService {
  private authWindow: BrowserWindow | null = null;
  private user: IUser | null = null;

  constructor() {
    this.loadUserFromFile();
  }

  private async loadUserFromFile(): Promise<void> {
    try {
      if (fs.existsSync(USER_DATA_FILE)) {
        const userData = fs.readFileSync(USER_DATA_FILE, 'utf8');
        if (userData) {
          this.user = JSON.parse(userData);
        }
      }
    } catch (error) {
      console.error('Failed to load user data from file:', error);
    }
  }

  private async saveUserToFile(user: IUser): Promise<void> {
    this.user = user;
    try {
      fs.writeFileSync(USER_DATA_FILE, JSON.stringify(user), 'utf8');
    } catch (error) {
      console.error('Failed to save user data to file:', error);
    }
  }

  async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: 'persist:oauth',
        },
      });

      const ses = this.authWindow.webContents.session;
      ses.clearStorageData();

      console.log(`Loading auth URL: ${AUTH_URL}`);
      this.authWindow.loadURL(AUTH_URL);

      let isRedirecting = false;
      const redirectTargets = ['http://localhost:3000', 'http://localhost:8000'];
      
      // Log navigation events for debugging
      this.authWindow.webContents.on('did-navigate', (_, url) => {
        console.log(`Navigation: ${url}`);
        this.checkForAuthSuccess(url, ses, resolve, reject);
      });
      
      this.authWindow.webContents.on('did-redirect-navigation', (_, url) => {
        console.log(`Redirect: ${url}`);
        this.checkForAuthSuccess(url, ses, resolve, reject);
      });
      
      this.authWindow.webContents.on('will-redirect', (event, url) => {
        console.log(`Will redirect: ${url}`);
        
        // Prevent multiple redirects processing
        if (isRedirecting) return;
        
        for (const target of redirectTargets) {
          if (url.startsWith(target)) {
            isRedirecting = true;
            this.checkForAuthSuccess(url, ses, resolve, reject);
            break;
          }
        }
      });
      
      this.authWindow.webContents.on('did-finish-load', async () => {
        const url = this.authWindow.webContents.getURL();
        console.log(`Finished loading: ${url}`);
        this.checkForAuthSuccess(url, ses, resolve, reject);
      });

      this.authWindow.on('closed', () => {
        this.authWindow = null;
        if (!this.user) {
          reject(new Error('Authentication window was closed'));
        }
      });
    });
  }
  
  private async checkForAuthSuccess(
    url: string, 
    ses: Electron.Session, 
    resolve: () => void, 
    reject: (error: Error) => void
  ): Promise<void> {
    try {
      const cookies = await ses.cookies.get({
        url: 'http://localhost:8000',
      });
      
      const accessTokenCookie = cookies.find(cookie => cookie.name === 'access_token');
      
      if (accessTokenCookie) {
        console.log('Found access token cookie!');
        const tokenValue = accessTokenCookie.value.replace('Bearer ', '');
        
        const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Cookie: `access_token=${accessTokenCookie.value}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error(
            `Failed to get user data: ${userResponse.statusText}`
          );
        }

        const userData = await userResponse.json();
        console.log('User data retrieved:', userData);
        
        const expirationDate = accessTokenCookie.expirationDate || 
          (Date.now() / 1000) + 24 * 60 * 60; // Default 1 day if not set
        
        this.saveUserToFile({
          id: userData.id,
          username: userData.name || userData.email.split('@')[0],
          email: userData.email,
          accessToken: tokenValue,
          expiresAt: new Date(expirationDate * 1000).getTime(),
        });
        
        this.closeAuthWindow();
        resolve();
      } else if (url.includes('auth_error=')) {
        // Handle auth error in URL
        const errorParam = new URL(url).searchParams.get('auth_error');
        throw new Error(errorParam || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.closeAuthWindow();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async logout(): Promise<void> {
    this.user = null;
    try {
      if (fs.existsSync(USER_DATA_FILE)) {
        fs.unlinkSync(USER_DATA_FILE);
      }
      
      const mainSession = session.fromPartition('persist:oauth');
      await mainSession.clearStorageData();
      
      await fetch(`${API_BASE_URL}/auth/logout`, {
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  async getUser(): Promise<IUser | null> {
    if (this.user && this.user.expiresAt && this.user.expiresAt < Date.now()) {
      await this.login();
    }
    return this.user;
  }

  async refreshTokens(): Promise<boolean> {
    try {
      await this.login();
      return true;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return false;
    }
  }

  private closeAuthWindow(): void {
    if (this.authWindow) {
      console.log('Closing auth window');
      this.authWindow.close();
      this.authWindow = null;
    }
  }
}
