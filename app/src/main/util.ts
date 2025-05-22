/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import { app } from 'electron';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export function getProtocolArgs(): string | null {
  // Check if the app was launched with a URL
  if (process.platform === 'darwin' && process.argv.length >= 2) {
    const url = process.argv[1];
    if (url && url.startsWith('kraftpo://')) {
      return url;
    }
  }

  if (process.platform === 'win32' && process.argv.length >= 2) {
    const url = process.argv[1];
    if (url && url.startsWith('kraftpo://')) {
      return url;
    }
  }

  return null;
}
