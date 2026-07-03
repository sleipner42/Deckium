import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
    LintingError,
    LintingSeverity,
    SlideLintingResult,
} from '../../../common/domain/entities/linting-types';
import { Slide } from '../../../common/domain/entities/types';

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
        };
    };
}

const electronAPI = (window as unknown as ElectronWindow).electron;

export const useMainProcessLinting = () => {
    const [errorsBySlide, setErrorsBySlide] = useState<
        Map<string, LintingError[]>
    >(new Map());
    const [isLinting, setIsLinting] = useState<boolean>(false);

    // Derived, never set directly — avoids stale-closure copies.
    const allErrors = useMemo(
        () => Array.from(errorsBySlide.values()).flat(),
        [errorsBySlide],
    );

    const updateErrorsFromResult = useCallback((result: SlideLintingResult) => {
        setErrorsBySlide((prev) => {
            const newMap = new Map(prev);
            if (result.errors.length > 0) {
                newMap.set(result.slideId, result.errors);
            } else {
                newMap.delete(result.slideId);
            }
            return newMap;
        });
    }, []);

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

    const clearErrors = useCallback(async (slideId?: string): Promise<void> => {
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
    }, []);

    const hasErrors = useCallback(
        async (slideId?: string): Promise<boolean> => {
            return await electronAPI.linting.hasErrors(slideId);
        },
        [],
    );

    useEffect(() => {
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
            slideLintedUnsubscribe();
            errorsClearedUnsubscribe();
        };
    }, [updateErrorsFromResult]);

    const getSlideErrors = useCallback(
        (slideId: string): LintingError[] => {
            return errorsBySlide.get(slideId) || [];
        },
        [errorsBySlide],
    );

    const getErrorCount = useCallback(
        (severity?: LintingSeverity): number => {
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
        getSlideErrors,
        getErrorCount,
        hasSlideErrors,
    };
};
