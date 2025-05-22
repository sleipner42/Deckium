import { Message } from '../../../common/domain/entities/ai-types';
import {
  IAIService,
  IAIServiceFactory,
  MessageContent,
} from '../../../common/domain/interfaces/ai-service.interface';
import AuthService from '../../auth/service';

const API_URL = process.env.BACKEND_API_URL || 'https://api.deckium.xyz';

export class BackendAIService implements IAIService {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async chat(messages: Message[], deploymentName?: string): Promise<string> {
    const overallStartTime = performance.now();

    try {
      const formatStartTime = performance.now();
      const formatEndTime = performance.now();

      const originalSize = JSON.stringify(messages).length;

      const accessToken = await this.getAuthToken();

      const apiCallStartTime = performance.now();
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          messages,
          model: deploymentName,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error from backend: ${error}`);
      }

      const apiCallEndTime = performance.now();
      const apiCallDuration = apiCallEndTime - apiCallStartTime;

      const processingStartTime = performance.now();
      const data = await response.json();
      const aiResponse = data.content;
      const processingEndTime = performance.now();

      const overallEndTime = performance.now();

      return aiResponse;
    } catch (error) {
      const overallEndTime = performance.now();
      console.error(
        `[AzureOpenAI] Error sending message to backend (after ${overallEndTime - overallStartTime}ms):`,
        error,
      );
      throw error;
    }
  }

  async chatStream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    deploymentName?: string,
  ): Promise<string> {
    const overallStartTime = performance.now();

    try {
      const formatStartTime = performance.now();
      const formatEndTime = performance.now();

      const accessToken = await this.getAuthToken();

      const apiCallStartTime = performance.now();

      console.log('accessToken', accessToken);

      try {
        const response = await fetch(`${API_URL}/ai/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=Bearer ${accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            messages,
            model: deploymentName,
            stream: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Error from backend: ${error}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let completeResponse = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          onChunk(chunk);
          completeResponse += chunk;
        }

        const apiCallEndTime = performance.now();
        const apiCallDuration = apiCallEndTime - apiCallStartTime;

        const overallEndTime = performance.now();

        return completeResponse;
      } catch (streamError) {
        console.error('[AzureOpenAI] Error during streaming:', streamError);
        throw streamError;
      }
    } catch (error) {
      const overallEndTime = performance.now();
      console.error(
        `[AzureOpenAI] Error in streaming chat (after ${overallEndTime - overallStartTime}ms):`,
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

export class BackendAIServiceFactory implements IAIServiceFactory {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  createService(): IAIService {
    const initStartTime = performance.now();

    try {
      console.log('[BackendAIService] Using backend service at', API_URL);

      const initEndTime = performance.now();

      return new BackendAIService(this.authService);
    } catch (error) {
      const initEndTime = performance.now();
      console.error(
        `[AzureOpenAI] Failed to initialize client (after ${initEndTime - initStartTime}ms):`,
        error,
      );
      throw error;
    }
  }
}
