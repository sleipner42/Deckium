import { contextBridge, IpcRendererEvent, ipcRenderer } from 'electron';
import { AuthChannels } from '../common/domain/interfaces/auth.interface';

export type PresentationChannels =
    | 'presentation:initialize'
    | 'presentation:get'
    | 'presentation:update-meta'
    | 'presentation:add-slide'
    | 'presentation:update-slide'
    | 'presentation:delete-slide'
    | 'presentation:duplicate-slide'
    | 'presentation:reorder-slides'
    | 'presentation:add-element'
    | 'presentation:update-element'
    | 'presentation:delete-element'
    | 'presentation:undo'
    | 'presentation:redo'
    | 'presentation:can-undo'
    | 'presentation:can-redo'
    | 'presentation:undo-executed'
    | 'presentation:redo-executed'
    | 'presentation:history-changed'
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
    | 'presentation:fullscreen-closed'
    | 'presentation:export-powerpoint';

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

export type LintingChannels =
    | 'linting:lint-slide'
    | 'linting:get-errors'
    | 'linting:clear-errors'
    | 'linting:has-errors'
    | 'linting:get-errors-by-severity'
    | 'linting:errors-updated'
    | 'linting:slide-linted'
    | 'linting:errors-cleared';

export type PDFExportChannels =
    | 'pdf-export:export-to-pdf'
    | 'pdf-export:progress'
    | 'pdf-export:complete'
    | 'pdf-export:error';

export type PowerPointImportChannels =
    | 'powerpoint-import:select-and-import'
    | 'powerpoint-import:import-file'
    | 'powerpoint-import:progress';

export type TaskManagerChannels =
    | 'task-manager:available'
    | 'task-manager:create'
    | 'task-manager:execute'
    | 'task-manager:cancel'
    | 'task-manager:get'
    | 'task-manager:query'
    | 'task-manager:update-progress'
    | 'task-manager:create-workflow'
    | 'task-manager:event';

type IpcChannels =
    | PresentationChannels
    | AIChannels
    | CriticChannels
    | LintingChannels
    | AuthChannels
    | PDFExportChannels
    | PowerPointImportChannels
    | TaskManagerChannels;

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
        duplicateSlide(slideId: string) {
            return ipcRenderer.invoke('presentation:duplicate-slide', slideId);
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
        updateElement(
            elementId: string,
            updates: unknown,
            skipHistory?: boolean,
        ) {
            return ipcRenderer.invoke(
                'presentation:update-element',
                elementId,
                updates,
                skipHistory,
            );
        },
        deleteElement(elementId: string) {
            return ipcRenderer.invoke('presentation:delete-element', elementId);
        },
        undo() {
            return ipcRenderer.invoke('presentation:undo');
        },
        redo() {
            return ipcRenderer.invoke('presentation:redo');
        },
        canUndo() {
            return ipcRenderer.invoke('presentation:can-undo');
        },
        canRedo() {
            return ipcRenderer.invoke('presentation:can-redo');
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
        setSelectedSlide(slideId: string | null) {
            return ipcRenderer.invoke(
                'presentation:set-selected-slide',
                slideId,
            );
        },
        getSelectedSlide() {
            return ipcRenderer.invoke('presentation:get-selected-slide');
        },
        exportToPowerPoint() {
            return ipcRenderer.invoke('presentation:export-powerpoint');
        },
    },

    linting: {
        lintSlide(slide: unknown) {
            return ipcRenderer.invoke('linting:lint-slide', slide);
        },
        getLintingErrors(slideId?: string) {
            return ipcRenderer.invoke('linting:get-errors', slideId);
        },
        clearErrors(slideId?: string) {
            return ipcRenderer.invoke('linting:clear-errors', slideId);
        },
        hasErrors(slideId?: string) {
            return ipcRenderer.invoke('linting:has-errors', slideId);
        },
        getErrorsBySeverity(severity: string) {
            return ipcRenderer.invoke(
                'linting:get-errors-by-severity',
                severity,
            );
        },
    },

    pdfExport: {
        exportToPDF() {
            return ipcRenderer.invoke('pdf-export:export-to-pdf');
        },
    },

    powerpointImport: {
        selectAndImport() {
            return ipcRenderer.invoke('powerpoint-import:select-and-import');
        },
        importFile(filePath: string) {
            return ipcRenderer.invoke(
                'powerpoint-import:import-file',
                filePath,
            );
        },
    },

    fs: {
        readFile(filePath: string) {
            return ipcRenderer.invoke('fs:read-file', filePath);
        },
    },

    taskManager: {
        available() {
            return ipcRenderer.invoke('task-manager:available');
        },
        create(data: unknown) {
            return ipcRenderer.invoke('task-manager:create', data);
        },
        execute(taskId: string) {
            return ipcRenderer.invoke('task-manager:execute', taskId);
        },
        cancel(taskId: string) {
            return ipcRenderer.invoke('task-manager:cancel', taskId);
        },
        get(taskId: string) {
            return ipcRenderer.invoke('task-manager:get', taskId);
        },
        query(query: unknown) {
            return ipcRenderer.invoke('task-manager:query', query);
        },
        updateProgress(data: unknown) {
            return ipcRenderer.invoke('task-manager:update-progress', data);
        },
        createWorkflow(data: unknown) {
            return ipcRenderer.invoke('task-manager:create-workflow', data);
        },
    },
};

contextBridge.exposeInMainWorld('electron', electronHandler);
