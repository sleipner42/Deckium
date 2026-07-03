import axios from 'axios';
import { nativeImage } from 'electron';

export interface FetchedImage {
    ok: boolean;
    status?: number;
    statusText?: string;
    buffer?: Buffer;
    mimeType?: string;
}

/**
 * Fetch an image URL as bytes. Never throws: network/HTTP failures come back
 * as {ok: false} with whatever status info is available, so tools can report
 * an actionable error instead of placing a broken image on a slide.
 */
export async function fetchImage(
    url: string,
    timeoutMs = 8000,
): Promise<FetchedImage> {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: timeoutMs,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'image/*,*/*;q=0.8',
            },
        });
        return {
            ok: true,
            status: response.status,
            buffer: Buffer.from(response.data),
            mimeType: String(response.headers['content-type'] ?? '').split(
                ';',
            )[0],
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                ok: false,
                status: error.response?.status,
                statusText: error.response?.statusText ?? error.message,
            };
        }
        return {
            ok: false,
            statusText:
                error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Read pixel dimensions from image bytes via Electron's nativeImage (main
 * process only). Returns null for formats it cannot decode (e.g. SVG) —
 * callers must treat unknown dimensions honestly, not fabricate a ratio.
 */
export function probeDimensions(
    buffer: Buffer,
): { width: number; height: number } | null {
    try {
        const image = nativeImage.createFromBuffer(buffer);
        if (image.isEmpty()) {
            return null;
        }
        const size = image.getSize();
        if (size.width <= 0 || size.height <= 0) {
            return null;
        }
        return size;
    } catch {
        return null;
    }
}
