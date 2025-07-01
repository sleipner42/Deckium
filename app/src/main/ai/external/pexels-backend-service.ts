import AuthService from '../../auth/service';

const API_URL = process.env.BACKEND_API_URL || 'https://api.deckium.xyz';

export interface PexelsSearchRequest {
    query: string;
    orientation?: 'landscape' | 'portrait' | 'square';
    min_width?: number;
    min_height?: number;
    color?: string;
}

export interface PexelsImageUrls {
    original: string;
    large: string;
    large2x: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
}

export interface PexelsImage {
    id: number;
    urls: PexelsImageUrls;
    width: number;
    height: number;
    aspect_ratio: number;
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    alt: string;
    description: string;
    source_url: string;
    avg_color: string;
    liked: boolean;
}

export interface IPexelsService {
    searchImages(request: PexelsSearchRequest): Promise<PexelsImage>;
}

export class PexelsBackendService implements IPexelsService {
    private authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    async searchImages(request: PexelsSearchRequest): Promise<PexelsImage> {
        const startTime = performance.now();

        try {
            const accessToken = await this.getAuthToken();

            const params = new URLSearchParams({
                query: request.query,
            });

            if (request.orientation) {
                params.append('orientation', request.orientation);
            }
            if (request.min_width) {
                params.append('min_width', request.min_width.toString());
            }
            if (request.min_height) {
                params.append('min_height', request.min_height.toString());
            }
            if (request.color) {
                params.append('color', request.color);
            }

            console.log(
                `[PexelsService] Searching images with params: ${params.toString()}, url: ${API_URL}/pexels/search?${params.toString()}`,
            );

            const response = await fetch(
                `${API_URL}/pexels/search?${params.toString()}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `access_token=Bearer ${accessToken}`,
                    },
                    credentials: 'include',
                },
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Error from backend: ${error}`);
            }

            const data = await response.json();

            const endTime = performance.now();
            console.log(
                `[PexelsService] Image search completed in ${endTime - startTime}ms`,
            );

            return data;
        } catch (error) {
            const endTime = performance.now();
            console.error(
                `[PexelsService] Error searching images (after ${endTime - startTime}ms):`,
                error,
            );
            throw error;
        }
    }

    private async getAuthToken(): Promise<string> {
        const user = await this.authService.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }
        return user.accessToken;
    }
}

export class PexelsServiceFactory {
    private authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    createService(): IPexelsService {
        const initStartTime = performance.now();

        try {
            console.log('[PexelsService] Using backend service at', API_URL);

            const initEndTime = performance.now();

            return new PexelsBackendService(this.authService);
        } catch (error) {
            const initEndTime = performance.now();
            console.error(
                `[PexelsService] Failed to initialize client (after ${initEndTime - initStartTime}ms):`,
                error,
            );
            throw error;
        }
    }
}
