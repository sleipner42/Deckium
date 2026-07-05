import { Box } from '@mui/material';
import Quill from 'quill';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
    FONT_CSS_VALUES,
    QUILL_FORMATS,
} from '../../../../../common/config/text-formats';
import {
    DEFAULT_TEXT_FONT_SIZE,
    HEADER_FONT_SIZES,
    HEADER_LINE_SPACING,
} from '../../../../../common/config/typography';
import type {
    ContentElement,
    TextBox,
} from '../../../../../common/domain/entities/types';
import { useTextEditing } from '../../../context/TextEditingContext';
import { useDraggableElement } from '../../../hooks/useDraggableElement';
import { ResizeHandles } from '../ResizeHandles';
import 'katex/dist/katex.min.css';
import katex from 'katex';

// Make KaTeX available globally for Quill
(window as any).katex = katex;

const SizeStyle = Quill.import('attributors/style/size') as any;
SizeStyle.whitelist = Array.from({ length: 117 }, (_, i) => `${i + 4}px`);
Quill.register(SizeStyle, true);

// Register font as an inline style attributor (like size) so agent/imported
// `font-family` styles are preserved instead of dropped. Whitelist and format
// list come from the shared spec that the sanitizer enforces.
const FontStyle = Quill.import('attributors/style/font') as any;
FontStyle.whitelist = FONT_CSS_VALUES;
Quill.register(FontStyle, true);

// Quill's `getModule` is typed as returning `unknown`; the toolbar module
// exposes a `container` element we rely on for our custom pickers.
type ToolbarModule = { container: HTMLElement };
const getToolbarModule = (quill: Quill): ToolbarModule =>
    quill.getModule('toolbar') as ToolbarModule;

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
                    this.select.value = format.size as string;
                } else {
                    this.select.value = '';
                }
            }
        });
    }
}

// Custom Vertical Alignment Picker for Quill Toolbar
class CustomVerticalAlignPicker {
    constructor(
        container: HTMLElement,
        quill: Quill,
        onVerticalAlignChange: (align: string) => void,
    ) {
        this.container = container;
        this.quill = quill;
        this.onVerticalAlignChange = onVerticalAlignChange;
        this.currentValue = 'top';
        this.isOpen = false;
        this.init();
    }

    private container: HTMLElement;
    private quill: Quill;
    private onVerticalAlignChange: (align: string) => void;
    private currentValue: string;
    private isOpen: boolean;
    private dropdown: HTMLElement | null = null;

