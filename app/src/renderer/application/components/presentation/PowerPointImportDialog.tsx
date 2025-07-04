import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Typography,
} from '@mui/material';
import React from 'react';

interface ImportProgress {
    stage: string;
    progress: number; // 0-100
    message: string;
}

interface PowerPointImportDialogProps {
    open: boolean;
    onClose: () => void;
    isImporting: boolean;
    progress: ImportProgress | null;
    error: string | null;
    onStartImport: () => void;
    onClearError: () => void;
}

export const PowerPointImportDialog: React.FC<PowerPointImportDialogProps> = ({
    open,
    onClose,
    isImporting,
    progress,
    error,
    onStartImport,
    onClearError,
}) => {
    const handleClose = () => {
        if (!isImporting) {
            onClose();
            if (error) {
                onClearError();
            }
        }
    };

    const handleStartImport = () => {
        onClearError();
        onStartImport();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={isImporting}
        >
            <DialogTitle>Import PowerPoint Presentation</DialogTitle>

            <DialogContent>
                <Box sx={{ mt: 2, mb: 2 }}>
                    {!isImporting && !error && !progress && (
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Select a PowerPoint (.pptx) file to import into your presentation.
                            This will convert slides, text, shapes, and images from the PowerPoint file.
                        </Typography>
                    )}

                    {isImporting && (
                        <Box sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <CircularProgress size={24} sx={{ mr: 2 }} />
                                <Typography variant="h6">
                                    Importing PowerPoint...
                                </Typography>
                            </Box>

                            {progress && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        {progress.stage}: {progress.message}
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progress.progress}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{ mt: 0.5, display: 'block' }}
                                    >
                                        {progress.progress}% complete
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {error && (
                        <Box
                            sx={{
                                p: 2,
                                backgroundColor: 'error.light',
                                borderRadius: 1,
                                mb: 2,
                            }}
                        >
                            <Typography variant="subtitle2" color="error">
                                Import Failed
                            </Typography>
                            <Typography variant="body2" color="error">
                                {error}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                {!isImporting && (
                    <>
                        <Button onClick={handleClose}>Cancel</Button>
                        {error ? (
                            <Button
                                onClick={handleStartImport}
                                variant="contained"
                            >
                                Try Again
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStartImport}
                                variant="contained"
                            >
                                Select PowerPoint File
                            </Button>
                        )}
                    </>
                )}
                {isImporting && (
                    <Button onClick={handleClose} disabled>
                        Importing...
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};