import { Box } from '@mui/material';
import Quill from 'quill';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type {
    ContentElement,
    TextBox,
} from '../../../../../common/domain/entities/types';
import { HEADER_FONT_SIZES } from '../../../../../common/config/typography';
import { useTextEditing } from '../../../context/TextEditingContext';
import { ResizeHandles } from '../ResizeHandles';
import 'katex/dist/katex.min.css';
import katex from 'katex';

// Make KaTeX available globally for Quill
(window as any).katex = katex;

const SizeStyle = Quill.import('attributors/style/size') as any;
SizeStyle.whitelist = Array.from({ length: 117 }, (_, i) => `${i + 4}px`);
Quill.register(SizeStyle, true);

// Custom Size Picker for Quill Toolbar
class CustomSizePicker {
    constructor(select: HTMLSelectElement, quill: Quill) {
        this.select = select;
        this.quill = quill;
        this.init();
    }

    private select: HTMLSelectElement;
    private quill: Quill;

    private init() {
        // Clear existing options
        this.select.innerHTML = '';

        // Add placeholder option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Size';
        this.select.appendChild(defaultOption);

        // Add common font sizes
        const commonSizes = [
            8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80,
            96, 120,
        ];

        commonSizes.forEach((size) => {
            const option = document.createElement('option');
            option.value = `${size}px`;
            option.textContent = `${size}px`;
            this.select.appendChild(option);
        });

        // Style the select
        this.select.style.width = '80px';
        this.select.style.fontSize = '13px';
        this.select.style.border = '1px solid #ccc';
        this.select.style.borderRadius = '3px';
        this.select.style.padding = '3px';
        this.select.style.margin = '2px';
        this.select.style.background = 'white';

        // Add change event listener
        this.select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const value = target.value;

            if (value) {
                const range = this.quill.getSelection();
                if (range) {
                    if (range.length === 0) {
                        // No selection, set for next insertion
                        this.quill.format('size', value);
                    } else {
                        // Apply to selection
                        this.quill.formatText(
                            range.index,
                            range.length,
                            'size',
                            value,
                        );
                    }
                }
            }
        });

        // Update select value when selection changes
        this.quill.on('selection-change', (range) => {
            if (range) {
                const format = this.quill.getFormat(range);
                if (format.size) {
                    this.select.value = format.size;
                } else {
                    this.select.value = '';
                }
            }
        });
    }
}

// Register custom size picker
const registerCustomSizePicker = (quill: Quill) => {
    const toolbar = quill.getModule('toolbar');
    if (toolbar && toolbar.container) {
        // Find the font group and add our custom size picker
        const fontGroup = toolbar.container.querySelector(
            '.ql-formats:first-child',
        );
        if (fontGroup) {
            // Create custom size select
            const sizeSelect = document.createElement('select');
            sizeSelect.className = 'ql-size-custom';

            // Insert after font picker or at the end of font group
            const fontPicker = fontGroup.querySelector('.ql-font');
            if (fontPicker) {
                fontPicker.parentNode?.insertBefore(
                    sizeSelect,
                    fontPicker.nextSibling,
                );
            } else {
                fontGroup.appendChild(sizeSelect);
            }

            // Initialize custom picker
            new CustomSizePicker(sizeSelect, quill);
        }
    }
};

