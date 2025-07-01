import { contextBridge, IpcRendererEvent, ipcRenderer } from 'electron';
import { AuthChannels } from '../common/domain/interfaces/auth.interface';

export type PresentationChannels =
    | 'presentation:initialize'
    | 'presentation:get'
    | 'presentation:update-meta'
    | 'presentation:add-slide'
    | 'presentation:update-slide'
    | 'presentation:delete-slide'
    | 'presentation:reorder-slides'
    | 'presentation:add-element'
    | 'presentation:update-element'
    | 'presentation:save'
    | 'presentation:save-as'
    | 'presentation:load'
    | 'presentation:slide-added'
    | 'presentation:slide-updated'
    | 'presentation:slide-deleted'
    | 'presentation:slides-reordered'
    | 'presentation:meta-updated'
    | 'presentation:initialized'
    | 'presentation:set-selected-slide'
    | 'presentation:saved'
    | 'presentation:loaded'
    | 'presentation:get-file-path'
    | 'presentation:open-fullscreen'
    | 'presentation:close-fullscreen'
    | 'presentation:is-fullscreen-open'
    | 'presentation:set-selected-slide'
    | 'presentation:get-selected-slide'
    | 'presentation:fullscreen-opened'
    | 'presentation:fullscreen-closed';

export type AIChannels =
    | 'ai:create-thread'
    | 'ai:get-thread'
    | 'ai:save-thread'
    | 'ai:get-threads-for-presentation'
    | 'ai:delete-thread'
    | 'ai:send-message'
    | 'ai:abort-request'
    | 'ai:thread-created'
    | 'ai:thread-updated'
    | 'ai:thread-deleted'
    | 'ai:message-received'
    | 'ai:processing-started'
    | 'ai:processing-completed'
    | 'ai:processing-error'
    | 'ai:message-chunk-received';

export type CriticChannels =
    | 'critic:create-thread'
    | 'critic:get-thread'
    | 'critic:save-thread'
    | 'critic:get-threads-for-presentation'
    | 'critic:delete-thread'
    | 'critic:review-slide'
    | 'critic:thread-created'
    | 'critic:thread-updated'
    | 'critic:thread-deleted'
    | 'critic:message-received'
    | 'critic:processing-started'
    | 'critic:processing-completed'
    | 'critic:processing-error'
    | 'critic:message-chunk-received';

type IpcChannels =
    | PresentationChannels
    | AIChannels
    | CriticChannels
    | AuthChannels;

const electronHandler = {
    ipcRenderer: {
        sendMessage(channel: string, ...args: unknown[]) {
            ipcRenderer.send(channel, ...args);
        },
        on(channel: IpcChannels, func: (...args: unknown[]) => void) {
            const subscription = (
                _event: IpcRendererEvent,
                ...args: unknown[]
            ) => func(...args);
            ipcRenderer.on(channel, subscription);

            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        },
        once(channel: IpcChannels, func: (...args: unknown[]) => void) {
            ipcRenderer.once(channel, (_event, ...args) => func(...args));
        },
    },

    auth: {
        login() {
            return ipcRenderer.invoke('auth:login');
        },
        logout() {
            return ipcRenderer.invoke('auth:logout');
        },
        getUser() {
            return ipcRenderer.invoke('auth:get-user');
        },
        refreshTokens() {
            return ipcRenderer.invoke('auth:refresh-tokens');
        },
        getBalance() {
            return ipcRenderer.invoke('auth:get-balance');
        },
    },

    ai: {
        createThread(title: string, presentationId: string) {
            return ipcRenderer.invoke(
                'ai:create-thread',
                title,
                presentationId,
            );
        },
        getThread(threadId: string) {
            return ipcRenderer.invoke('ai:get-thread', threadId);
        },
        saveThread(thread: unknown) {
            return ipcRenderer.invoke('ai:save-thread', thread);
        },
        getThreadsForPresentation(presentationId: string) {
            return ipcRenderer.invoke(
                'ai:get-threads-for-presentation',
                presentationId,
            );
        },
        deleteThread(threadId: string) {
            return ipcRenderer.invoke('ai:delete-thread', threadId);
        },
        sendMessage(request: unknown) {
            return ipcRenderer.invoke('ai:send-message', request);
        },
        abortRequest(threadId: string) {
            return ipcRenderer.invoke('ai:abort-request', threadId);
        },
    },

    critic: {
        createThread(title: string, presentationId: string) {
            return ipcRenderer.invoke(
                'critic:create-thread',
                title,
                presentationId,
            );
        },
        getThread(threadId: string) {
            return ipcRenderer.invoke('critic:get-thread', threadId);
        },
        saveThread(thread: unknown) {
            return ipcRenderer.invoke('critic:save-thread', thread);
        },
        getThreadsForPresentation(presentationId: string) {
            return ipcRenderer.invoke(
                'critic:get-threads-for-presentation',
                presentationId,
            );
        },
        deleteThread(threadId: string) {
            return ipcRenderer.invoke('critic:delete-thread', threadId);
        },
        reviewSlide(threadId: string, slideId: string) {
            return ipcRenderer.invoke('critic:review-slide', threadId, slideId);
        },
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
            return ipcRenderer.invoke(
                'presentation:update-slide',
                slideId,
                updates,
            );
        },
        deleteSlide(slideId: string) {
            return ipcRenderer.invoke('presentation:delete-slide', slideId);
        },
        reorderSlides(fromIndex: number, toIndex: number) {
            return ipcRenderer.invoke(
                'presentation:reorder-slides',
                fromIndex,
                toIndex,
            );
        },
        addElement(slideId: string, element: unknown) {
            return ipcRenderer.invoke(
                'presentation:add-element',
                slideId,
                element,
            );
        },
        updateElement(elementId: string, updates: unknown) {
            return ipcRenderer.invoke(
                'presentation:update-element',
                elementId,
                updates,
            );
        },
        savePresentation() {
            return ipcRenderer.invoke('presentation:save');
        },
        savePresentationAs() {
            return ipcRenderer.invoke('presentation:save-as');
        },
        loadPresentation(filePath?: string) {
            return ipcRenderer.invoke('presentation:load', filePath);
        },
        getCurrentFilePath() {
            return ipcRenderer.invoke('presentation:get-file-path');
        },
        openFullscreen() {
            return ipcRenderer.invoke('presentation:open-fullscreen');
        },
        closeFullscreen() {
            return ipcRenderer.invoke('presentation:close-fullscreen');
        },
        isFullscreenOpen() {
            return ipcRenderer.invoke('presentation:is-fullscreen-open');
        },
        setSelectedSlide(slideId: string) {
            return ipcRenderer.invoke(
                'presentation:set-selected-slide',
                slideId,
            );
        },
        getSelectedSlide() {
            return ipcRenderer.invoke('presentation:get-selected-slide');
        },
    },
};

contextBridge.exposeInMainWorld('electron', electronHandler);
