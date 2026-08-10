import AddIcon from '@mui/icons-material/Add';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ImageIcon from '@mui/icons-material/Image';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import StopIcon from '@mui/icons-material/Stop';
import {
    Avatar,
    alpha,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { keyframes } from '@mui/system';
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../../../../common/domain/entities/ai-types';
import { useAI } from '../../context/AIContext';
import { usePresentation } from '../../context/PresentationContext';

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

const TOOL_PREFIX = '[TOOL]';

interface ToolStep {
    name: string;
    label: string;
    detail: string;
    status: 'running' | 'done' | 'error';
}

const parseToolStep = (message: Message): ToolStep | null => {
    if (
        message.role !== 'system' ||
        typeof message.content !== 'string' ||
        !message.content.startsWith(TOOL_PREFIX)
    ) {
        return null;
    }
    try {
        return JSON.parse(
            message.content.slice(TOOL_PREFIX.length),
        ) as ToolStep;
    } catch {
        return null;
    }
};

const isVisibleMessage = (message: Message): boolean => {
    return message.role === 'user' || message.role === 'assistant';
};

const lastToolStep = (messages: Message[]): ToolStep | null => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const step = parseToolStep(messages[i]);
        if (step) {
            return step;
        }
    }
    return null;
};

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
        abortRequest,
    } = useAI();

    const { selectElement } = usePresentation();

    const [inputValue, setInputValue] = useState('');
    const [pastedImages, setPastedImages] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [_processingSessionId, setProcessingSessionId] = useState<
        string | null
    >(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [currentThread?.messages]);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!e.clipboardData || !currentThread) return;

            const { items } = e.clipboardData;

            // Check for images first (prioritize images over text)
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            if (event.target?.result) {
                                const img = new Image();
                                img.onload = () => {
                                    const canvas =
                                        document.createElement('canvas');

                                    let { width } = img;
                                    let { height } = img;

                                    if (width > height) {
                                        if (width > MAX_IMAGE_SIZE) {
                                            height = Math.round(
                                                height *
                                                    (MAX_IMAGE_SIZE / width),
                                            );
                                            width = MAX_IMAGE_SIZE;
                                        }
                                    } else if (height > MAX_IMAGE_SIZE) {
                                        width = Math.round(
                                            width * (MAX_IMAGE_SIZE / height),
                                        );
                                        height = MAX_IMAGE_SIZE;
                                    }

                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx?.drawImage(img, 0, 0, width, height);

                                    const pngDataUrl = canvas.toDataURL(
                                        'image/jpeg',
                                        IMAGE_QUALITY,
                                    );
                                    setPastedImages((prevImages) => [
                                        ...prevImages,
                                        pngDataUrl,
                                    ]);
                                };
                                img.src = event.target.result as string;
                            }
                        };
                        reader.readAsDataURL(blob);

                        e.preventDefault();
                        return; // Exit early if image was processed
                    }
                }
            }

            // Allow normal text pasting to continue in the input field
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
        if (isProcessing) return; // Prevent multiple submissions

        try {
            if (!currentThread) {
                throw new Error(
                    'Please create a thread first before sending a message',
                );
            }

            const sessionId = Date.now().toString(); // Unique session ID
            setIsProcessing(true); // Show stop button immediately
            setProcessingSessionId(sessionId);
            setInputValue('');
            setPastedImages([]);

            await sendMessage(
                inputValue,
                pastedImages.length > 0 ? pastedImages : undefined,
            );
        } catch (error) {
            // Only log non-abort errors
            if (
                !(
                    error instanceof Error &&
                    (error.name === 'AbortError' ||
                        error.message.includes('aborted'))
                )
            ) {
                console.error('Error sending message:', error);
            }
        } finally {
            setIsProcessing(false); // Hide stop button when done
            setProcessingSessionId(null);
        }
    };

    const handleRemoveImage = (index: number) => {
        setPastedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCreateNewThread = async () => {
        try {
            // Generate thread name based on existing threads count
            const threadNumber = threads.length + 1;
            const threadName = `Thread ${threadNumber}`;
            await createThread(threadName);
        } catch (error) {
            console.error('Error creating thread:', error);
        }
    };

    const handleThreadSelect = async (threadId: string) => {
        await loadThread(threadId);
    };

    const handleInputFocus = () => {
        selectElement(null);
    };

    const handleAbortRequest = async () => {
        try {
            await abortRequest();
            console.log('Abort request sent');
        } catch (error) {
            console.error('Error sending abort request:', error);
        } finally {
            setIsProcessing(false); // Hide stop button and clear streaming states
            setProcessingSessionId(null); // Clear the session
        }
    };

    const formatTimestamp = (date: Date) => {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderLiveActivity = () => {
        const step = currentThread
            ? lastToolStep(currentThread.messages)
            : null;
        const label = step ? step.label : 'Thinking';

        return (
            <Box sx={{ alignSelf: 'flex-start', maxWidth: '90%', mb: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                    }}
                >
                    <Avatar
                        sx={{
                            width: 28,
                            height: 28,
                            bgcolor: '#F5F5F7',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <SmartToyOutlinedIcon
                            sx={{
                                color: 'text.secondary',
                                fontSize: '0.9rem',
                            }}
                        />
                    </Avatar>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1.5,
                            bgcolor: alpha('#007AFF', 0.08),
                            border: '1px solid',
                            borderColor: 'divider',
                            minWidth: 0,
                        }}
                    >
                        <CircularProgress size={13} thickness={6} />
                        <Typography
                            sx={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'text.primary',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {label}
                            <Box
                                component="span"
                                sx={{
                                    animation: `${blinkKeyframes} 1.2s step-end infinite`,
                                }}
                            >
                                …
                            </Box>
                        </Typography>
                        {step?.detail && (
                            <Typography
                                sx={{
                                    fontSize: '0.76rem',
                                    color: 'text.secondary',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {step.detail}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Box>
        );
    };

    const processMessageContent = (
        message: Message,
    ): { content: string; hasImages: boolean } => {
        if (typeof message.content === 'string') {
            return { content: message.content, hasImages: false };
        }

        if (Array.isArray(message.content)) {
            const content = message.content
                .filter((item) => item.type === 'text' && item.text)
                .map((item) => (item as { type: 'text'; text: string }).text)
                .join('\n');
            const hasImages = message.content.some(
                (item) => item.type === 'image_url',
            );
            return { content, hasImages };
        }

        return { content: '', hasImages: false };
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
            <Box
                sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}
            >
                {imageContents.map((item, index) => (
                    <Box
                        key={index}
                        component="img"
                        src={
                            (
                                item as {
                                    type: 'image_url';
                                    image_url: { url: string };
                                }
                            ).image_url.url
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
            className={`chat-interface ${className}`}
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
                            color={
                                currentThread?.id === thread.id
                                    ? 'primary'
                                    : 'default'
                            }
                            variant={
                                currentThread?.id === thread.id
                                    ? 'filled'
                                    : 'outlined'
                            }
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
                    currentThread.messages.filter(isVisibleMessage).length >
                    0 ? (
                        <>
                            {currentThread.messages
                                .filter(isVisibleMessage)
                                .map(
                                    (
                                        message: Message,
                                        index,
                                        filteredMessages,
                                    ) => {
                                        const isUser = message.role === 'user';
                                        const isAssistant =
                                            message.role === 'assistant';

                                        // Only show streaming indicators for the last assistant message
                                        const isLastAssistantMessage =
                                            isAssistant &&
                                            index ===
                                                filteredMessages.length - 1;
                                        const shouldShowStreamingIndicator =
                                            isLastAssistantMessage &&
                                            isProcessing;

                                        const { content, hasImages } =
                                            processMessageContent(message);

                                        return (
                                            <Box
                                                key={message.id}
                                                sx={{
                                                    maxWidth: '85%',
                                                    width: 'fit-content',
                                                    alignSelf: isUser
                                                        ? 'flex-end'
                                                        : 'flex-start',
                                                    mb: 1.5,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: isUser
                                                            ? 'row-reverse'
                                                            : 'row',
                                                        gap: 1,
                                                        alignItems:
                                                            'flex-start',
                                                    }}
                                                >
                                                    {/* Avatar */}
                                                    <Avatar
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            bgcolor: isUser
                                                                ? 'primary.main'
                                                                : '#F5F5F7',
                                                            border: isUser
                                                                ? 'none'
                                                                : '1px solid',
                                                            borderColor:
                                                                'divider',
                                                        }}
                                                    >
                                                        {isUser ? (
                                                            <PersonOutlineOutlinedIcon
                                                                sx={{
                                                                    color: 'white',
                                                                    fontSize:
                                                                        '0.9rem',
                                                                }}
                                                            />
                                                        ) : (
                                                            <SmartToyOutlinedIcon
                                                                sx={{
                                                                    color: 'text.secondary',
                                                                    fontSize:
                                                                        '0.9rem',
                                                                }}
                                                            />
                                                        )}
                                                    </Avatar>

                                                    {/* Message Content */}
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: 0.5,
                                                                mb: 0.5,
                                                                color: 'text.secondary',
                                                                fontSize:
                                                                    '0.65rem',
                                                                ml: isUser
                                                                    ? 'auto'
                                                                    : 0,
                                                                mr: isUser
                                                                    ? 0
                                                                    : 'auto',
                                                            }}
                                                        >
                                                            {isUser
                                                                ? 'You'
                                                                : 'AI Assistant'}{' '}
                                                            •{' '}
                                                            {formatTimestamp(
                                                                message.timestamp,
                                                            )}
                                                            {message.streamingState ===
                                                                'streaming' &&
                                                                shouldShowStreamingIndicator && (
                                                                    <Box
                                                                        component="span"
                                                                        sx={{
                                                                            display:
                                                                                'inline-flex',
                                                                            alignItems:
                                                                                'center',
                                                                            ml: 0.5,
                                                                        }}
                                                                    >
                                                                        <CircularProgress
                                                                            size={
                                                                                8
                                                                            }
                                                                            thickness={
                                                                                6
                                                                            }
                                                                        />
                                                                    </Box>
                                                                )}
                                                        </Typography>
                                                        <Paper
                                                            elevation={0}
                                                            sx={{
                                                                p: 1.5,
                                                                borderRadius: 1.5,
                                                                maxWidth:
                                                                    '100%',
                                                                overflowWrap:
                                                                    'break-word',
                                                                bgcolor: isUser
                                                                    ? 'primary.main'
                                                                    : alpha(
                                                                          '#000',
                                                                          0.03,
                                                                      ),
                                                                border: !isUser
                                                                    ? '1px solid'
                                                                    : 'none',
                                                                borderColor:
                                                                    'divider',
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    whiteSpace:
                                                                        'pre-wrap',
                                                                    wordBreak:
                                                                        'break-word',
                                                                    overflow:
                                                                        'visible',
                                                                    color: isUser
                                                                        ? 'white'
                                                                        : 'text.primary',
                                                                    fontSize:
                                                                        '0.85rem',
                                                                    lineHeight: 1.5,
                                                                }}
                                                            >
                                                                {content}
                                                                {message.streamingState ===
                                                                    'streaming' &&
                                                                    shouldShowStreamingIndicator && (
                                                                        <Box
                                                                            component="span"
                                                                            sx={{
                                                                                display:
                                                                                    'inline-block',
                                                                                width: '0.5em',
                                                                                height: '1em',
                                                                                ml: 0.5,
                                                                                verticalAlign:
                                                                                    'middle',
                                                                                animation: `${blinkKeyframes} 1s step-end infinite`,
                                                                                bgcolor:
                                                                                    isUser
                                                                                        ? 'white'
                                                                                        : 'text.primary',
                                                                            }}
                                                                        >
                                                                            &nbsp;
                                                                        </Box>
                                                                    )}
                                                            </Typography>

                                                            {/* Render images from message content */}
                                                            {renderMessageImages(
                                                                message,
                                                            )}

                                                            {/* Show image indicator if the message has images but we're not rendering them directly */}
                                                            {hasImages &&
                                                                !renderMessageImages(
                                                                    message,
                                                                ) && (
                                                                    <Box
                                                                        sx={{
                                                                            display:
                                                                                'flex',
                                                                            alignItems:
                                                                                'center',
                                                                            mt: 1,
                                                                            py: 1,
                                                                            px: 2,
                                                                            borderRadius: 1,
                                                                            bgcolor:
                                                                                alpha(
                                                                                    '#000',
                                                                                    0.05,
                                                                                ),
                                                                            color: 'text.secondary',
                                                                        }}
                                                                    >
                                                                        <ImageIcon
                                                                            sx={{
                                                                                mr: 1,
                                                                                fontSize:
                                                                                    '1.1rem',
                                                                            }}
                                                                        />
                                                                        <Typography
                                                                            variant="body2"
                                                                            sx={{
                                                                                fontSize:
                                                                                    '0.85rem',
                                                                            }}
                                                                        >
                                                                            [Image
                                                                            shared
                                                                            in
                                                                            conversation]
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                        </Paper>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        );
                                    },
                                )}

                            {isProcessing &&
                                !currentThread.messages.some(
                                    (m) => m.streamingState === 'streaming',
                                ) &&
                                renderLiveActivity()}

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
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                    sx={{ mr: 1 }}
                                />
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
                    onFocus={handleInputFocus}
                    disabled={isProcessing || !currentThread}
                    variant="outlined"
                    inputRef={inputRef}
                    inputProps={{
                        'data-testid': 'agent-input',
                    }}
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
                                ) : isProcessing ? (
                                    <IconButton
                                        color="error"
                                        onClick={handleAbortRequest}
                                        edge="end"
                                        size="small"
                                        title="Stop generation"
                                        sx={{
                                            animation: 'pulse 2s infinite',
                                            '@keyframes pulse': {
                                                '0%': { opacity: 1 },
                                                '50%': { opacity: 0.7 },
                                                '100%': { opacity: 1 },
                                            },
                                        }}
                                    >
                                        <StopIcon />
                                    </IconButton>
                                ) : (
                                    <IconButton
                                        color="primary"
                                        type="submit"
                                        disabled={
                                            isProcessing ||
                                            (!inputValue.trim() &&
                                                pastedImages.length === 0)
                                        }
                                        edge="end"
                                        size="small"
                                    >
                                        <SendIcon />
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
