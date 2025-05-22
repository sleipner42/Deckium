import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Collapse,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SendIcon from '@mui/icons-material/Send';
import { useCritic } from '../../context/CriticContext';
import { useAI } from '../../context/AIContext';
import { usePresentation } from '../../context/PresentationContext';

interface CriticFeedbackProps {
  slideId: string;
}

export const CriticFeedback: React.FC<CriticFeedbackProps> = ({ slideId }) => {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFeedbackButton, setShowFeedbackButton] = useState(true);
  const critic = useCritic();
  const ai = useAI();
  const presentation = usePresentation();

  const handleReviewSlide = async () => {
    try {
      setExpanded(true);
      setShowFeedbackButton(false);

      const response = await critic.reviewSlide(slideId);
      setFeedback(response);
    } catch (error) {
      console.error('Error reviewing slide:', error);
    }
  };

  const handleSendFeedbackToAI = async () => {
    if (!feedback || !ai.currentThread) return;

    try {
      await ai.sendMessage(
        `I have received feedback from a presentation critic about the slide I just created. Please review the feedback and make appropriate adjustments to the slide:\n\n${feedback}`,
      );
      setExpanded(false);
    } catch (error) {
      console.error('Error sending feedback to AI:', error);
    }
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleClose = () => {
    setExpanded(false);
    setShowFeedbackButton(true);
  };

  // Reset feedback when slideId changes
  useEffect(() => {
    setFeedback(null);
    setShowFeedbackButton(true);
    setExpanded(false);
  }, [slideId]);

  if (critic.isLoading && !feedback) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <CircularProgress size={20} />
        <Typography variant="body2">Analyzing slide...</Typography>
      </Box>
    );
  }

  return (
    <>
      {showFeedbackButton && !expanded && (
        <IconButton
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            bgcolor: 'background.paper',
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'white',
            },
          }}
          onClick={handleReviewSlide}
        >
          <RateReviewIcon />
        </IconButton>
      )}

      <Collapse
        in={expanded}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 2,
            maxHeight: '60vh',
            overflow: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RateReviewIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Presentation Critic
              </Typography>
            </Box>
            <Box>
              <IconButton size="small" onClick={handleExpandClick}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton size="small" onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {critic.isLoading && !feedback ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Analyzing slide...</Typography>
            </Box>
          ) : feedback ? (
            <>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', mb: 2 }}
              >
                {feedback}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  size="small"
                  onClick={handleSendFeedbackToAI}
                  disabled={ai.isLoading}
                >
                  {ai.isLoading ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Sending...
                    </>
                  ) : (
                    'Send to AI'
                  )}
                </Button>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Click "Review" to get feedback on this slide.
            </Typography>
          )}
        </Paper>
      </Collapse>
    </>
  );
};
