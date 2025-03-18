import { v4 as uuidv4 } from 'uuid';
import { Thread, Message } from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import { MessageContent } from '../../common/domain/interfaces/ai-service.interface';

export class AIState {
  private threads: Map<UUID, Thread> = new Map<UUID, Thread>();

  getThread(threadId: UUID): Thread | null {
    return this.threads.get(threadId) || null;
  }

  saveThread(thread: Thread): Thread {
    this.threads.set(thread.id, thread);
    return thread;
  }

  getThreadsForPresentation(presentationId: UUID): Thread[] {
    return Array.from(this.threads.values()).filter(
      (thread) => thread.presentationId === presentationId
    );
  }

  deleteThread(threadId: UUID): boolean {
    return this.threads.delete(threadId);
  }

  createThread(title: string, presentationId: UUID, developerPrompt: string): Thread {
    const newThread: Thread = {
      id: uuidv4(),
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      presentationId,
    };


    const threadWithPrompt = this.addMessage(
      newThread,
      developerPrompt,
      'system'
    );

    const threadWithWelcome = this.addMessage(
      threadWithPrompt,
      'Welcome to KeynoteAI Assistant. I can help you create and manage your presentation. Ask me to create slides, suggest content, or help with design.',
      'assistant'
    );

    this.threads.set(threadWithWelcome.id, threadWithWelcome);
    return threadWithWelcome;
  }

  addMessage(
    thread: Thread,
    content: string | MessageContent[],
    role: 'user' | 'assistant' | 'system'
  ): Thread {
    const threadToUpdate = this.threads.get(thread.id) || thread;

    const newMessage: Message = {
      id: uuidv4(),
      content,
      role,
      timestamp: new Date(),
      threadId: thread.id,
    };

    const updatedThread = {
      ...threadToUpdate,
      messages: [...threadToUpdate.messages, newMessage],
      updatedAt: new Date(),
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  updateSystemMessage(thread: Thread, newContent: string): Thread {
    const updatedThread = {...thread};
    
    const firstSystemMessageIndex = updatedThread.messages.findIndex(
      (m) => m.role === 'system'
    );

    if (firstSystemMessageIndex >= 0) {
      const updatedMessages = [...updatedThread.messages];
      updatedMessages[firstSystemMessageIndex] = {
        ...updatedMessages[firstSystemMessageIndex],
        content: newContent,
      };

      updatedThread.messages = updatedMessages;
    } else {
      const systemMessage: Message = {
        id: uuidv4(),
        content: newContent,
        role: 'system',
        timestamp: new Date(),
        threadId: thread.id,
      };

      updatedThread.messages = [systemMessage, ...updatedThread.messages];
    }
    
    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }
} 