    private getSvgIcon(type: string): string {
        const svgIcons = {
            top: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6.5C6 6.22386 6.22386 6 6.5 6H13.5C13.7761 6 14 6.22386 14 6.5C14 6.77614 13.7761 7 13.5 7H6.5C6.22386 7 6 6.77614 6 6.5Z" fill="#212121"/>
                <path d="M6.5 9C6.22386 9 6 9.22386 6 9.5C6 9.77614 6.22386 10 6.5 10H13.5C13.7761 10 14 9.77614 14 9.5C14 9.22386 13.7761 9 13.5 9H6.5Z" fill="#212121"/>
                <path d="M14.5 3C15.8807 3 17 4.11929 17 5.5V14.5C17 15.8807 15.8807 17 14.5 17H5.5C4.11929 17 3 15.8807 3 14.5V5.5C3 4.11929 4.11929 3 5.5 3H14.5ZM14.5 4H5.5C4.67157 4 4 4.67157 4 5.5V14.5C4 15.3284 4.67157 16 5.5 16H14.5C15.3284 16 16 15.3284 16 14.5V5.5C16 4.67157 15.3284 4 14.5 4Z" fill="#212121"/>
            </svg>`,
            middle: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8.5C6 8.22386 6.22386 8 6.5 8H13.5C13.7761 8 14 8.22386 14 8.5C14 8.77614 13.7761 9 13.5 9H6.5C6.22386 9 6 8.77614 6 8.5Z" fill="#212121"/>
                <path d="M6.5 11C6.22386 11 6 11.2239 6 11.5C6 11.7761 6.22386 12 6.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H6.5Z" fill="#212121"/>
                <path d="M14.5 3C15.8807 3 17 4.11929 17 5.5V14.5C17 15.8807 15.8807 17 14.5 17H5.5C4.11929 17 3 15.8807 3 14.5V5.5C3 4.11929 4.11929 3 5.5 3H14.5ZM14.5 4H5.5C4.67157 4 4 4.67157 4 5.5V14.5C4 15.3284 4.67157 16 5.5 16H14.5C15.3284 16 16 15.3284 16 14.5V5.5C16 4.67157 15.3284 4 14.5 4Z" fill="#212121"/>
            </svg>`,
            bottom: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 10C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H6.5C6.22386 11 6 10.7761 6 10.5C6 10.2239 6.22386 10 6.5 10H13.5Z" fill="#212121"/>
                <path d="M13.5 13H6.5C6.22386 13 6 13.2239 6 13.5C6 13.7761 6.22386 14 6.5 14H13.5C13.7761 14 14 13.7761 14 13.5C14 13.2239 13.7761 13 13.5 13Z" fill="#212121"/>
                <path d="M17 14.5C17 15.8807 15.8807 17 14.5 17H5.5C4.11929 17 3 15.8807 3 14.5L3 5.5C3 4.11929 4.11929 3 5.5 3L14.5 3C15.8807 3 17 4.11929 17 5.5V14.5ZM5.5 16H14.5C15.3284 16 16 15.3284 16 14.5V5.5C16 4.67157 15.3284 4 14.5 4H5.5C4.67157 4 4 4.67157 4 5.5L4 14.5C4 15.3284 4.67157 16 5.5 16Z" fill="#212121"/>
            </svg>`,
        };
        return svgIcons[type as keyof typeof svgIcons] || svgIcons.top;
    }

    private init() {
        // Create button container
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ql-valign-custom';
        button.innerHTML = this.getSvgIcon(this.currentValue);
        button.title = 'Vertical Alignment';

        // Style the button
        button.style.cssText = `
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 4px 6px;
            margin: 2px;
            background: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 28px;
            position: relative;
        `;

        // Add hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#f0f0f0';
        });
        button.addEventListener('mouseleave', () => {
            if (!this.isOpen) {
                button.style.backgroundColor = 'white';
            }
        });

        // Handle click to toggle dropdown
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown();
        });

        this.container.appendChild(button);
        this.createDropdown();
    }

    private createDropdown() {
        const dropdown = document.createElement('div');
        dropdown.className = 'ql-valign-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 3px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10001;
            display: none;
            min-width: 32px;
        `;

        const options = [
            { value: 'top', title: 'Align Top' },
            { value: 'middle', title: 'Align Middle' },
            { value: 'bottom', title: 'Align Bottom' },
        ];

        options.forEach((option) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'ql-valign-option';
            optionElement.innerHTML = this.getSvgIcon(option.value);
            optionElement.title = option.title;
            optionElement.style.cssText = `
                padding: 4px 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            `;

            optionElement.addEventListener('mouseenter', () => {
                optionElement.style.backgroundColor = '#f0f0f0';
            });
            optionElement.addEventListener('mouseleave', () => {
                optionElement.style.backgroundColor = 'transparent';
            });

            optionElement.addEventListener('click', () => {
                this.selectValue(option.value);
                this.closeDropdown();
            });

            dropdown.appendChild(optionElement);
        });

        this.container.style.position = 'relative';
        this.container.appendChild(dropdown);
        this.dropdown = dropdown;
    }

    private toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    private openDropdown() {
        if (this.dropdown) {
            this.dropdown.style.display = 'block';
            this.isOpen = true;

            // Close dropdown when clicking outside
            setTimeout(() => {
                document.addEventListener('click', this.closeDropdownHandler);
            }, 100);
        }
    }

