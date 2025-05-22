import * as path from 'path';
import * as fs from 'fs';
import { URL } from 'url';
import { app, BrowserWindow, session } from 'electron';
import {
  IAuthService,
  IUser,
} from '../../common/domain/interfaces/auth.interface';

const CONFIG = {
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.deckium.xyz',
  sessionPartition: 'persist:main',
  windowWidth: 800,
  windowHeight: 600,
  tokenExpiry: 24 * 60 * 60, // 24 hours in seconds
  userDataFile: path.join(app.getPath('userData'), 'user-auth.json'),
};

export default class AuthService implements IAuthService {
  private authWindow: BrowserWindow | null = null;
  private user: IUser | null = null;

  constructor() {
    this.loadUserFromFile();
  }

  private loadUserFromFile(): void {
    try {
      if (fs.existsSync(CONFIG.userDataFile)) {
        const userData = fs.readFileSync(CONFIG.userDataFile, 'utf8');
        if (userData) {
          this.user = JSON.parse(userData);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  private saveUserToFile(user: IUser): void {
    this.user = user;
    console.log('user', user.accessToken);
    try {
      fs.writeFileSync(CONFIG.userDataFile, JSON.stringify(user), 'utf8');
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  }

  async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.closeAuthWindow();
      
      this.authWindow = new BrowserWindow({
        width: CONFIG.windowWidth,
        height: CONFIG.windowHeight,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: CONFIG.sessionPartition,
        },
        parent: BrowserWindow.getFocusedWindow() || undefined,
        modal: true,
      });

      const ses = this.authWindow.webContents.session;
      this.authWindow.loadURL(`${CONFIG.apiBaseUrl}/auth/login`);
      
      this.authWindow.webContents.on('did-navigate', (_, url) => {
        if (url.includes('login_success')) {
          this.processAuthSuccess(url, ses, resolve, reject);
        } else if (url.includes('login_failed')) {
          reject(new Error('Authentication failed'));
        }
      });
      
      this.authWindow.on('closed', () => {
        this.authWindow = null;
        if (!this.user) {
          reject(new Error('Authentication window closed'));
        }
      });
    });
  }
  
  private async processAuthSuccess(
    url: string, 
    ses: Electron.Session,
    resolve: () => void, 
    reject: (error: Error) => void
  ): Promise<void> {
    try {
      const accessTokenCookie = await this.findAccessTokenCookie(ses);
      
      if (accessTokenCookie) {
        const tokenValue = accessTokenCookie.value.replace('Bearer ', '');
        const userData = await this.fetchUserData(accessTokenCookie.value);
        
        const expirationDate = accessTokenCookie.expirationDate || 
          (Date.now() / 1000) + CONFIG.tokenExpiry;
        
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
        const parsedUrl = new URL(url);
        const errorParam = parsedUrl.searchParams.get('auth_error');
        throw new Error(errorParam || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.closeAuthWindow();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  private async fetchUserData(accessToken: string): Promise<any> {
    const userResponse = await fetch(`${CONFIG.apiBaseUrl}/auth/me`, {
      headers: {
        Cookie: `access_token=${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to get user data: ${userResponse.statusText}`);
    }

    return userResponse.json();
  }
  
  private async findAccessTokenCookie(ses: Electron.Session): Promise<Electron.Cookie | null> {
    const apiUrl = new URL(CONFIG.apiBaseUrl);
    const domains = ['localhost', apiUrl.hostname];
    
    for (const domain of domains) {
      const domainCookies = await ses.cookies.get({
        url: `${apiUrl.protocol}//${domain}:${apiUrl.port}`,
      });
      
      const tokenCookie = domainCookies.find(cookie => cookie.name === 'access_token');
      if (tokenCookie) {
        return tokenCookie;
      }
    }
    
    return null;
  }

  async logout(): Promise<void> {
    this.user = null;
    
    if (fs.existsSync(CONFIG.userDataFile)) {
      fs.unlinkSync(CONFIG.userDataFile);
    }
    
    const mainSession = session.fromPartition(CONFIG.sessionPartition);
    const apiUrl = new URL(CONFIG.apiBaseUrl);
    const domains = ['localhost', apiUrl.hostname];
    
    for (const domain of domains) {
      await mainSession.cookies.remove(
        `${apiUrl.protocol}//${domain}:${apiUrl.port}`, 
        'access_token'
      );
    }
    
    try {
      await fetch(`${CONFIG.apiBaseUrl}/auth/logout`, {
        credentials: 'include',
      });
    } catch (e) {}
  }

  async getUser(): Promise<IUser | null> {
    if (this.user?.expiresAt && this.user.expiresAt < Date.now()) {
      try {
        await this.refreshTokens();
      } catch (e) {
        this.user = null;
      }
    }
    return this.user;
  }

  async getBalance(): Promise<number> {
    try {
      const user = await this.getUser();
      if (!user) {
        return 0;
      }
      
      const response = await fetch(`${CONFIG.apiBaseUrl}/transactions/balance`, {
        headers: {
          Cookie: `access_token=Bearer ${user.accessToken}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get balance: ${response.statusText}`);
      }
      
      const data = await response.text();
      const balance = parseFloat(data);
      
      return isNaN(balance) ? 0 : balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  async refreshTokens(): Promise<boolean> {
    await this.login();
    return !!this.user;
  }

  private closeAuthWindow(): void {
    if (this.authWindow) {
      this.authWindow.close();
      this.authWindow = null;
    }
  }
}
