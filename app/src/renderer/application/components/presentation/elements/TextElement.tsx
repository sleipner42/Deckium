import React, { useRef, useEffect, useState } from 'react';
import Quill from 'quill';
import { TextBox } from '../../../../../common/domain/entities/types';
import { useTextEditing } from '../../../context/TextEditingContext';
import { ResizeHandles } from '../ResizeHandles';

interface TextElementProps {
  element: TextBox;
  onClick: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
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
    color,
    style,
    backgroundColor,
    backgroundOpacity,
    borderRadius,
    align,
    verticalAlign,
    zIndex,
  } = element;
  const textRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [preventBlur, setPreventBlur] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { setActiveEditor } = useTextEditing();

  useEffect(() => {
    if (textRef.current && !quillRef.current) {
      // Initialize Quill once and keep it persistent
      try {
        const quill = new Quill(textRef.current, {
          theme: 'snow',
          modules: {
            toolbar: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['link'],
              [{ align: [] }],
              ['clean'],
            ],
          },
          formats: [
            'header',
            'bold',
            'italic',
            'underline',
            'strike',
            'list',
            'bullet',
            'link',
            'align',
          ],
        });

        // Set initial content
        if (content) {
          quill.clipboard.dangerouslyPasteHTML(content);
        }

        // Handle content changes
        quill.on('text-change', () => {
          if (onElementUpdate && quillRef.current) {
            const html = quillRef.current.root.innerHTML;
            onElementUpdate(element.id, { content: html });
          }
        });

        // Add event listeners to toolbar to prevent blur without blocking Quill functionality
        const toolbar = quill.getModule('toolbar');
        if (toolbar && toolbar.container) {
          const handleToolbarClick = (e: Event) => {
            // Stop propagation and set preventBlur immediately on click
            e.stopPropagation();
            setPreventBlur(true);

            // Reset preventBlur after Quill has had time to process
            setTimeout(() => setPreventBlur(false), 300);
          };

          const handleToolbarMouseDown = (e: Event) => {
            // Prevent document click detection
            setPreventBlur(true);
          };

          // Handle both mousedown and click to ensure toolbar stays visible
          toolbar.container.addEventListener(
            'mousedown',
            handleToolbarMouseDown,
            true,
          );
          toolbar.container.addEventListener(
            'click',
            handleToolbarClick,
            false,
          ); // Use false to let Quill handle it first
        }

        quillRef.current = quill;
      } catch (error) {
        console.error('Failed to initialize Quill editor:', error);
      }
    }

    // Toggle editing mode
    if (quillRef.current) {
      if (isEditing) {
        quillRef.current.enable();
        const toolbar = quillRef.current.getModule('toolbar');
        if (toolbar && toolbar.container) {
          toolbar.container.style.display = 'block';
        }
        setActiveEditor(quillRef.current); // Register this editor as active
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
        if (toolbar && toolbar.container) {
          toolbar.container.style.display = 'none';
        }
        setActiveEditor(null); // Unregister the editor
      }
    }
  }, [
    isEditing,
    content,
    element.id,
    onElementUpdate,
    onStopEditing,
    preventBlur,
  ]);

  // Document-level click detection for exiting edit mode
  useEffect(() => {
    if (!isEditing) return;

    const handleDocumentClick = (e: MouseEvent) => {
      // Use a small delay to ensure preventBlur state is properly set
      setTimeout(() => {
        if (preventBlur) return;

        const target = e.target as HTMLElement;
        const quillContainer = textRef.current;

        // Check if click is within the Quill editor
        const isWithinQuill = quillContainer && quillContainer.contains(target);

        // Get toolbar directly from Quill instance for more reliable detection
        let isWithinToolbar = false;
        if (quillRef.current) {
          const toolbar = quillRef.current.getModule('toolbar');
          if (toolbar && toolbar.container) {
            isWithinToolbar = toolbar.container.contains(target);
          }
        }

        // More comprehensive toolbar element detection
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
          (target?.tagName === 'svg' && target?.closest('.ql-toolbar'));

        // If click is outside editor, toolbar container, and toolbar elements, exit editing
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

    // Add listener with a small delay to avoid immediate triggering
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

    // Don't interfere with toolbar clicks
    const target = e.target as HTMLElement;
    if (target?.closest('.ql-toolbar')) {
      return;
    }

    if (isSelected && !isEditing) {
      e.stopPropagation();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && onElementUpdate) {
        onElementUpdate(element.id, {
          position: {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
          },
        });
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
  }, [isDragging, dragOffset, element.id, onElementUpdate]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;

    e.stopPropagation();
    onStartEditing();
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Simplified blur handler since we primarily use document click detection
    // This handles keyboard navigation cases
    if (!preventBlur && isEditing && quillRef.current) {
      const relatedTarget = e.relatedTarget as HTMLElement;

      // Only exit if focus goes to something completely unrelated
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

    // Don't interfere with toolbar clicks
    const target = e.target as HTMLElement;
    if (target?.closest('.ql-toolbar')) {
      return;
    }

    e.stopPropagation();
    if (!isEditing) {
      onClick();
    }
  };

  const renderContent = () => {
    // Always return the Quill container - it will be enabled/disabled based on editing state
    return <div style={{ height: '100%', width: '100%' }} />;
  };

  const getVerticalAlignment = () => {
    switch (verticalAlign) {
      case 'middle':
        return 'center';
      case 'bottom':
        return 'flex-end';
      case 'top':
      default:
        return 'flex-start';
    }
  };

  return (
    <div
      ref={textRef}
      data-element-id={element.id}
      data-element-type="textbox"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        minHeight: `${size.height}px`,
        height: `${size.height}px`,
        color,
        cursor: readOnly
          ? 'default'
          : isEditing
            ? 'text'
            : isSelected
              ? 'move'
              : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems:
          align === 'center'
            ? 'center'
            : align === 'right'
              ? 'flex-end'
              : 'flex-start',
        justifyContent: getVerticalAlignment(),
        userSelect: isEditing ? 'text' : 'none',
        outline: isSelected && !isEditing ? '2px solid #0066ff' : 'none',
        outlineOffset: '2px',
        padding: '0',
        border: 'none',
        backgroundColor: backgroundColor || 'transparent',
        opacity: backgroundOpacity !== undefined ? backgroundOpacity : 1,
        borderRadius:
          borderRadius !== undefined ? `${borderRadius}px` : undefined,
        textAlign: align || 'left',
        zIndex: zIndex || 1,
        ...style,
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
    </div>
  );
};
