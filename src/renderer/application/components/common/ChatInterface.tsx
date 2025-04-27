import AddIcon from '@mui/icons-material/Add';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ImageIcon from '@mui/icons-material/Image';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../../../../common/domain/entities/ai-types';
import { useAI } from '../../context/AIContext';
import { keyframes } from '@mui/system';

interface ChatInterfaceProps {
  className?: string;
}

const MAX_IMAGE_SIZE = 800;
const IMAGE_QUALITY = 0.85;

// Add this keyframe animation outside of the component
const blinkKeyframes = keyframes`
  from, to { opacity: 1; }
  50% { opacity: 0; }
`;

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className = '',
}) => {
  const {
    currentThread,
    threads,
    isLoading,
    error,
    createThread,
    sendMessage,
    loadThread,
    deleteThread,
  } = useAI();

  const [inputValue, setInputValue] = useState('');
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [currentThread?.messages]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || !currentThread) return;

      const items = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');

                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                    if (width > MAX_IMAGE_SIZE) {
                      height = Math.round(height * (MAX_IMAGE_SIZE / width));
                      width = MAX_IMAGE_SIZE;
                    }
                  } else {
                    if (height > MAX_IMAGE_SIZE) {
                      width = Math.round(width * (MAX_IMAGE_SIZE / height));
                      height = MAX_IMAGE_SIZE;
                    }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);

                  const pngDataUrl = canvas.toDataURL(
                    'image/jpeg',
                    IMAGE_QUALITY,
                  );
                  setPastedImages((prevImages) => [...prevImages, pngDataUrl]);
                };
                img.src = event.target.result as string;
              }
            };
            reader.readAsDataURL(blob);

            e.preventDefault();
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [currentThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() && pastedImages.length === 0) return;

    try {
      if (!currentThread) {
        throw new Error(
          'Please create a thread first before sending a message',
        );
      }

      await sendMessage(
        inputValue,
        pastedImages.length > 0 ? pastedImages : undefined,
      );
      setInputValue('');
      setPastedImages([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRemoveImage = (index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateNewThread = async () => {
    try {
      await createThread('New Thread');
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const handleThreadSelect = async (threadId: string) => {
    await loadThread(threadId);
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const processMessageContent = (
    message: Message,
  ): { content: string; isUsingTool: boolean; hasImages: boolean } => {
    if (message.role !== 'assistant') {
      if (typeof message.content === 'string') {
        return {
          content: message.content,
          isUsingTool: false,
          hasImages: false,
        };
      } else if (Array.isArray(message.content)) {
        const textContents = message.content
          .filter((item) => item.type === 'text' && item.text)
          .map((item) => (item as { type: 'text'; text: string }).text)
          .join('\n');

        const hasImages = message.content.some(
          (item) => item.type === 'image_url',
        );

        return {
          content: textContents,
          isUsingTool: false,
          hasImages,
        };
      }

      return {
        content: 'Unsupported message format',
        isUsingTool: false,
        hasImages: false,
      };
    }

    if (typeof message.content === 'string') {
      const content = message.content;
      const actionMatch = content.match(/###\s*Action\s*###\s*(\{[\s\S]*\})/i);

      if (actionMatch) {
        const descriptionText = content.split(/###\s*Action\s*###/i)[0].trim();
        return {
          content: descriptionText,
          isUsingTool: true,
          hasImages: false,
        };
      }

      return { content: content, isUsingTool: false, hasImages: false };
    } else if (Array.isArray(message.content)) {
      const textContents = message.content
        .filter((item) => item.type === 'text' && item.text)
        .map((item) => (item as { type: 'text'; text: string }).text)
        .join('\n');

      const hasImages = message.content.some(
        (item) => item.type === 'image_url',
      );

      return {
        content: textContents,
        isUsingTool: false,
        hasImages,
      };
    }

    return {
      content: 'Unsupported message format',
      isUsingTool: false,
      hasImages: false,
    };
  };

  const renderMessageImages = (message: Message) => {
    if (
      typeof message.content !== 'object' ||
      !Array.isArray(message.content)
    ) {
      return null;
    }

    const imageContents = message.content.filter(
      (item) => item.type === 'image_url',
    );

    if (imageContents.length === 0) {
      return null;
    }

    return (
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {imageContents.map((item, index) => (
          <Box
            key={index}
            component="img"
            src={
              (item as { type: 'image_url'; image_url: { url: string } })
                .image_url.url
            }
            alt="Uploaded image"
            sx={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      {/* Thread Selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          bgcolor: alpha('#000', 0.02),
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: '2px',
            },
          }}
        >
          {threads.map((thread) => (
            <Chip
              key={thread.id}
              label={thread.title}
              size="small"
              onClick={() => handleThreadSelect(thread.id)}
              color={currentThread?.id === thread.id ? 'primary' : 'default'}
              variant={currentThread?.id === thread.id ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 1,
                fontSize: '0.75rem',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          ))}
        </Box>
        <IconButton
          size="small"
          onClick={handleCreateNewThread}
          color="primary"
          sx={{ ml: 0.5 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Error message */}
      {error && (
        <Box
          sx={{
            bgcolor: '#FFEDEB',
            color: '#B71D18',
            p: 1,
            fontSize: '0.75rem',
            borderBottom: '1px solid',
            borderColor: alpha('#B71D18', 0.2),
          }}
        >
          Error: {error}
        </Box>
      )}

      {/* Messages Container */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '2px',
          },
        }}
      >
        {currentThread ? (
          currentThread.messages.filter((msg: Message) => msg.role !== 'system')
            .length > 0 ? (
            <>
              {currentThread.messages

                .filter((message: Message) => message.role !== 'system')
                .map((message: Message) => {
                  const isUser = message.role === 'user';
                  const isAssistant = message.role === 'assistant';

                  const { content, isUsingTool, hasImages } =
                    processMessageContent(message);

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        maxWidth: '85%',
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          gap: 1,
                          alignItems: 'flex-start',
                        }}
                      >
                        {/* Avatar */}
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: isUser
                              ? 'primary.main'
                              : isAssistant
                                ? '#F5F5F7'
                                : 'grey.300',
                            border: isAssistant ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          {isUser ? (
                            <PersonOutlineOutlinedIcon
                              sx={{ color: 'white', fontSize: '0.9rem' }}
                            />
                          ) : isAssistant ? (
                            <SmartToyOutlinedIcon
                              sx={{
                                color: 'text.secondary',
                                fontSize: '0.9rem',
                              }}
                            />
                          ) : null}
                        </Avatar>

                        {/* Message Content */}
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mb: 0.5,
                              color: 'text.secondary',
                              fontSize: '0.65rem',
                              ml: isUser ? 'auto' : 0,
                              mr: isUser ? 0 : 'auto',
                            }}
                          >
                            {isUser ? 'You' : 'AI Assistant'} •{' '}
                            {formatTimestamp(message.timestamp)}
                            {isUsingTool && (
                              <Tooltip title="Using a tool">
                                <BuildCircleIcon
                                  sx={{
                                    ml: 0.5,
                                    fontSize: '0.85rem',
                                    color: 'primary.main',
                                  }}
                                />
                              </Tooltip>
                            )}
                            {message.streamingState === 'streaming' && (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  ml: 0.5,
                                }}
                              >
                                <CircularProgress size={8} thickness={6} />
                              </Box>
                            )}
                          </Typography>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: isUser
                                ? 'primary.main'
                                : isAssistant
                                  ? isUsingTool
                                    ? alpha('#007AFF', 0.08)
                                    : alpha('#000', 0.03)
                                  : alpha('#000', 0.02),
                              border: !isUser ? '1px solid' : 'none',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: 'pre-wrap',
                                color: isUser ? 'white' : 'text.primary',
                                fontSize: '0.85rem',
                                lineHeight: 1.5,
                              }}
                            >
                              {content}
                              {message.streamingState === 'streaming' && 
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    display: 'inline-block', 
                                    width: '0.5em',
                                    height: '1em',
                                    ml: 0.5,
                                    verticalAlign: 'middle',
                                    animation: `${blinkKeyframes} 1s step-end infinite`,
                                    bgcolor: isUser ? 'white' : 'text.primary',
                                  }}
                                >
                                  &nbsp;
                                </Box>
                              }
                            </Typography>

                            {/* Render images from message content */}
                            {renderMessageImages(message)}

                            {/* Show image indicator if the message has images but we're not rendering them directly */}
                            {hasImages && !renderMessageImages(message) && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  mt: 1,
                                  py: 1,
                                  px: 2,
                                  borderRadius: 1,
                                  bgcolor: alpha('#000', 0.05),
                                  color: 'text.secondary',
                                }}
                              >
                                <ImageIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                                <Typography
                                  variant="body2"
                                  sx={{ fontSize: '0.85rem' }}
                                >
                                  [Image shared in conversation]
                                </Typography>
                              </Box>
                            )}
                          </Paper>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              <Box ref={messagesEndRef} />
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: 'italic' }}
              >
                Type a message to start the conversation
              </Typography>
            </Box>
          )
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No active thread
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleCreateNewThread}
              disabled={isLoading}
              sx={{ borderRadius: 1.5 }}
            >
              {isLoading ? (
                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
              ) : null}
              Create New Thread
            </Button>
          </Box>
        )}
      </Box>

      {/* Input Area */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        {/* Pasted images preview */}
        {pastedImages.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mb: 1.5,
              p: 1,
              borderRadius: 1,
              bgcolor: alpha('#000', 0.02),
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            {pastedImages.map((img, index) => (
              <Box key={index} sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={img}
                  alt="Pasted image"
                  sx={{
                    height: 60,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemoveImage(index)}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    p: 0.5,
                    '&:hover': {
                      bgcolor: 'error.light',
                      color: 'white',
                    },
                  }}
                >
                  <HighlightOffIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          placeholder={
            currentThread
              ? 'Type your message or paste an image...'
              : 'Create a thread first'
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading || !currentThread}
          variant="outlined"
          inputRef={inputRef}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {!currentThread ? (
                  <Button
                    color="primary"
                    size="small"
                    onClick={handleCreateNewThread}
                    disabled={isLoading}
                    startIcon={<AddIcon />}
                    sx={{
                      borderRadius: 1.5,
                      textTransform: 'none',
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress
                        size={16}
                        color="inherit"
                        sx={{ mr: 1 }}
                      />
                    ) : null}
                    New
                  </Button>
                ) : (
                  <IconButton
                    color="primary"
                    type="submit"
                    disabled={
                      isLoading ||
                      (!inputValue.trim() && pastedImages.length === 0)
                    }
                    edge="end"
                    size="small"
                  >
                    {isLoading ? <CircularProgress size={16} /> : <SendIcon />}
                  </IconButton>
                )}
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              fontSize: '0.875rem',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha('#000', 0.1),
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};
