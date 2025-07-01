import { useCallback, useEffect, useState } from 'react';
import { Slide } from '../../../common/domain/entities/types';

interface LintingError {
    id: string;
    elementId: string;
    slideId: string;
    type: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestedFix?: string;
    createdAt: Date;
}

interface SlideLintingResult {
    slideId: string;
    errors: LintingError[];
    hasErrors: boolean;
    lintedAt: Date;
}

interface ElectronWindow {
    electron: {
        ipcRenderer: {
            on: (
                channel: string,
                func: (...args: unknown[]) => void,
            ) => () => void;
            once: (channel: string, func: (...args: unknown[]) => void) => void;
        };
        linting: {
            lintSlide: (slide: Slide) => Promise<SlideLintingResult>;
            getLintingErrors: (slideId?: string) => Promise<LintingError[]>;
            clearErrors: (slideId?: string) => Promise<void>;
            hasErrors: (slideId?: string) => Promise<boolean>;
            getErrorsBySeverity: (severity: string) => Promise<LintingError[]>;
        };
    };
}

const electronAPI = (window as unknown as ElectronWindow).electron;

export const useMainProcessLinting = () => {
    const [allErrors, setAllErrors] = useState<LintingError[]>([]);
    const [errorsBySlide, setErrorsBySlide] = useState<
        Map<string, LintingError[]>
    >(new Map());
    const [isLinting, setIsLinting] = useState<boolean>(false);

    const updateErrorsFromResult = useCallback(
        (result: SlideLintingResult) => {
            setErrorsBySlide((prev) => {
                const newMap = new Map(prev);
                if (result.errors.length > 0) {
                    newMap.set(result.slideId, result.errors);
                } else {
                    newMap.delete(result.slideId);
                }
                return newMap;
            });

            setAllErrors(Array.from(errorsBySlide.values()).flat());
        },
        [errorsBySlide],
    );

    const lintSlide = useCallback(
        async (slide: Slide): Promise<SlideLintingResult> => {
            setIsLinting(true);
            try {
                const result = await electronAPI.linting.lintSlide(slide);
                updateErrorsFromResult(result);
                return result;
            } finally {
                setIsLinting(false);
            }
        },
        [updateErrorsFromResult],
    );

    const getLintingErrors = useCallback(
        async (slideId?: string): Promise<LintingError[]> => {
            return await electronAPI.linting.getLintingErrors(slideId);
        },
        [],
    );

    const clearErrors = useCallback(
        async (slideId?: string): Promise<void> => {
            await electronAPI.linting.clearErrors(slideId);
            if (slideId) {
                setErrorsBySlide((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(slideId);
                    return newMap;
                });
            } else {
                setErrorsBySlide(new Map());
            }
            setAllErrors(Array.from(errorsBySlide.values()).flat());
        },
        [errorsBySlide],
    );

    const hasErrors = useCallback(
        async (slideId?: string): Promise<boolean> => {
            return await electronAPI.linting.hasErrors(slideId);
        },
        [],
    );

    const getErrorsBySeverity = useCallback(
        async (
            severity: 'error' | 'warning' | 'info',
        ): Promise<LintingError[]> => {
            return await electronAPI.linting.getErrorsBySeverity(severity);
        },
        [],
    );

    useEffect(() => {
        const errorsUpdatedUnsubscribe = electronAPI.ipcRenderer.on(
            'linting:errors-updated',
            (...args: unknown[]) => {
                const { slideId, errors } = args[0] as {
                    slideId: string;
                    errors: LintingError[];
                };
                setErrorsBySlide((prev) => {
                    const newMap = new Map(prev);
                    if (errors.length > 0) {
                        newMap.set(slideId, errors);
                    } else {
                        newMap.delete(slideId);
                    }
                    return newMap;
                });
            },
        );

        const slideLintedUnsubscribe = electronAPI.ipcRenderer.on(
            'linting:slide-linted',
            (...args: unknown[]) => {
                const result = args[0] as SlideLintingResult;
                updateErrorsFromResult(result);
            },
        );

        const errorsClearedUnsubscribe = electronAPI.ipcRenderer.on(
            'linting:errors-cleared',
            (...args: unknown[]) => {
                const { slideId } = args[0] as { slideId?: string };
                if (slideId) {
                    setErrorsBySlide((prev) => {
                        const newMap = new Map(prev);
                        newMap.delete(slideId);
                        return newMap;
                    });
                } else {
                    setErrorsBySlide(new Map());
                }
            },
        );

        return () => {
            errorsUpdatedUnsubscribe();
            slideLintedUnsubscribe();
            errorsClearedUnsubscribe();
        };
    }, [updateErrorsFromResult]);

    useEffect(() => {
        setAllErrors(Array.from(errorsBySlide.values()).flat());
    }, [errorsBySlide]);

    const getSlideErrors = useCallback(
        (slideId: string): LintingError[] => {
            return errorsBySlide.get(slideId) || [];
        },
        [errorsBySlide],
    );

    const getErrorCount = useCallback(
        (severity?: 'error' | 'warning' | 'info'): number => {
            if (!severity) return allErrors.length;
            return allErrors.filter((error) => error.severity === severity)
                .length;
        },
        [allErrors],
    );

    const hasSlideErrors = useCallback(
        (slideId: string): boolean => {
            return (
                errorsBySlide.has(slideId) &&
                (errorsBySlide.get(slideId)?.length || 0) > 0
            );
        },
        [errorsBySlide],
    );

    return {
        allErrors,
        errorsBySlide,
        isLinting,
        lintSlide,
        getLintingErrors,
        clearErrors,
        hasErrors,
        getErrorsBySeverity,
        getSlideErrors,
        getErrorCount,
        hasSlideErrors,
    };
};
