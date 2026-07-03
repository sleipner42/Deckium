import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ContentElement,
    Presentation,
    Slide,
} from '../../../common/domain/entities/types';

interface ElectronWindow {
    electron: {
        ipcRenderer: {
            sendMessage: (channel: string, ...args: unknown[]) => void;
            on: (
                channel: string,
                func: (...args: unknown[]) => void,
            ) => () => void;
            once: (channel: string, func: (...args: unknown[]) => void) => void;
        };
        azureOpenAI: {
            sendMessage: (request: unknown) => Promise<unknown>;
            getThread: (threadId: string) => Promise<unknown>;
            saveThread: (thread: unknown) => Promise<unknown>;
            getThreadsForPresentation: (
                presentationId: string,
            ) => Promise<unknown>;
            deleteThread: (threadId: string) => Promise<unknown>;
        };
        presentation: {
            initializePresentation: (title: string) => Promise<Presentation>;
            getPresentation: () => Promise<Presentation>;
            updateMeta: (
                title: string,
            ) => Promise<{ title: string; updatedAt: Date }>;
            addSlide: (title?: string) => Promise<Slide>;
            updateSlide: (
                slideId: string,
                updates: Partial<Slide>,
            ) => Promise<Slide>;
            deleteSlide: (slideId: string) => Promise<string>;
            duplicateSlide: (slideId: string) => Promise<Slide>;
            reorderSlides: (
                fromIndex: number,
                toIndex: number,
            ) => Promise<Presentation>;
            addElement: (
                slideId: string,
                element: ContentElement,
            ) => Promise<Slide>;
            updateElement: (
                elementId: string,
                updates: Partial<ContentElement>,
            ) => Promise<Slide>;
            deleteElement: (elementId: string) => Promise<Slide>;
            beginTransaction: () => Promise<void>;
            endTransaction: () => Promise<void>;
            undo: () => Promise<Presentation | null>;
            redo: () => Promise<Presentation | null>;
            canUndo: () => Promise<boolean>;
            canRedo: () => Promise<boolean>;
            savePresentation: () => Promise<string | null>;
            savePresentationAs: () => Promise<string | null>;
            loadPresentation: (
                filePath?: string,
            ) => Promise<Presentation | null>;
            getCurrentFilePath: () => Promise<string | null>;
            openFullscreen: () => Promise<void>;
            closeFullscreen: () => Promise<void>;
            isFullscreenOpen: () => Promise<boolean>;
            setSelectedSlide: (slideId: string | null) => Promise<void>;
            getSelectedSlide: () => Promise<string | null>;
        };
    };
}

const electronAPI = (window as unknown as ElectronWindow).electron;

