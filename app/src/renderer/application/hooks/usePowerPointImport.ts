import { useCallback, useEffect, useState } from 'react';

interface ImportProgress {
    stage: string;
    progress: number; // 0-100
    message: string;
}

interface ImportResult {
    success: boolean;
    presentation?: any;
    error?: string;
}

export const usePowerPointImport = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for progress updates
        const unsubscribe = window.electron.ipcRenderer.on(
            'powerpoint-import:progress',
            (progressData: ImportProgress) => {
                setProgress(progressData);
            },
        );

        return unsubscribe;
    }, []);

    const selectAndImport = useCallback(async (): Promise<ImportResult> => {
        try {
            setIsImporting(true);
            setError(null);
            setProgress(null);

            const result =
                await window.electron.powerpointImport.selectAndImport();

            if (!result.success) {
                setError(result.error || 'Import failed');
            }

            return result;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsImporting(false);
            setProgress(null);
        }
    }, []);

    const importFile = useCallback(
        async (filePath: string): Promise<ImportResult> => {
            try {
                setIsImporting(true);
                setError(null);
                setProgress(null);

                const result =
                    await window.electron.powerpointImport.importFile(filePath);

                if (!result.success) {
                    setError(result.error || 'Import failed');
                }

                return result;
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'Unknown error occurred';
                setError(errorMessage);
                return { success: false, error: errorMessage };
            } finally {
                setIsImporting(false);
                setProgress(null);
            }
        },
        [],
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        isImporting,
        progress,
        error,

        // Actions
        selectAndImport,
        importFile,
        clearError,
    };
};
