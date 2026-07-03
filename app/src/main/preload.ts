import { contextBridge, IpcRendererEvent, ipcRenderer } from 'electron';

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
    | 'presentation:transaction-start'
    | 'presentation:transaction-end'
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
    | 'presentation:slide-rendered'
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

export type LintingChannels =
    | 'linting:lint-slide'
    | 'linting:get-errors'
    | 'linting:clear-errors'
    | 'linting:has-errors'
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

export type PowerPointExportChannels =
    | 'powerpoint-export:progress'
    | 'powerpoint-export:complete'
    | 'powerpoint-export:error';

export type MenuChannels =
    | 'menu:undo'
    | 'menu:redo'
    | 'menu:copy'
    | 'menu:select-all'
    | 'menu:open-llm-settings';

export type LLMSettingsChannels =
    | 'llm-settings:get-settings'
    | 'llm-settings:get-current-provider'
    | 'llm-settings:get-provider-settings'
    | 'llm-settings:update-provider'
    | 'llm-settings:set-current-provider'
    | 'llm-settings:validate-current-provider'
    | 'llm-settings:clear';

type IpcChannels =
    | PresentationChannels
    | AIChannels
    | LintingChannels
    | PDFExportChannels
    | PowerPointImportChannels
    | PowerPointExportChannels
    | MenuChannels
    | LLMSettingsChannels;

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
        updateElement(elementId: string, updates: unknown) {
            return ipcRenderer.invoke(
                'presentation:update-element',
                elementId,
                updates,
            );
        },
        deleteElement(elementId: string) {
            return ipcRenderer.invoke('presentation:delete-element', elementId);
        },
        beginTransaction() {
            return ipcRenderer.invoke('presentation:transaction-start');
        },
        endTransaction() {
            return ipcRenderer.invoke('presentation:transaction-end');
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

    llmSettings: {
        getSettings() {
            return ipcRenderer.invoke('llm-settings:get-settings');
        },
        getCurrentProvider() {
            return ipcRenderer.invoke('llm-settings:get-current-provider');
        },
        getProviderSettings(provider: string) {
            return ipcRenderer.invoke(
                'llm-settings:get-provider-settings',
                provider,
            );
        },
        updateProvider(provider: string, config: unknown) {
            return ipcRenderer.invoke(
                'llm-settings:update-provider',
                provider,
                config,
            );
        },
        setCurrentProvider(config: unknown) {
            return ipcRenderer.invoke(
                'llm-settings:set-current-provider',
                config,
            );
        },
        validateCurrentProvider() {
            return ipcRenderer.invoke('llm-settings:validate-current-provider');
        },
        clear() {
            return ipcRenderer.invoke('llm-settings:clear');
        },
    },

    isStandaloneMode: true,
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
