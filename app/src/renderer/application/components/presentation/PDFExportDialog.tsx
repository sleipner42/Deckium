import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  LinearProgress,
  Typography,
  Box,
  Alert,
  Slider,
} from '@mui/material';
import { Download, PictureAsPdf } from '@mui/icons-material';
import { Presentation } from '../../../../common/domain/entities/types';
import { exportPresentationToPDF, PDFExportOptions, PDFExportProgress } from '../../utils/pdfExport';

interface PDFExportDialogProps {
  open: boolean;
  onClose: () => void;
  presentation: Presentation;
}

export const PDFExportDialog: React.FC<PDFExportDialogProps> = ({
  open,
  onClose,
  presentation,
}) => {
  const [options, setOptions] = useState<PDFExportOptions>({
    quality: 2,
    includeSlideNumbers: false,
    pageFormat: 'landscape',
    backgroundColor: '#ffffff',
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<PDFExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setProgress(null);

      const filename = `${presentation.title || 'presentation'}.pdf`;
      
      await exportPresentationToPDF(
        presentation,
        filename,
        options,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setProgress(null);
      }, 1500);

    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
      setError(null);
      setProgress(null);
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return (progress.currentSlide / progress.totalSlides) * 100;
  };

  const qualityLabels = {
    1: 'Fast (Lower Quality)',
    2: 'Balanced',
    3: 'High Quality (Slower)',
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isExporting}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PictureAsPdf color="primary" />
          Export to PDF
        </Box>
      </DialogTitle>

      <DialogContent>
        {!isExporting && !progress && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Export your presentation as a PDF file. Each slide will be exported as a separate page.
            </Typography>

            {/* Quality Setting */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Export Quality</FormLabel>
              <Box sx={{ mt: 2, mb: 1 }}>
                <Slider
                  value={options.quality}
                  onChange={(_, value) => setOptions({ ...options, quality: value as number })}
                  step={1}
                  marks
                  min={1}
                  max={3}
                  valueLabelDisplay="off"
                />
                <Typography variant="caption" color="text.secondary">
                  {qualityLabels[options.quality as keyof typeof qualityLabels]}
                </Typography>
              </Box>
            </FormControl>

            {/* Page Format */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Page Format</FormLabel>
              <RadioGroup
                value={options.pageFormat}
                onChange={(e) => setOptions({ ...options, pageFormat: e.target.value as 'landscape' | 'portrait' })}
                row
              >
                <FormControlLabel
                  value="landscape"
                  control={<Radio />}
                  label="Landscape (Recommended)"
                />
                <FormControlLabel
                  value="portrait"
                  control={<Radio />}
                  label="Portrait"
                />
              </RadioGroup>
            </FormControl>

            {/* Additional Options */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Additional Options</FormLabel>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeSlideNumbers}
                    onChange={(e) => setOptions({ ...options, includeSlideNumbers: e.target.checked })}
                  />
                }
                label="Include slide numbers"
              />
            </FormControl>

            {/* Slide Count Info */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                📄 {presentation.slides.length} slides will be exported
              </Typography>
            </Box>
          </>
        )}

        {/* Export Progress */}
        {(isExporting || progress) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {progress?.status === 'complete' ? 'Export Complete!' : 'Exporting Presentation...'}
            </Typography>
            
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage()}
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {progress?.message || 'Preparing export...'}
            </Typography>

            {progress && (
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Slide {progress.currentSlide} of {progress.totalSlides}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(getProgressPercentage())}%
                </Typography>
              </Box>
            )}

            {progress?.status === 'complete' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                PDF exported successfully! Check your downloads folder.
              </Alert>
            )}
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Export Failed:</strong> {error}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isExporting}>
          {progress?.status === 'complete' ? 'Close' : 'Cancel'}
        </Button>
        
        {!isExporting && !progress && (
          <Button
            onClick={handleExport}
            variant="contained"
            startIcon={<Download />}
            disabled={presentation.slides.length === 0}
          >
            Export PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};