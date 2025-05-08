import React, { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { TextBox } from '../../../../../common/domain/entities/types';

const ReactMarkdownWithPlugins = lazy(() =>
  Promise.all([import('react-markdown'), import('remark-gfm')]).then(
    ([reactMarkdown, remarkGfm]) => {
      const ReactMarkdown = reactMarkdown.default;
      const gfm = remarkGfm.default;

      return {
        default: (props: any) => (
          <ReactMarkdown remarkPlugins={[gfm]} {...props} />
        ),
      };
    },
  ),
);

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
  const [preventBlur, setPreventBlur] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);

      setPreventBlur(true);
      const timer = setTimeout(() => {
        setPreventBlur(false);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;

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
    if (!preventBlur && isEditing) {
      const newContent = textRef.current?.innerText ?? content;
      onStopEditing(newContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      if (range) {
        const lineBreak = document.createTextNode('\n');
        range.insertNode(lineBreak);
        range.setStartAfter(lineBreak);
        range.setEndAfter(lineBreak);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      e.stopPropagation();
    }

    if (e.key === 'Escape') {
      setPreventBlur(false);
      textRef.current?.blur();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) return;

    e.stopPropagation();
    if (!isEditing) {
      onClick();
    }
  };

  const renderDisplayContent = () => {
    if (isEditing) {
      return content.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </React.Fragment>
      ));
    }

    return (
      <Suspense
        fallback={
          <div>
            {content.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {index > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </div>
        }
      >
        <ReactMarkdownWithPlugins
          components={{
            p: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <p style={{ margin: 0 }} {...props} />
            ),
            a: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <a style={{ color: 'inherit' }} {...props} />
            ),
            ul: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <ul
                style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}
                {...props}
              />
            ),
            ol: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <ol
                style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}
                {...props}
              />
            ),
            h1: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <h1 style={{ margin: '0.2em 0', fontSize: '1.5em' }} {...props} />
            ),
            h2: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <h2 style={{ margin: '0.2em 0', fontSize: '1.3em' }} {...props} />
            ),
            h3: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <h3 style={{ margin: '0.2em 0', fontSize: '1.2em' }} {...props} />
            ),
            h4: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <h4 style={{ margin: '0.2em 0', fontSize: '1.1em' }} {...props} />
            ),
            h5: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <h5 style={{ margin: '0.2em 0', fontSize: '1em' }} {...props} />
            ),
            h6: ({ node, ...props }: { node: any; [key: string]: any }) => (
              <h6 style={{ margin: '0.2em 0', fontSize: '0.9em' }} {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdownWithPlugins>
      </Suspense>
    );
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
        outline: isSelected ? '2px solid #0066ff' : 'none',
        outlineOffset: '2px',
        padding: '4px',
        border: isEditing ? '1px solid #ddd' : 'none',
        backgroundColor: isEditing ? 'white' : backgroundColor || 'transparent',
        opacity: backgroundOpacity !== undefined ? backgroundOpacity : 1,
        borderRadius:
          borderRadius !== undefined ? `${borderRadius}px` : undefined,
        boxShadow: isEditing ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
        whiteSpace: isEditing ? 'pre-wrap' : 'normal',
        textAlign: align || 'left',
        zIndex: zIndex || 1,
        ...style,
      }}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {renderDisplayContent()}
    </div>
  );
};
