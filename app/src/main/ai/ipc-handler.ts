import { ipcMain } from 'electron';
import {
  AIRequest,
  AIResponse,
  Thread,
} from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import { AIService } from './service';

export function setupAIIPC(service: AIService) {
  ipcMain.handle(
    'ai:create-thread',
    (_, title: string, presentationId: UUID): Thread => {
      return service.createThread(title, presentationId);
    },
  );

  ipcMain.handle('ai:get-thread', (_, threadId: UUID): Thread | null => {
    return service.getThread(threadId);
  });

  ipcMain.handle('ai:save-thread', (_, thread: Thread): Thread => {
    return service.saveThread(thread);
  });

  ipcMain.handle(
    'ai:get-threads-for-presentation',
    (_, presentationId: UUID): Thread[] => {
      return service.getThreadsForPresentation(presentationId);
    },
  );

  ipcMain.handle('ai:delete-thread', (_, threadId: UUID): boolean => {
    return service.deleteThread(threadId);
  });

  ipcMain.handle(
    'ai:send-message',
    (_, request: AIRequest): Promise<AIResponse> => {
      return service.sendMessage(request);
    },
  );

  ipcMain.handle('ai:abort-request', (_, threadId: UUID): boolean => {
    return service.abortRequest(threadId);
  });
}