export const useMainProcessPresentation = () => {
    const [title, setTitle] = useState<string>('Untitled Presentation');
    const [createdAt, setCreatedAt] = useState<Date>(new Date());
    const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
    const [slides, setSlides] = useState<Slide[]>([]);
    const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(
        null,
    );
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [editingElementId, setEditingElementId] = useState<string | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [canRedo, setCanRedo] = useState<boolean>(false);

    useEffect(() => {
        if (!isInitialized) {
            setIsLoading(true);
            electronAPI.presentation
                .getPresentation()
                .then((loadedPresentation) => {
                    setTitle(loadedPresentation.title);
                    setCreatedAt(new Date(loadedPresentation.createdAt));
                    setUpdatedAt(new Date(loadedPresentation.updatedAt));

                    if (
                        loadedPresentation.slides &&
                        loadedPresentation.slides.length > 0
                    ) {
                        setSlides(loadedPresentation.slides);
                        setSelectedSlide(loadedPresentation.slides[0]);
                    }
                    setIsInitialized(true);
                })
                .catch((_err) => {
                    setIsInitialized(true);
                })
                .finally(() => {
                    setIsLoading(false);
                });

            // Initial undo/redo capabilities; afterwards the main process
            // pushes updates via presentation:history-changed.
            electronAPI.presentation.canUndo().then(setCanUndo);
            electronAPI.presentation.canRedo().then(setCanRedo);
        }
    }, [isInitialized]);

    useEffect(() => {
        if (slides.length > 0 && !selectedSlide) {
            const firstSlide = slides[0];
            setSelectedSlide(firstSlide);
            // Notify main process about the initially selected slide
            electronAPI.presentation.setSelectedSlide(firstSlide.id);
        } else if (slides.length === 0) {
            setSelectedSlide(null);
            // Notify main process that no slide is selected
            electronAPI.presentation.setSelectedSlide(null);
        } else if (selectedSlide) {
            const slideExists = slides.some(
                (slide) => slide.id === selectedSlide.id,
            );
            if (!slideExists) {
                const fallbackSlide = slides.length > 0 ? slides[0] : null;
                setSelectedSlide(fallbackSlide);
                // Notify main process about the fallback slide selection
                if (fallbackSlide) {
                    electronAPI.presentation.setSelectedSlide(fallbackSlide.id);
                } else {
                    electronAPI.presentation.setSelectedSlide(null);
                }
            }
        }
    }, [slides, selectedSlide]);

    useEffect(() => {
        const metaUpdatedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:meta-updated',
            (...args: unknown[]) => {
                const metaUpdate = args[0] as {
                    title: string;
                    updatedAt: Date;
                };
                setTitle(metaUpdate.title);
                setUpdatedAt(new Date(metaUpdate.updatedAt));
            },
        );

        const slideAddedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:slide-added',
            async (...args: unknown[]) => {
                const newSlide = args[0] as Slide;
                // Refresh the entire presentation to get the correct slide ordering
                const updatedPresentation =
                    (await electronAPI.presentation.getPresentation()) as Presentation;
                setSlides(updatedPresentation.slides);
                setSelectedSlide(newSlide);
            },
        );

        const setSlideUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:set-selected-slide',
            (...args: unknown[]) => {
                const slideId = args[0] as string;
                setSelectedSlide(slides.find((s) => s.id === slideId) || null);
                // Ack back to the main process once the slide has actually
                // painted (double rAF = after the next committed frame, plus
                // a small delay for async chart mounts). The main process
                // uses this to know when a screenshot/PDF capture is safe.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            electronAPI.ipcRenderer.sendMessage(
                                'presentation:slide-rendered',
                                slideId,
                            );
                        }, 100);
                    });
                });
            },
        );

        const slideUpdatedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:slide-updated',
            (...args: unknown[]) => {
                const updatedSlide = args[0] as Slide;
                setSlides((prev) => {
                    const index = prev.findIndex(
                        (s) => s.id === updatedSlide.id,
                    );
                    if (index === -1) return prev;

                    const newSlides = [...prev];
                    newSlides[index] = updatedSlide;
                    return newSlides;
                });
                if (selectedSlide?.id === updatedSlide.id) {
                    setSelectedSlide(updatedSlide);
                }
            },
        );

        const slideDeletedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:slide-deleted',
            (...args: unknown[]) => {
                try {
                    const deletedSlideId = args[0] as string;
                    if (!deletedSlideId) return;

                    setSlides((prev) => {
                        const updatedSlides = prev.filter(
                            (slide) => slide.id !== deletedSlideId,
                        );

                        setTimeout(() => {
                            if (selectedSlide?.id === deletedSlideId) {
                                if (updatedSlides.length > 0) {
                                    setSelectedSlide(updatedSlides[0]);
                                } else {
                                    setSelectedSlide(null);
                                }
                            }
                        }, 0);

                        return updatedSlides;
                    });
                } catch (error) {
                    console.error('Error handling slide deletion:', error);
                }
            },
        );

        const initUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:initialized',
            (...args: unknown[]) => {
                const presentation = args[0] as Presentation;
                setTitle(presentation.title);
                setCreatedAt(new Date(presentation.createdAt));
                setUpdatedAt(new Date(presentation.updatedAt));

                if (presentation.slides && presentation.slides.length > 0) {
                    setSlides(presentation.slides);
                    setSelectedSlide(presentation.slides[0]);
                }
                setCurrentFilePath(null);
            },
        );

        const presentationSavedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:saved',
            (...args: unknown[]) => {
                const data = args[0] as { path: string; title: string };
                setCurrentFilePath(data.path);
            },
        );

        const presentationLoadedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:loaded',
            (...args: unknown[]) => {
                const presentation = args[0] as Presentation;
                setTitle(presentation.title);
                setCreatedAt(new Date(presentation.createdAt));
                setUpdatedAt(new Date(presentation.updatedAt));
                setSlides(presentation.slides);

                if (presentation.slides && presentation.slides.length > 0) {
                    setSelectedSlide(presentation.slides[0]);
                } else {
                    setSelectedSlide(null);
                }

                // Retrieve the file path
                electronAPI.presentation
                    .getCurrentFilePath()
                    .then((path) => setCurrentFilePath(path));
            },
        );

        const slidesReorderedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:slides-reordered',
            (...args: unknown[]) => {
                const presentation = args[0] as Presentation;
                setSlides(presentation.slides);
                setUpdatedAt(new Date(presentation.updatedAt));

                // Update selected slide if it still exists
                if (selectedSlide) {
                    const updatedSelectedSlide = presentation.slides.find(
                        (s) => s.id === selectedSlide.id,
                    );
                    if (updatedSelectedSlide) {
                        setSelectedSlide(updatedSelectedSlide);
                    }
                }
            },
        );

        const undoExecutedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:undo-executed',
            (...args: unknown[]) => {
                const presentation = args[0] as Presentation;
                setTitle(presentation.title);
                setCreatedAt(new Date(presentation.createdAt));
                setUpdatedAt(new Date(presentation.updatedAt));
                setSlides(presentation.slides);

                // Update selected slide if it still exists
                if (selectedSlide) {
                    const updatedSelectedSlide = presentation.slides.find(
                        (s) => s.id === selectedSlide.id,
                    );
                    if (updatedSelectedSlide) {
                        setSelectedSlide(updatedSelectedSlide);
                    } else if (presentation.slides.length > 0) {
                        setSelectedSlide(presentation.slides[0]);
                    } else {
                        setSelectedSlide(null);
                    }
                }

                // Clear element selection after undo
                setSelectedElementId(null);
                setSelectedElementIds([]);
                setEditingElementId(null);
            },
        );

        const redoExecutedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:redo-executed',
            (...args: unknown[]) => {
                const presentation = args[0] as Presentation;
                setTitle(presentation.title);
                setCreatedAt(new Date(presentation.createdAt));
                setUpdatedAt(new Date(presentation.updatedAt));
                setSlides(presentation.slides);

                // Update selected slide if it still exists
                if (selectedSlide) {
                    const updatedSelectedSlide = presentation.slides.find(
                        (s) => s.id === selectedSlide.id,
                    );
                    if (updatedSelectedSlide) {
                        setSelectedSlide(updatedSelectedSlide);
                    } else if (presentation.slides.length > 0) {
                        setSelectedSlide(presentation.slides[0]);
                    } else {
                        setSelectedSlide(null);
                    }
                }

                // Clear element selection after redo
                setSelectedElementId(null);
                setSelectedElementIds([]);
                setEditingElementId(null);
            },
        );

        // The main process pushes undo/redo capabilities on every history
        // change (mutations, transactions, undo/redo, load).
        const historyChangedUnsubscribe = electronAPI.ipcRenderer.on(
            'presentation:history-changed',
            (...args: unknown[]) => {
                const capabilities = args[0] as {
                    canUndo: boolean;
                    canRedo: boolean;
                };
                setCanUndo(capabilities.canUndo);
                setCanRedo(capabilities.canRedo);
            },
        );

        // Listen for menu undo/redo events
        const menuUndoUnsubscribe = electronAPI.ipcRenderer.on(
            'menu:undo',
            () => {
                undo();
            },
        );

        const menuRedoUnsubscribe = electronAPI.ipcRenderer.on(
            'menu:redo',
            () => {
                redo();
            },
        );

        // Listen for menu copy event
        const menuCopyUnsubscribe = electronAPI.ipcRenderer.on(
            'menu:copy',
            () => {
                console.log('Menu copy event received');
                // Trigger copy for selected elements on current slide
                const copyEvent = new KeyboardEvent('keydown', {
                    ctrlKey: true,
                    metaKey: true,
                    key: 'c',
                    code: 'KeyC',
                    bubbles: true,
                    cancelable: true,
                });
                document.dispatchEvent(copyEvent);
            },
        );

        // Listen for menu select-all event
        const menuSelectAllUnsubscribe = electronAPI.ipcRenderer.on(
            'menu:select-all',
            () => {
                console.log('Menu select all event received');
                // Select all elements on current slide if we're not in an input field
                const activeElement =
                    document.activeElement as HTMLElement | null;
                const isInputFocused =
                    activeElement &&
                    (activeElement.tagName === 'INPUT' ||
                        activeElement.tagName === 'TEXTAREA' ||
                        activeElement.contentEditable === 'true');

                const isAgentInput =
                    activeElement &&
                    (activeElement.closest('[data-testid="agent-input"]') ||
                        activeElement.closest('.chat-interface') ||
                        activeElement.closest('.ql-editor'));

                if (!isInputFocused && !isAgentInput && selectedSlide) {
                    const allElementIds = selectedSlide.elements.map(
                        (el) => el.id,
                    );
                    selectMultipleElements(allElementIds);
                }
            },
        );

        return () => {
            metaUpdatedUnsubscribe();
            slideAddedUnsubscribe();
            slideUpdatedUnsubscribe();
            slideDeletedUnsubscribe();
            initUnsubscribe();
            setSlideUnsubscribe();
            presentationSavedUnsubscribe();
            presentationLoadedUnsubscribe();
            slidesReorderedUnsubscribe();
            undoExecutedUnsubscribe();
            redoExecutedUnsubscribe();
            historyChangedUnsubscribe();
            menuUndoUnsubscribe();
            menuRedoUnsubscribe();
            menuCopyUnsubscribe();
            menuSelectAllUnsubscribe();
        };
    }, [selectedSlide]);

    const initializePresentation = useCallback(async (title: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const presentation =
                await electronAPI.presentation.initializePresentation(title);

            setTitle(presentation.title);
            setCreatedAt(new Date(presentation.createdAt));
            setUpdatedAt(new Date(presentation.updatedAt));

            if (presentation.slides && presentation.slides.length > 0) {
                setSlides(presentation.slides);
                setSelectedSlide(presentation.slides[0]);
            }

            return presentation;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updatePresentationMeta = useCallback(async (newTitle: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await electronAPI.presentation.updateMeta(newTitle);
            setTitle(result.title);
            setUpdatedAt(new Date(result.updatedAt));

            return result;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addSlide = useCallback(async (title?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            await electronAPI.presentation.addSlide(title);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const selectSlide = useCallback(
        (slide: Slide) => {
            const slideExists = slides.some((s) => s.id === slide.id);
            if (slideExists) {
                setSelectedSlide(slide);
                setSelectedElementId(null);
                // Notify main process about slide selection
                electronAPI.presentation.setSelectedSlide(slide.id);
            }
        },
        [slides],
    );

    const updateSlide = useCallback(
        async (slideId: string, updates: Partial<Slide>) => {
            try {
                setIsLoading(true);
                setError(null);

                const updatedSlide = await electronAPI.presentation.updateSlide(
                    slideId,
                    updates,
                );

                setSlides((prev) => {
                    const index = prev.findIndex((s) => s.id === slideId);
                    if (index === -1) return prev;

                    const newSlides = [...prev];
                    newSlides[index] = updatedSlide;
                    return newSlides;
                });

                return updatedSlide;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const deleteSlide = useCallback(
        async (slideId: string) => {
            try {
                if (!slideId) {
                    setError('No slide ID provided');
                    return null;
                }

                setIsLoading(true);
                setError(null);

                const deletedSlideId =
                    await electronAPI.presentation.deleteSlide(slideId);

                setSlides((prevSlides) => {
                    const updatedSlides = prevSlides.filter(
                        (s) => s.id !== slideId,
                    );

                    setTimeout(() => {
                        if (selectedSlide?.id === slideId) {
                            if (updatedSlides.length > 0) {
                                setSelectedSlide(updatedSlides[0]);
                            } else {
                                setSelectedSlide(null);
                            }
                        }
                    }, 0);

                    return updatedSlides;
                });

                return deletedSlideId;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [selectedSlide],
    );

    const duplicateSlide = useCallback(async (slideId: string) => {
        try {
            if (!slideId) {
                setError('No slide ID provided');
                return null;
            }

            setIsLoading(true);
            setError(null);

            const duplicatedSlide =
                await electronAPI.presentation.duplicateSlide(slideId);

            // The slide will be added to the state automatically via the 'presentation:slide-added' event
            // No need to manually update state here

            return duplicatedSlide;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const selectElement = useCallback(
        (elementId: string | null) => {
            setSelectedElementId(elementId);
            setSelectedElementIds(elementId ? [elementId] : []);
            // When selecting a new element, stop editing any current element
            if (editingElementId && elementId !== editingElementId) {
                setEditingElementId(null);
            }
        },
        [editingElementId],
    );

    const selectMultipleElements = useCallback(
        (elementIds: string[]) => {
            setSelectedElementIds(elementIds);
            setSelectedElementId(
                elementIds.length === 1 ? elementIds[0] : null,
            );
            // Stop editing when multi-selecting
            if (elementIds.length > 1 && editingElementId) {
                setEditingElementId(null);
            }
        },
        [editingElementId],
    );

    const toggleElementSelection = useCallback(
        (elementId: string) => {
            setSelectedElementIds((current) => {
                const isCurrentlySelected = current.includes(elementId);
                let newSelection: string[];

                if (isCurrentlySelected) {
                    // Remove from selection
                    newSelection = current.filter((id) => id !== elementId);
                } else {
                    // Add to selection
                    newSelection = [...current, elementId];
                }

                // Update single selection state
                setSelectedElementId(
                    newSelection.length === 1 ? newSelection[0] : null,
                );

                // Stop editing when multi-selecting
                if (newSelection.length > 1 && editingElementId) {
                    setEditingElementId(null);
                }

                return newSelection;
            });
        },
        [editingElementId],
    );

    const clearElementSelection = useCallback(() => {
        setSelectedElementId(null);
        setSelectedElementIds([]);
        setEditingElementId(null);
    }, []);

    const startEditingElement = useCallback((elementId: string) => {
        setSelectedElementId(elementId);
        setSelectedElementIds([elementId]);
        setEditingElementId(elementId);
    }, []);

    const stopEditingElement = useCallback(() => {
        setEditingElementId(null);
    }, []);

    const addElement = useCallback(
        async (element: ContentElement) => {
            if (!selectedSlide) {
                setError('No slide is selected');
                return null;
            }

            try {
                setIsLoading(true);
                setError(null);

                await electronAPI.presentation.addElement(
                    selectedSlide.id,
                    element,
                );
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [selectedSlide],
    );

    const updateElement = useCallback(
        async (elementId: string, updates: Partial<ContentElement>) => {
            try {
                setIsLoading(true);
                setError(null);

                const updatedSlide =
                    await electronAPI.presentation.updateElement(
                        elementId,
                        updates,
                    );

                return updatedSlide;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const deleteElement = useCallback(async (elementId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const updatedSlide =
                await electronAPI.presentation.deleteElement(elementId);
            return updatedSlide;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const beginTransaction = useCallback(() => {
        return electronAPI.presentation.beginTransaction();
    }, []);

    const endTransaction = useCallback(() => {
        return electronAPI.presentation.endTransaction();
    }, []);

    const undo = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await electronAPI.presentation.undo();
            return result;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const redo = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await electronAPI.presentation.redo();
            return result;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const currentSlideIndex = useMemo(() => {
        if (!selectedSlide || slides.length === 0) return 0;
        const index = slides.findIndex(
            (slide) => slide.id === selectedSlide.id,
        );
        return index >= 0 ? index : 0;
    }, [selectedSlide, slides]);

    const nextSlide = useCallback(() => {
        if (slides.length === 0) return;

        const nextIndex = currentSlideIndex + 1;
        if (nextIndex < slides.length) {
            selectSlide(slides[nextIndex]);
        }
    }, [slides, currentSlideIndex, selectSlide]);

    const previousSlide = useCallback(() => {
        if (slides.length === 0 || currentSlideIndex <= 0) return;

        selectSlide(slides[currentSlideIndex - 1]);
    }, [slides, currentSlideIndex, selectSlide]);

    const goToSlide = useCallback(
        (index: number) => {
            if (slides.length === 0 || index < 0 || index >= slides.length)
                return;

            selectSlide(slides[index]);
        },
        [slides, selectSlide],
    );

    const savePresentation = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const filePath = await electronAPI.presentation.savePresentation();
            return filePath;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const savePresentationAs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const filePath =
                await electronAPI.presentation.savePresentationAs();
            return filePath;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadPresentation = useCallback(async (filePath?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const presentation =
                await electronAPI.presentation.loadPresentation(filePath);
            return presentation;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reorderSlides = useCallback(
        async (fromIndex: number, toIndex: number) => {
            try {
                console.log('reorderSlides hook called:', {
                    fromIndex,
                    toIndex,
                });
                setIsLoading(true);
                setError(null);

                const presentation =
                    await electronAPI.presentation.reorderSlides(
                        fromIndex,
                        toIndex,
                    );
                console.log('reorderSlides response:', presentation);
                return presentation;
            } catch (err) {
                console.error('reorderSlides error:', err);
                const errorMessage =
                    err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const presentation = {
        id: 'singleton',
        title,
        slides,
        createdAt,
        updatedAt,
    };

    return {
        presentation,
        selectedSlide,
        currentSlideIndex,
        selectedElementId,
        selectedElementIds,
        editingElementId,
        isLoading,
        error,
        currentFilePath,
        canUndo,
        canRedo,

        initializePresentation,
        updatePresentationMeta,
        addSlide,
        selectSlide,
        updateSlide,
        deleteSlide,
        duplicateSlide,
        nextSlide,
        previousSlide,
        goToSlide,
        selectElement,
        selectMultipleElements,
        toggleElementSelection,
        clearElementSelection,
        startEditingElement,
        stopEditingElement,
        addElement,
        updateElement,
        deleteElement,
        beginTransaction,
        endTransaction,
        undo,
        redo,
        reorderSlides,
        savePresentation,
        savePresentationAs,
        loadPresentation,
        openFullscreen: useCallback(() => {
            return electronAPI.presentation.openFullscreen();
        }, []),
        closeFullscreen: useCallback(() => {
            return electronAPI.presentation.closeFullscreen();
        }, []),
        isFullscreenOpen: useCallback(() => {
            return electronAPI.presentation.isFullscreenOpen();
        }, []),
    };
};
