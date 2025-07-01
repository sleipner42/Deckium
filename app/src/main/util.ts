import path from 'node:path';
import { URL } from 'node:url';

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
    if (process.platform === 'darwin' && process.argv.length >= 2) {
        const url = process.argv[1];
        if (url && url.startsWith('deckium://')) {
            return url;
        }
    }

    if (process.platform === 'win32' && process.argv.length >= 2) {
        const url = process.argv[1];
        if (url && url.startsWith('deckium://')) {
            return url;
        }
    }

    if (process.platform === 'linux' && process.argv.length >= 2) {
        const url = process.argv[1];
        if (url && url.startsWith('deckium://')) {
            return url;
        }
    }

    return null;
}