// Simple emoji list for quick access
const EMOJI_LIST = [
    '😀',
    '😃',
    '😄',
    '😁',
    '😆',
    '😅',
    '😂',
    '🤣',
    '😊',
    '😇',
    '🙂',
    '🙃',
    '😉',
    '😌',
    '😍',
    '🥰',
    '😘',
    '😗',
    '😙',
    '😚',
    '😋',
    '😛',
    '😝',
    '😜',
    '🤪',
    '🤨',
    '🧐',
    '🤓',
    '😎',
    '🤩',
    '🥳',
    '😏',
    '😒',
    '😞',
    '😔',
    '😟',
    '😕',
    '🙁',
    '☹',
    '😣',
    '😖',
    '😫',
    '😩',
    '🥺',
    '😢',
    '😭',
    '😤',
    '😠',
    '😡',
    '🤬',
    '🤯',
    '😳',
    '🥵',
    '🥶',
    '😱',
    '😨',
    '😰',
    '😥',
    '😓',
    '🤗',
    '🤔',
    '🤭',
    '🤫',
    '🤥',
    '😶',
    '😐',
    '😑',
    '😬',
    '🙄',
    '😯',
    '😦',
    '😧',
    '😮',
    '😲',
    '🥱',
    '😴',
    '🤤',
    '😪',
    '😵',
    '🤐',
    '🥴',
    '🤢',
    '🤮',
    '🤧',
    '😷',
    '🤒',
    '🤕',
    '🤑',
    '🤠',
    '😈',
    '👿',
    '👹',
    '👺',
    '🤡',
    '💩',
    '👻',
    '💀',
    '☠',
    '👽',
    '👾',
    '🤖',
    '🎃',
    '😺',
    '😸',
    '😹',
    '😻',
    '😼',
    '😽',
    '🙀',
    '😿',
    '😾',
    '❤',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '🤎',
    '💔',
    '❣',
    '💕',
    '💞',
    '💓',
    '💗',
    '💖',
    '💘',
    '💝',
    '💟',
    '👍',
    '👎',
    '👌',
    '🤏',
    '✌',
    '🤞',
    '🤟',
    '🤘',
    '🤙',
    '👈',
    '👉',
    '👆',
    '🖕',
    '👇',
    '☝',
    '👋',
    '🤚',
    '🖐',
    '✋',
    '🖖',
    '👏',
    '🙌',
    '🤝',
    '👐',
    '🤲',
    '🤜',
    '🤛',
    '✊',
    '👊',
    '🤦',
    '🤷',
    '🙆',
    '🙅',
    '💁',
    '🙋',
    '🙇',
    '🤰',
    '🤱',
    '👶',
    '🧒',
    '👦',
    '👧',
    '🧑',
    '👨',
    '👩',
    '🧓',
    '👴',
    '👵',
    '👮',
    '🕵',
    '💂',
    '🥷',
    '👷',
    '🤴',
    '👸',
    '👳',
    '👲',
    '🧕',
    '🤵',
    '👰',
    '🤰',
    '🤱',
    '👼',
    '🎅',
    '🤶',
    '🦸',
    '🦹',
    '🧙',
    '🧚',
    '🧛',
    '🧜',
    '🧝',
    '🧞',
    '🧟',
    '💆',
    '💇',
    '🚶',
    '🏃',
    '💃',
    '🕺',
    '🕴',
    '👯',
    '🧘',
    '🏇',
    '🏂',
    '🏌',
    '🏄',
    '🚣',
    '🏊',
    '⛷',
    '🏋',
    '🚴',
    '🚵',
    '🤸',
    '🤼',
    '🤽',
    '🤾',
    '🤹',
    '🧗',
    '🤺',
    '🏸',
    '🏓',
    '🏒',
    '🏑',
    '🥍',
    '🏏',
    '🥅',
    '⛳',
    '🪃',
    '🥏',
    '🏹',
    '🎣',
    '🤿',
    '🥊',
    '🥋',
    '🎽',
    '🛹',
    '🛷',
    '⛸',
    '🥌',
    '🎿',
    '🛝',
    '🪘',
    '🥁',
    '🎹',
    '🎸',
    '🎺',
    '🎷',
    '🪗',
    '🎻',
    '🪕',
    '🎤',
    '🎧',
    '📻',
    '🎼',
    '🎵',
    '🎶',
    '🎙',
    '🎚',
    '🎛',
];

