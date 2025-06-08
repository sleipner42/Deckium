import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { Thread } from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';

export class AIEventBus extends EventEmitter {
  static events = {
    MESSAGE_CHUNK_RECEIVED: 'ai:message-chunk-received',
    THREAD_CREATED: 'ai:thread-created',
    THREAD_UPDATED: 'ai:thread-updated',
    THREAD_DELETED: 'ai:thread-deleted',
    PROCESSING_STARTED: 'ai:processing-started',
    PROCESSING_COMPLETED: 'ai:processing-completed',
    PROCESSING_ERROR: 'ai:processing-error',
  };

  broadcastToWindows(eventName: string, data: any): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(eventName, data);
    });
    this.emit(eventName, data);
  }

  broadcastMessageChunkReceived(
    threadId: UUID,
    messageId: UUID,
    chunk: string,
    fullContent: string,
  ): void {
    const data = {
      threadId,
      messageId,
      chunk,
      fullContent,
    };
    this.broadcastToWindows(AIEventBus.events.MESSAGE_CHUNK_RECEIVED, data);
  }

  broadcastThreadCreated(thread: Thread): void {
    this.broadcastToWindows(AIEventBus.events.THREAD_CREATED, thread);
  }

  broadcastThreadUpdated(thread: Thread): void {
    this.broadcastToWindows(AIEventBus.events.THREAD_UPDATED, thread);
  }

  broadcastThreadDeleted(threadId: UUID): void {
    this.broadcastToWindows(AIEventBus.events.THREAD_DELETED, threadId);
  }

  broadcastProcessingStarted(threadId: UUID): void {
    this.broadcastToWindows(AIEventBus.events.PROCESSING_STARTED, threadId);
  }

  broadcastProcessingCompleted(threadId: UUID): void {
    this.broadcastToWindows(AIEventBus.events.PROCESSING_COMPLETED, threadId);
  }

  broadcastProcessingError(threadId: UUID, error: string): void {
    this.broadcastToWindows(AIEventBus.events.PROCESSING_ERROR, {
      threadId,
      error,
    });
  }
}
