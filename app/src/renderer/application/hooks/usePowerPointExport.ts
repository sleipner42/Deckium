import { useEffect, useState } from 'react';

interface ExportStatus {
    isExporting: boolean;
    message: string;
    error?: string;
}

export const usePowerPointExport = () => {
    const [status, setStatus] = useState<ExportStatus>({
        isExporting: false,
        message: '',
    });

    useEffect(() => {
        const handleProgress = (message: string) => {
            setStatus({
                isExporting: true,
                message,
            });
        };

        const handleComplete = (message: string) => {
            setStatus({
                isExporting: false,
                message,
            });

            // Clear message after 3 seconds
            setTimeout(() => {
                setStatus((prev) => ({ ...prev, message: '' }));
            }, 3000);
        };

        const handleError = (message: string, error?: string) => {
            setStatus({
                isExporting: false,
                message,
                error,
            });

            // Clear error after 5 seconds
            setTimeout(() => {
                setStatus((prev) => ({
                    ...prev,
                    message: '',
                    error: undefined,
                }));
            }, 5000);
        };

        // Listen for PowerPoint export events
        const unsubscribeProgress = window.electron.ipcRenderer.on(
            'powerpoint-export:progress',
            (data: { message: string }) => {
                handleProgress(data.message);
            },
        );

        const unsubscribeComplete = window.electron.ipcRenderer.on(
            'powerpoint-export:complete',
            (data: { message: string }) => {
                handleComplete(data.message);
            },
        );

        const unsubscribeError = window.electron.ipcRenderer.on(
            'powerpoint-export:error',
            (data: { message: string; error?: string }) => {
                handleError(data.message, data.error);
            },
        );

        return () => {
            unsubscribeProgress();
            unsubscribeComplete();
            unsubscribeError();
        };
    }, []);

    const exportToPowerPoint = async () => {
        try {
            setStatus({
                isExporting: true,
                message: 'Preparing export...',
            });

            await window.electron.presentation.exportToPowerPoint();
        } catch (error) {
            console.error('Export failed:', error);
            setStatus({
                isExporting: false,
                message: 'Export failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    return {
        status,
        exportToPowerPoint,
    };
};