    private closeDropdown() {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
            this.isOpen = false;
            document.removeEventListener('click', this.closeDropdownHandler);
        }
    }

    private closeDropdownHandler = (e: Event) => {
        const target = e.target as HTMLElement;
        if (!this.container.contains(target)) {
            this.closeDropdown();
        }
    };

    private selectValue(value: string) {
        this.currentValue = value;
        const button = this.container.querySelector(
            '.ql-valign-custom',
        ) as HTMLElement;
        if (button) {
            button.innerHTML = this.getSvgIcon(value);
        }
        this.onVerticalAlignChange(value);
    }

    public updateValue(verticalAlign: string) {
        this.currentValue = verticalAlign || 'top';
        const button = this.container.querySelector(
            '.ql-valign-custom',
        ) as HTMLElement;
        if (button) {
            button.innerHTML = this.getSvgIcon(this.currentValue);
        }
    }

    /** Remove the document-level listener so the picker can be GC'd on unmount. */
    public destroy() {
        document.removeEventListener('click', this.closeDropdownHandler);
        this.container.innerHTML = '';
    }
}

// Register custom pickers
const registerCustomPickers = (
    quill: Quill,
    onVerticalAlignChange: (align: string) => void,
    currentVerticalAlign: string,
) => {
    const toolbar = getToolbarModule(quill);
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

        // Find the alignment group and add our custom vertical alignment picker
        const allFormatGroups =
            toolbar.container.querySelectorAll('.ql-formats');
        let alignGroup = null;
        for (const group of allFormatGroups) {
            if (group.querySelector('.ql-align')) {
                alignGroup = group;
                break;
            }
        }
        if (alignGroup) {
            // Create custom vertical alignment container
            const vAlignContainer = document.createElement('span');
            vAlignContainer.className = 'ql-valign-container';
            vAlignContainer.style.cssText = `
                display: inline-block;
                position: relative;
                vertical-align: top;
            `;

            // Insert after horizontal alignment picker
            const alignPicker = alignGroup.querySelector('.ql-align');
            if (alignPicker) {
                alignPicker.parentNode?.insertBefore(
                    vAlignContainer,
                    alignPicker.nextSibling,
                );
            } else {
                alignGroup.appendChild(vAlignContainer);
            }

            // Initialize custom vertical alignment picker
            const vAlignPicker = new CustomVerticalAlignPicker(
                vAlignContainer,
                quill,
                onVerticalAlignChange,
            );
            vAlignPicker.updateValue(currentVerticalAlign);

            return vAlignPicker;
        }
    }

    return null;
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
    const toolbar = getToolbarModule(quill).container;
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

    const { handleMouseDown: startDrag, handleClick: dragClick } =
        useDraggableElement({
            element,
            isSelected: isSelected && !isEditing,
            readOnly,
            selectedElementIds,
            slideElements,
            onElementUpdate,
            onMultiElementUpdate,
        });
    const { setActiveEditor } = useTextEditing();
    const vAlignPickerRef = useRef<CustomVerticalAlignPicker | null>(null);

    // Create the Quill instance once, and tear it down on unmount so the
    // editor, its toolbar listeners, and the vertical-align picker's
    // document-level click listener don't leak on every slide switch/delete.
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only setup
    useEffect(() => {
        if (!textRef.current || quillRef.current) return;

        let toolbarEl: HTMLElement | null = null;
        let onToolbarMouseDown: ((e: Event) => void) | null = null;
        let onToolbarClick: ((e: Event) => void) | null = null;

        try {
            const quill = new Quill(textRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: {
                        container: [
                            [{ header: [1, 2, 3, false] }],
                            [{ font: FONT_CSS_VALUES }],
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
                formats: [...QUILL_FORMATS],
            });

            if (content) {
                quill.clipboard.dangerouslyPasteHTML(content);
            }

            const handleVerticalAlignChange = (align: string) => {
                if (onElementUpdate) {
                    onElementUpdate(element.id, {
                        verticalAlign: align as 'top' | 'middle' | 'bottom',
                    });
                }
            };

            vAlignPickerRef.current = registerCustomPickers(
                quill,
                handleVerticalAlignChange,
                verticalAlign || 'top',
            );

            const toolbar = getToolbarModule(quill);
            if (toolbar?.container) {
                toolbarEl = toolbar.container;
                onToolbarClick = (e: Event) => {
                    e.stopPropagation();
                    setPreventBlur(true);
                    setTimeout(() => setPreventBlur(false), 300);
                };
                onToolbarMouseDown = () => setPreventBlur(true);
                toolbarEl.addEventListener(
                    'mousedown',
                    onToolbarMouseDown,
                    true,
                );
                toolbarEl.addEventListener('click', onToolbarClick, false);
            }

            quillRef.current = quill;
        } catch (error) {
            console.error('Failed to initialize Quill editor:', error);
        }

        return () => {
            if (toolbarEl && onToolbarMouseDown) {
                toolbarEl.removeEventListener(
                    'mousedown',
                    onToolbarMouseDown,
                    true,
                );
            }
            if (toolbarEl && onToolbarClick) {
                toolbarEl.removeEventListener('click', onToolbarClick, false);
            }
            vAlignPickerRef.current?.destroy();
            vAlignPickerRef.current = null;
            setActiveEditor(null);
            quillRef.current = null;
            // Quill inserts its `.ql-toolbar` as a sibling of our container in
            // the *parent's* DOM (React only owns the container), so React never
            // removes it on unmount. The orphaned toolbar stays attached and its
            // button listeners retain the whole editor — remove it ourselves.
            toolbarEl?.remove();
        };
    }, []);

    // Enable/disable editing and toggle the toolbar.
    useEffect(() => {
        if (!quillRef.current) return;
        if (isEditing) {
            quillRef.current.enable();
            const toolbar = getToolbarModule(quillRef.current);
            if (toolbar?.container) {
                toolbar.container.style.display = 'block';
            }
            setActiveEditor(quillRef.current);
            setPreventBlur(true);
            setTimeout(() => {
                setPreventBlur(false);
                quillRef.current?.focus();
            }, 200);
        } else {
            quillRef.current.disable();
            const toolbar = getToolbarModule(quillRef.current);
            if (toolbar?.container) {
                toolbar.container.style.display = 'none';
            }
            setActiveEditor(null);
        }
    }, [isEditing, setActiveEditor]);

    useEffect(() => {
        // Don't re-paste while the user is actively editing: an external
        // content change (another element committing a drag, or an agent edit)
        // would reset the editor and jump the cursor, dropping in-progress
        // typing. Pending external changes apply when editing ends (isEditing
        // is a dependency, so this re-runs then).
        if (!quillRef.current || isEditing) return;
        if (content && quillRef.current.root.innerHTML !== content) {
            quillRef.current.clipboard.dangerouslyPasteHTML(content);
        }
    }, [content, isEditing]);

    // Update vertical alignment picker when element's vertical alignment changes
    useEffect(() => {
        if (vAlignPickerRef.current) {
            vAlignPickerRef.current.updateValue(verticalAlign || 'top');
        }
    }, [verticalAlign]);

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
                    const toolbar = getToolbarModule(quillRef.current);
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

    // Guard the shared drag hook: never drag from the toolbar or while editing.
    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly || isEditing) return;
        if ((e.target as HTMLElement)?.closest('.ql-toolbar')) return;
        startDrag(e);
    };

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

        // When editing text, allow normal copy/paste operations and prevent element-level copying
        if (
            isEditing &&
            (e.ctrlKey || e.metaKey) &&
            (e.key === 'c' || e.key === 'v' || e.key === 'x')
        ) {
            // Stop propagation to prevent the global keyboard handler from interfering
            e.stopPropagation();
            // Allow default behavior for text operations within the editor
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || isEditing) return;
        if ((e.target as HTMLElement)?.closest('.ql-toolbar')) return;
        dragClick(e, onClick);
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
                        marginBottom: `${HEADER_LINE_SPACING.h1} !important`,
                    },
                    '& h2': {
                        fontSize: `${HEADER_FONT_SIZES.h2} !important`,
                        fontWeight: 'bold !important',
                        margin: '0 !important',
                        marginBottom: `${HEADER_LINE_SPACING.h2} !important`,
                    },
                    '& h3': {
                        fontSize: `${HEADER_FONT_SIZES.h3} !important`,
                        fontWeight: 'bold !important',
                        margin: '0 !important',
                        marginBottom: `${HEADER_LINE_SPACING.h3} !important`,
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
                fontSize: DEFAULT_TEXT_FONT_SIZE,
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
