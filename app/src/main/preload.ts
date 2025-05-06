import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type PresentationChannels =
  | 'presentation:initialize'
  | 'presentation:get'
  | 'presentation:update-meta'
  | 'presentation:add-slide'
  | 'presentation:update-slide'
  | 'presentation:delete-slide'
  | 'presentation:add-element'
  | 'presentation:update-element'
  | 'presentation:slide-added'
  | 'presentation:slide-updated'
  | 'presentation:slide-deleted'
  | 'presentation:meta-updated'
  | 'presentation:initialized'
  | 'presentation:set-selected-slide';

export type AIChannels =
  | 'ai:create-thread'
  | 'ai:get-thread'
  | 'ai:save-thread'
  | 'ai:get-threads-for-presentation'
  | 'ai:delete-thread'
  | 'ai:send-message'
  | 'ai:thread-created'
  | 'ai:thread-updated'
  | 'ai:thread-deleted'
  | 'ai:message-received'
  | 'ai:processing-started'
  | 'ai:processing-completed'
  | 'ai:processing-error';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: string, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: string, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: string, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  
  ai: {
    createThread(title: string, presentationId: string) {
      return ipcRenderer.invoke('ai:create-thread', title, presentationId);
    },
    getThread(threadId: string) {
      return ipcRenderer.invoke('ai:get-thread', threadId);
    },
    saveThread(thread: unknown) {
      return ipcRenderer.invoke('ai:save-thread', thread);
    },
    getThreadsForPresentation(presentationId: string) {
      return ipcRenderer.invoke('ai:get-threads-for-presentation', presentationId);
    },
    deleteThread(threadId: string) {
      return ipcRenderer.invoke('ai:delete-thread', threadId);
    },
    sendMessage(request: unknown) {
      return ipcRenderer.invoke('ai:send-message', request);
    }
  },
  
  presentation: {
    initializePresentation(title: string) {
      return ipcRenderer.invoke('presentation:initialize', title);
    },
    getPresentation() {
      return ipcRenderer.invoke('presentation:get');
    },
    updateMeta(title: string) {
      return ipcRenderer.invoke('presentation:update-meta', title);
    },
    addSlide(title?: string) {
      return ipcRenderer.invoke('presentation:add-slide', title);
    },
    updateSlide(slideId: string, updates: unknown) {
      return ipcRenderer.invoke('presentation:update-slide', slideId, updates);
    },
    deleteSlide(slideId: string) {
      return ipcRenderer.invoke('presentation:delete-slide', slideId);
    },
    addElement(slideId: string, element: unknown) {
      return ipcRenderer.invoke('presentation:add-element', slideId, element);
    },
    updateElement(elementId: string, updates: unknown) {
      return ipcRenderer.invoke('presentation:update-element', elementId, updates);
    }
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);
