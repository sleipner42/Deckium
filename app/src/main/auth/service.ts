import * as fs from 'node:fs';
import * as path from 'node:path';
import { URL } from 'node:url';
import { app, shell } from 'electron';
import type {
  IAuthService,
  IUser,
} from '../../common/domain/interfaces/auth.interface';
import { Logger } from '../utils/logger';

const CONFIG = {
  apiBaseUrl: process.env.BACKEND_API_URL || 'https://api.deckium.xyz',
  sessionPartition: 'persist:main',
  windowWidth: 800,
  windowHeight: 600,
  tokenExpiry: 24 * 60 * 60, // 24 hours in seconds
  userDataFile: path.join(app.getPath('userData'), 'user-auth.json'),
  authTimeoutMs: 120000,
};

export default class AuthService implements IAuthService {
  private user: IUser | null = null;

  private authPromise: Promise<void> | null = null;

  private authResolver: (() => void) | null = null;

  private authRejecter: ((error: Error) => void) | null = null;

  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
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
      this.logger.logSystem('Failed to load user data from file', 'warn', {
        error: error instanceof Error ? error.message : String(error),
        filePath: CONFIG.userDataFile,
      });
    }
  }

  private saveUserToFile(user: IUser): void {
    this.user = user;
    try {
      fs.writeFileSync(CONFIG.userDataFile, JSON.stringify(user), 'utf8');
      this.logger.logSystem('User data saved successfully', 'debug');
    } catch (error) {
      this.logger.logSystem('Failed to save user data to file', 'error', {
        error: error instanceof Error ? error.message : String(error),
        filePath: CONFIG.userDataFile,
      });
    }
  }

  async login(): Promise<void> {
    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = new Promise((resolve, reject) => {
      this.authResolver = resolve;
      this.authRejecter = reject;

      const authUrl = `${CONFIG.apiBaseUrl}/auth/login?redirect_type=desktop`;

      shell.openExternal(authUrl).catch((error) => {
        this.logger.logSystem(
          'Failed to open external browser for auth',
          'error',
          {
            error: error instanceof Error ? error.message : String(error),
            authUrl,
          },
        );
        this.cleanupAuthPromise();
        reject(new Error('Failed to open browser for authentication'));
      });

      setTimeout(() => {
        if (this.authRejecter) {
          this.logger.logSystem('Authentication timeout', 'warn', {
            timeoutMs: CONFIG.authTimeoutMs,
          });
          this.cleanupAuthPromise();
          reject(new Error('Authentication timeout - please try again'));
        }
      }, CONFIG.authTimeoutMs);
    });

    return this.authPromise;
  }

  handleDeepLink(url: string): void {
    try {
      const parsedUrl = new URL(url);
      this.logger.logSystem('Processing deep link', 'debug', { url });

      if (parsedUrl.protocol !== 'deckium:') {
        return;
      }

      if (parsedUrl.hostname === 'auth') {
        if (parsedUrl.pathname === '/success') {
          this.handleAuthSuccess(parsedUrl);
        } else if (parsedUrl.pathname === '/error') {
          this.handleAuthError(parsedUrl);
        }
      }
    } catch (error) {
      this.logger.logSystem('Error processing deep link', 'error', {
        error: error instanceof Error ? error.message : String(error),
        url,
      });
      this.handleAuthError(
        new URL('deckium://auth/error?error=Invalid deep link'),
      );
    }
  }

  private async handleAuthSuccess(url: URL): Promise<void> {
    try {
      const token = url.searchParams.get('token');
      const userId = url.searchParams.get('userId');
      const email = url.searchParams.get('email');
      const name = url.searchParams.get('name');

      if (!token || !userId || !email) {
        throw new Error('Missing required authentication parameters');
      }

      const expirationDate = Date.now() + CONFIG.tokenExpiry * 1000;

      this.saveUserToFile({
        id: userId,
        username: name || email.split('@')[0],
        email,
        accessToken: token,
        expiresAt: expirationDate,
      });

      this.logger.logSystem('Authentication successful', 'info', {
        userId,
        email,
      });

      if (this.authResolver) {
        this.authResolver();
        this.cleanupAuthPromise();
      }
    } catch (error) {
      this.logger.logSystem('Authentication success handling failed', 'error', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (this.authRejecter) {
        this.authRejecter(
          error instanceof Error ? error : new Error(String(error)),
        );
        this.cleanupAuthPromise();
      }
    }
  }

  private handleAuthError(url: URL): void {
    const errorMessage =
      url.searchParams.get('error') || 'Authentication failed';

    this.logger.logSystem('Authentication error received', 'error', {
      errorMessage,
      url: url.toString(),
    });

    if (this.authRejecter) {
      this.authRejecter(new Error(errorMessage));
      this.cleanupAuthPromise();
    }
  }

  private cleanupAuthPromise(): void {
    this.authPromise = null;
    this.authResolver = null;
    this.authRejecter = null;
  }

  async logout(): Promise<void> {
    this.user = null;

    if (fs.existsSync(CONFIG.userDataFile)) {
      fs.unlinkSync(CONFIG.userDataFile);
    }

    try {
      await fetch(`${CONFIG.apiBaseUrl}/auth/logout`, {
        credentials: 'include',
      });
      this.logger.logSystem('User logout successful', 'info');
    } catch (error) {
      this.logger.logSystem('Logout request failed (ignoring)', 'debug', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getUser(): Promise<IUser | null> {
    if (this.user?.expiresAt && this.user.expiresAt < Date.now()) {
      try {
        await this.refreshTokens();
      } catch (error) {
        this.logger.logSystem('Token refresh failed, clearing user', 'warn', {
          error: error instanceof Error ? error.message : String(error),
        });
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

      const response = await fetch(
        `${CONFIG.apiBaseUrl}/transactions/balance`,
        {
          headers: {
            Cookie: `access_token=Bearer ${user.accessToken}`,
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get balance: ${response.statusText}`);
      }

      const data = await response.text();
      const balance = parseFloat(data);

      return Number.isNaN(balance) ? 0 : balance;
    } catch (error) {
      this.logger.logSystem('Error fetching user balance', 'warn', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  async refreshTokens(): Promise<boolean> {
    await this.login();
    return !!this.user;
  }
}
