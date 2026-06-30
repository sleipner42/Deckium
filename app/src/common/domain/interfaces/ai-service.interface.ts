export interface MessageContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}
