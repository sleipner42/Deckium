import { v4 as uuidv4 } from 'uuid';
import { Thread, Message } from '../../common/domain/entities/ai-types';
import { UUID } from '../../common/domain/entities/types';
import { MessageContent } from '../../common/domain/interfaces/ai-service.interface';
import { logger } from '../utils/logger';

export class AIState {
  private threads: Map<UUID, Thread> = new Map<UUID, Thread>();

  getThreadIds(): Set<UUID> {
    return new Set(this.threads.keys());
  }

  getThread(threadId: UUID): Thread | null {
    return this.threads.get(threadId) || null;
  }

  saveThread(thread: Thread): Thread {
    // Create a deep copy to avoid reference issues
    const threadCopy = JSON.parse(JSON.stringify(thread)) as Thread;

    // Restore Date objects since JSON.parse converts them to strings
    threadCopy.createdAt = new Date(threadCopy.createdAt);
    threadCopy.updatedAt = new Date(threadCopy.updatedAt);
    threadCopy.messages.forEach((msg) => {
      msg.timestamp = new Date(msg.timestamp);
    });

    // Store the thread copy
    this.threads.set(thread.id, threadCopy);

    // Return the copy, not the original
    return threadCopy;
  }

  getThreadsForPresentation(presentationId: UUID): Thread[] {
    return Array.from(this.threads.values()).filter(
      (thread) => thread.presentationId === presentationId,
    );
  }

  deleteThread(threadId: UUID): boolean {
    return this.threads.delete(threadId);
  }

  createThread(
    title: string,
    presentationId: UUID,
    developerPrompt: string,
  ): Thread {
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
      'system',
    );

    const threadWithWelcome = this.addMessage(
      threadWithPrompt,
      'Welcome to KeynoteAI Assistant. I can help you create and manage your presentation. Ask me to create slides, suggest content, or help with design.',
      'assistant',
    );

    this.threads.set(threadWithWelcome.id, threadWithWelcome);
    return threadWithWelcome;
  }

  addMessage(
    thread: Thread,
    content: string | MessageContent[],
    role: 'user' | 'assistant' | 'system',
  ): Thread {
    const threadToUpdate = this.threads.get(thread.id) || thread;

    const newMessage: Message = {
      id: uuidv4(),
      content,
      role,
      timestamp: new Date(),
      threadId: thread.id,
    };

    // Log the message being added to the conversation
    logger.logConversation(`Message added to thread [${role}]`, {
      threadId: thread.id,
      messageId: newMessage.id,
      role,
      content,
      contentType: typeof content,
      messageCount: threadToUpdate.messages.length + 1
    });

    const updatedThread = {
      ...threadToUpdate,
      messages: [...threadToUpdate.messages, newMessage],
      updatedAt: new Date(),
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  addMessageWithState(
    thread: Thread,
    content: string | MessageContent[],
    role: 'user' | 'assistant' | 'system',
    messageId: string = uuidv4(),
    streamingState: 'streaming' | 'completed' = 'completed',
  ): Thread {
    const threadToUpdate = this.threads.get(thread.id) || thread;

    const newMessage: Message = {
      id: messageId,
      content,
      role,
      timestamp: new Date(),
      threadId: thread.id,
      streamingState,
    };

    // Log the message being added with streaming state
    logger.logConversation(`Message added to thread [${role}] with state [${streamingState}]`, {
      threadId: thread.id,
      messageId,
      role,
      content,
      streamingState,
      contentType: typeof content,
      messageCount: threadToUpdate.messages.length + 1
    });

    const updatedThread = {
      ...threadToUpdate,
      messages: [...threadToUpdate.messages, newMessage],
      updatedAt: new Date(),
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  updateMessageContent(
    thread: Thread,
    messageId: string,
    content: string | MessageContent[],
  ): Thread {
    const threadToUpdate = this.threads.get(thread.id) || thread;

    const messageIndex = threadToUpdate.messages.findIndex(
      (message) => message.id === messageId,
    );

    if (messageIndex === -1) {
      return threadToUpdate;
    }

    const updatedMessages = [...threadToUpdate.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content,
    };

    const updatedThread = {
      ...threadToUpdate,
      messages: updatedMessages,
      updatedAt: new Date(),
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  setMessageStreamingState(
    thread: Thread,
    messageId: string,
    streamingState: 'streaming' | 'completed',
  ): Thread {
    const threadToUpdate = this.threads.get(thread.id) || thread;

    const messageIndex = threadToUpdate.messages.findIndex(
      (message) => message.id === messageId,
    );

    if (messageIndex === -1) {
      return threadToUpdate;
    }

    const updatedMessages = [...threadToUpdate.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      streamingState,
    };

    const updatedThread = {
      ...threadToUpdate,
      messages: updatedMessages,
      updatedAt: new Date(),
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  updateSystemMessage(thread: Thread, newContent: string): Thread {
    const updatedThread = { ...thread };

    const firstSystemMessageIndex = updatedThread.messages.findIndex(
      (m) => m.role === 'system',
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