// Emoji picker function
const showEmojiPicker = (quill: Quill) => {
    const range = quill.getSelection();
    if (!range) return;

    // Create emoji picker popup
    const picker = document.createElement('div');
    picker.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 280px;
        max-height: 200px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
    `;

    // Add emojis to picker
    EMOJI_LIST.forEach((emoji) => {
        const button = document.createElement('button');
        button.textContent = emoji;
        button.style.cssText = `
            border: none;
            background: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            font-size: 16px;
            transition: background-color 0.2s;
        `;
        button.onmouseover = () => (button.style.backgroundColor = '#f0f0f0');
        button.onmouseout = () =>
            (button.style.backgroundColor = 'transparent');
        button.onclick = (e) => {
            e.preventDefault();
            quill.insertText(range.index, emoji);
            quill.setSelection(range.index + emoji.length);
            picker.remove();
        };
        picker.appendChild(button);
    });

    // Position picker near the toolbar
    const toolbar = quill.getModule('toolbar').container;
    const toolbarRect = toolbar.getBoundingClientRect();
    picker.style.top = `${toolbarRect.bottom + 5}px`;
    picker.style.left = `${toolbarRect.left}px`;

    // Add to document
    document.body.appendChild(picker);

    // Close on outside click
    const closeHandler = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) {
            picker.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
};

const toolbarStyles = `
  .ql-toolbar {
    z-index: 9999 !important;
    position: relative !important;
  }
  .ql-picker-options {
    z-index: 10000 !important;
  }
  .ql-toolbar .ql-emoji::before {
    content: "😀";
    font-size: 16px;
    line-height: 1;
  }
  .ql-toolbar .ql-emoji {
    width: auto !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif !important;
  }
  .ql-tooltip {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
  .ql-tooltip.ql-hidden {
    display: none !important;
  }
`;

if (!document.querySelector('#quill-toolbar-zindex')) {
    const style = document.createElement('style');
    style.id = 'quill-toolbar-zindex';
    style.textContent = toolbarStyles;
    document.head.appendChild(style);
}

interface TextElementProps {
    element: TextBox;
    onClick: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onMultiElementUpdate?: (
        primaryElementId: string,
        primaryUpdates: Partial<ContentElement>,
        allUpdates: Array<{
            elementId: string;
            updates: Partial<ContentElement>;
        }>,
    ) => void;
    selectedElementIds?: string[];
    slideElements?: ContentElement[];
    isSelected: boolean;
    isEditing: boolean;
    onStartEditing: () => void;
    onStopEditing: (content?: string) => void;
    onElementUpdate?: (elementId: string, updates: Partial<TextBox>) => void;
    readOnly?: boolean;
}

export const TextElement: React.FC<TextElementProps> = ({
    element,
    onClick,
    onContextMenu,
    onMultiElementUpdate,
    selectedElementIds = [],
    slideElements = [],
    isSelected,
    isEditing,
    onStartEditing,
    onStopEditing,
    onElementUpdate,
    readOnly = false,
}) => {
    const {
        position,
        size,
        content,
        backgroundColor,
        borderRadius,
        verticalAlign,
        zIndex,
    } = element;
    const textRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const [preventBlur, setPreventBlur] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);
    const { setActiveEditor } = useTextEditing();

    useEffect(() => {
        if (textRef.current && !quillRef.current) {
            try {
                const quill = new Quill(textRef.current, {
                    theme: 'snow',
                    modules: {
                        toolbar: {
                            container: [
                                [{ header: [1, 2, 3, false] }],
                                [{ font: [] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ color: [] }, { background: [] }],
                                [{ list: 'ordered' }, { list: 'bullet' }],
                                ['link'],
                                [{ align: [] }],
                                ['emoji'],
                                ['code', 'formula'],
                                ['clean'],
                            ],
                            handlers: {
                                emoji: () => {
                                    showEmojiPicker(quill);
                                },
                            },
                        },
                    },
                    formats: [
                        'header',
                        'font',
                        'size',
                        'bold',
                        'italic',
                        'underline',
                        'strike',
                        'list',
                        'link',
                        'align',
                        'color',
                        'background',
                        'code',
                        'formula',
                    ],
                });

                if (content) {
                    quill.clipboard.dangerouslyPasteHTML(content);
                }

                // Register custom size picker in toolbar
                registerCustomSizePicker(quill);

                const toolbar = quill.getModule('toolbar');
                if (toolbar?.container) {
                    const handleToolbarClick = (e: Event) => {
                        e.stopPropagation();
                        setPreventBlur(true);

                        setTimeout(() => setPreventBlur(false), 300);
                    };

                    const handleToolbarMouseDown = (_e: Event) => {
                        setPreventBlur(true);
                    };

                    toolbar.container.addEventListener(
                        'mousedown',
                        handleToolbarMouseDown,
                        true,
                    );
                    toolbar.container.addEventListener(
                        'click',
                        handleToolbarClick,
                        false,
                    );
                }

                quillRef.current = quill;
            } catch (error) {
                console.error('Failed to initialize Quill editor:', error);
            }
        }

        if (quillRef.current) {
            if (isEditing) {
                quillRef.current.enable();
                const toolbar = quillRef.current.getModule('toolbar');
                if (toolbar?.container) {
                    toolbar.container.style.display = 'block';
                }
                setActiveEditor(quillRef.current);
                setPreventBlur(true);
                setTimeout(() => {
                    setPreventBlur(false);
                    if (quillRef.current) {
                        quillRef.current.focus();
                    }
                }, 200);
            } else {
                quillRef.current.disable();
                const toolbar = quillRef.current.getModule('toolbar');
                if (toolbar?.container) {
                    toolbar.container.style.display = 'none';
                }
                setActiveEditor(null);
            }
        }
    }, [isEditing, setActiveEditor, content]);

    useEffect(() => {
        if (quillRef.current && content) {
            const currentContent = quillRef.current.root.innerHTML;

            if (currentContent !== content) {
                quillRef.current.clipboard.dangerouslyPasteHTML(content);
            }
        }
    }, [content]);

    useEffect(() => {
        if (!isEditing) return;

        const handleDocumentClick = (e: MouseEvent) => {
            setTimeout(() => {
                if (preventBlur) return;

                const target = e.target as HTMLElement;
                const quillContainer = textRef.current;

                const isWithinQuill = quillContainer?.contains(target);

                let isWithinToolbar = false;
                if (quillRef.current) {
                    const toolbar = quillRef.current.getModule('toolbar');
                    if (toolbar?.container) {
                        isWithinToolbar = toolbar.container.contains(target);
                    }
                }

                const isToolbarElement =
                    target?.closest('.ql-toolbar') ||
                    target?.closest('.ql-picker') ||
                    target?.closest('.ql-picker-options') ||
                    target?.closest('.ql-picker-item') ||
                    target?.closest('.ql-picker-label') ||
                    target?.closest('.ql-formats') ||
                    target?.classList?.contains('ql-picker') ||
                    target?.classList?.contains('ql-picker-label') ||
                    target?.classList?.contains('ql-picker-item') ||
                    target?.classList?.contains('ql-stroke') ||
                    target?.classList?.contains('ql-fill') ||
                    (target?.tagName === 'svg' &&
                        target?.closest('.ql-toolbar'));

                if (
                    !isWithinQuill &&
                    !isWithinToolbar &&
                    !isToolbarElement &&
                    quillRef.current
                ) {
                    onStopEditing(quillRef.current.root.innerHTML);
                }
            }, 10);
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleDocumentClick, true);
        }, 50);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleDocumentClick, true);
        };
    }, [isEditing, preventBlur, onStopEditing]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;

        const target = e.target as HTMLElement;
        if (target?.closest('.ql-toolbar')) {
            return;
        }

        if (isSelected && !isEditing) {
            e.stopPropagation();
            setIsDragging(true);
            setHasDragged(false);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            });
        }
    };

    const onElementUpdateRef = useRef(onElementUpdate);
    const onMultiElementUpdateRef = useRef(onMultiElementUpdate);
    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        onMultiElementUpdateRef.current = onMultiElementUpdate;
    }, [onElementUpdate, onMultiElementUpdate]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setHasDragged(true);
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                const deltaX = newX - position.x;
                const deltaY = newY - position.y;

                // Check if multiple elements are selected and we have multi-element update capability
                if (
                    selectedElementIds.length > 1 &&
                    onMultiElementUpdateRef.current
                ) {
                    // Prepare updates for all selected elements
                    const allUpdates = selectedElementIds
                        .map((elementId) => {
                            const elem = slideElements.find(
                                (el) => el.id === elementId,
                            );
                            if (elem) {
                                return {
                                    elementId,
                                    updates: {
                                        position: {
                                            x: elem.position.x + deltaX,
                                            y: elem.position.y + deltaY,
                                        },
                                    },
                                };
                            }
                            return null;
                        })
                        .filter(Boolean) as Array<{
                        elementId: string;
                        updates: Partial<ContentElement>;
                    }>;

                    // Call with primary element (this one being dragged), its intended position, and all updates
                    const primaryUpdates = { position: { x: newX, y: newY } };
                    onMultiElementUpdateRef.current(
                        element.id,
                        primaryUpdates,
                        allUpdates,
                    );
                } else if (onElementUpdateRef.current) {
                    // Single element move
                    onElementUpdateRef.current(element.id, {
                        position: { x: newX, y: newY },
                    });
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [
        isDragging,
        dragOffset,
        element.id,
        selectedElementIds,
        slideElements,
        position.x,
        position.y,
    ]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.stopPropagation();
        onStartEditing();
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!preventBlur && isEditing && quillRef.current) {
            const relatedTarget = e.relatedTarget as HTMLElement;

            if (
                !relatedTarget ||
                (!relatedTarget.closest('[data-element-id]') &&
                    !relatedTarget.closest('.ql-toolbar'))
            ) {
                setTimeout(() => {
                    if (quillRef.current && isEditing) {
                        onStopEditing(quillRef.current.root.innerHTML);
                    }
                }, 100);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && quillRef.current) {
            setPreventBlur(false);
            onStopEditing(quillRef.current.root.innerHTML);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly) return;

        const target = e.target as HTMLElement;
        if (target?.closest('.ql-toolbar')) {
            return;
        }

        e.stopPropagation();
        // Don't trigger click if we just finished dragging
        if (!isEditing && !hasDragged) {
            onClick(e);
        }
        // Reset drag flag after a short delay to allow for future clicks
        setTimeout(() => setHasDragged(false), 100);
    };

    const renderContent = () => {
        return <div style={{ height: '100%', width: '100%' }} />;
    };

    return (
        <Box
            ref={textRef}
            data-element-id={element.id}
            data-element-type="textbox"
            sx={{
                '& .ql-container': {
                    border: 'none !important',
                    fontFamily: 'inherit !important',
                    fontSize: 'inherit !important',
                    height: '100% !important',
                },
                '& .ql-editor': {
                    display: 'flex !important',
                    padding: '5px !important',
                    flexDirection: 'column !important',
                    justifyContent:
                        verticalAlign === 'middle'
                            ? 'center !important'
                            : verticalAlign === 'bottom'
                              ? 'flex-end !important'
                              : 'flex-start !important',
                    minHeight: '100% !important',
                    overflow: 'visible !important',
                    color: 'inherit !important',
                    fontFamily: 'inherit !important',
                    fontSize: 'inherit !important',
                    '& ol': { paddingLeft: '0', fontSize: 'inherit' },
                    '& h1': {
                        fontSize: `${HEADER_FONT_SIZES.h1} !important`,
                        fontWeight: 'bold !important',
                        margin: '0 !important',
                    },
                    '& h2': {
                        fontSize: `${HEADER_FONT_SIZES.h2} !important`,
                        fontWeight: 'bold !important',
                        margin: '0 !important',
                    },
                    '& h3': {
                        fontSize: `${HEADER_FONT_SIZES.h3} !important`,
                        fontWeight: 'bold !important',
                        margin: '0 !important',
                    },
                },
                '& .ql-editor.ql-blank::before': {
                    fontStyle: 'normal !important',
                    color: '#999 !important',
                },
                '& .ql-toolbar.ql-snow': {
                    background: 'white !important',
                    border: '1px solid #ccc !important',
                    borderRadius: '4px !important',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15) !important',
                    userSelect: 'none !important',
                    pointerEvents: 'auto !important',
                },
                '& .ql-formats': {
                    marginRight: '15px !important',
                },
                '& .ql-toolbar': {
                    userSelect: 'none !important',
                    pointerEvents: 'auto !important',
                    '& *': {
                        userSelect: 'none !important',
                    },
                },
                '& .ql-picker': {
                    userSelect: 'none !important',
                },
                '& .ql-picker-options': {
                    userSelect: 'none !important',
                },
                '& .ql-toolbar button:focus, & .ql-toolbar select:focus, & .ql-picker:focus, & .ql-picker-item:focus':
                    {
                        outline: 'none !important',
                    },
                '& .ql-disabled .ql-toolbar': {
                    display: 'none !important',
                },
                '& .ql-disabled .ql-container': {
                    border: 'none !important',
                },
                '& .ql-tooltip': {
                    display: 'none !important',
                    visibility: 'hidden !important',
                    opacity: '0 !important',
                    pointerEvents: 'none !important',
                },
                '& .ql-tooltip.ql-hidden': {
                    display: 'none !important',
                },
            }}
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                maxHeight: `${size.height}px`,
                overflow: 'visible',
                cursor: readOnly
                    ? 'default'
                    : isEditing
                      ? 'text'
                      : isSelected
                        ? 'move'
                        : 'pointer',
                userSelect: isEditing ? 'text' : 'none',
                outline:
                    isSelected && !isEditing ? '2px solid #0066ff' : 'none',
                outlineOffset: '2px',
                padding: '0',
                border: 'none',
                backgroundColor: backgroundColor || 'transparent',
                borderRadius:
                    borderRadius !== undefined
                        ? `${borderRadius}px`
                        : undefined,
                zIndex: zIndex || 1,
                color: 'black',
                fontSize: '16px',
            }}
            onDoubleClick={handleDoubleClick}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={onContextMenu}
        >
            {renderContent()}
            <ResizeHandles
                isSelected={isSelected}
                isEditing={isEditing}
                elementId={element.id}
                position={position}
                size={size}
                onResize={
                    onElementUpdate
                        ? (id, updates) => onElementUpdate(id, updates)
                        : () => {}
                }
                minWidth={50}
                minHeight={30}
            />
        </Box>
    );
};
