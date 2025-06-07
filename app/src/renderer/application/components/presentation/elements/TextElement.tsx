import React, { useRef, useEffect, useState } from 'react';
import Quill from 'quill';
import { TextBox } from '../../../../../common/domain/entities/types';
import { useTextEditing } from '../../../context/TextEditingContext';

interface TextElementProps {
  element: TextBox;
  onClick: () => void;
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
    fontSize,
    fontFamily,
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
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['link'],
              [{ 'align': [] }],
              ['clean']
            ],
          },
          formats: [
            'header', 'bold', 'italic', 'underline', 'strike',
            'list', 'bullet', 'link', 'align'
          ]
        });

        // Set initial content
        if (content) {
          quill.root.innerHTML = content;
        }

        // Handle content changes
        quill.on('text-change', () => {
          if (onElementUpdate && quillRef.current) {
            const html = quillRef.current.root.innerHTML;
            onElementUpdate(element.id, { content: html });
          }
        });

        // Handle blur events - check for toolbar interactions
        quill.on('selection-change', (range) => {
          if (!range && !preventBlur && isEditing && quillRef.current) {
            // Small delay to allow for focus transitions
            setTimeout(() => {
              if (!quillRef.current || !isEditing) return;
              
              // Check if focus is still within the editor or toolbar
              const activeElement = document.activeElement;
              const quillContainer = textRef.current;
              const isToolbarElement = activeElement?.closest('.ql-toolbar');
              
              if (quillContainer && !quillContainer.contains(activeElement) && !isToolbarElement) {
                onStopEditing(quillRef.current.root.innerHTML);
              }
            }, 100);
          }
        });

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
  }, [isEditing, content, element.id, onElementUpdate, onStopEditing, preventBlur]);

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
    // Don't exit if clicking within the Quill editor or toolbar
    if (!preventBlur && isEditing && quillRef.current) {
      const relatedTarget = e.relatedTarget as HTMLElement;
      const quillContainer = textRef.current;
      
      // Check if the new focus target is within Quill or is a toolbar element
      const isWithinQuill = quillContainer && quillContainer.contains(relatedTarget);
      const isToolbarElement = relatedTarget?.closest('.ql-toolbar');
      
      if (!isWithinQuill && !isToolbarElement) {
        // Add a small delay to allow for focus transitions
        setTimeout(() => {
          if (quillRef.current && isEditing) {
            onStopEditing(quillRef.current.root.innerHTML);
          }
        }, 50);
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
        fontSize: `${fontSize}px`,
        fontFamily,
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
    >
      {renderContent()}
    </div>
  );
};
