import { ipcMain } from 'electron';
import AuthService from './service';

export function setupAuthIPC(authService: AuthService): void {
  ipcMain.handle('auth:login', async () => {
    try {
      await authService.login();
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      await authService.logout();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:get-user', async () => {
    try {
      const user = await authService.getUser();
      return { success: true, user };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:refresh-tokens', async () => {
    try {
      const success = await authService.refreshTokens();
      return { success };
    } catch (error) {
      console.error('Refresh tokens error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:get-balance', async () => {
    try {
      const balance = await authService.getBalance();
      return { success: true, balance };
    } catch (error) {
      console.error('Get balance error:', error);
      return { success: false, error: (error as Error).message, balance: 0 };
    }
  });
}
