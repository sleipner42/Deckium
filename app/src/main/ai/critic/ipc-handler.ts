import { ipcMain } from 'electron';
import { Thread } from '../../../common/domain/entities/ai-types';
import { UUID } from '../../../common/domain/entities/types';
import { CriticService } from './service';

export function setupCriticIPC(service: CriticService) {
    ipcMain.handle(
        'critic:create-thread',
        (_, title: string, presentationId: UUID): Thread => {
            return service.createThread(title, presentationId);
        },
    );

    ipcMain.handle('critic:get-thread', (_, threadId: UUID): Thread | null => {
        return service.getThread(threadId);
    });

    ipcMain.handle('critic:save-thread', (_, thread: Thread): Thread => {
        return service.saveThread(thread);
    });

    ipcMain.handle(
        'critic:get-threads-for-presentation',
        (_, presentationId: UUID): Thread[] => {
            return service.getThreadsForPresentation(presentationId);
        },
    );

    ipcMain.handle('critic:delete-thread', (_, threadId: UUID): boolean => {
        return service.deleteThread(threadId);
    });

    ipcMain.handle(
        'critic:review-slide',
        (_, threadId: UUID, slideId: UUID): Promise<string> => {
            return service.reviewSlide(threadId, slideId);
        },
    );
}
