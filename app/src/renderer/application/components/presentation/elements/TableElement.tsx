import Quill from 'quill';
import React, { useEffect, useRef, useState } from 'react';
import {
    ContentElement,
    Table,
    TableCell,
} from '../../../../../common/domain/entities/types';
import { useDraggableElement } from '../../../hooks/useDraggableElement';
import { ResizeHandles } from '../ResizeHandles';

interface TableElementProps {
    element: Table;
    isSelected: boolean;
    isEditing: boolean;
    onClick?: (event?: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onElementUpdate?: (elementId: string, updates: Partial<Table>) => void;
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
    onStartEditing?: () => void;
    onStopEditing?: () => void;
    readOnly?: boolean;
}

// Compact rich-text toolbar for a single cell. Only one CellEditor is mounted
// at a time (the cell being edited), so this is a bounded Quill footprint.
const CELL_TOOLBAR = [
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ['clean'],
];
const CELL_FORMATS = [
    'bold',
    'italic',
    'underline',
    'color',
    'background',
    'align',
    'link',
];

interface CellEditorProps {
    initialHtml: string;
    onCommit: (html: string) => void;
}

// A single-cell Quill editor. Commits on Escape or a click outside the editor;
// tears down leak-safely (Quill inserts its `.ql-toolbar` as a sibling in the
// parent DOM that React never removes — see TextElement's destroy note).
const CellEditor: React.FC<CellEditorProps> = ({ initialHtml, onCommit }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const committedRef = useRef(false);
    const onCommitRef = useRef(onCommit);
    onCommitRef.current = onCommit;

    useEffect(() => {
        if (!hostRef.current || quillRef.current) return;

        const quill = new Quill(hostRef.current, {
            theme: 'snow',
            modules: { toolbar: CELL_TOOLBAR },
            formats: [...CELL_FORMATS],
        });
        if (initialHtml) {
            quill.clipboard.dangerouslyPasteHTML(initialHtml);
        }
        quill.focus();
        quill.setSelection(quill.getLength(), 0);
        quillRef.current = quill;

        const toolbar = quill.getModule('toolbar') as
            | { container: HTMLElement }
            | undefined;
        const toolbarEl = toolbar?.container ?? null;

        const commit = () => {
            if (committedRef.current) return;
            committedRef.current = true;
            onCommitRef.current(quill.root.innerHTML);
        };

        // Commit when focus leaves the editor+toolbar for good.
        const onDocMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                wrapRef.current?.contains(target) ||
                toolbarEl?.contains(target)
            ) {
                return;
            }
            commit();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                commit();
            }
        };
        document.addEventListener('mousedown', onDocMouseDown, true);
        hostRef.current.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onDocMouseDown, true);
            quillRef.current = null;
            // Remove the orphaned toolbar Quill inserted as our sibling.
            toolbarEl?.remove();
        };
    }, []);

    return (
        <div
            ref={wrapRef}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                background: 'white',
                overflow: 'visible',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div ref={hostRef} style={{ height: '100%' }} />
        </div>
    );
};

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0) || 1;

const TableElementComponent: React.FC<TableElementProps> = ({
    element,
    isSelected,
    isEditing,
    onClick,
    onContextMenu,
    onElementUpdate,
    onMultiElementUpdate,
    selectedElementIds = [],
    slideElements = [],
    onStartEditing,
    onStopEditing,
    readOnly = false,
}) => {
    const {
        position,
        size,
        rows,
        columnWidths,
        rowHeights,
        headerRow,
        borderColor = '#000000',
        borderWidth = 1,
        headerBackgroundColor,
        style,
    } = element;

    const [editing, setEditing] = useState<{ r: number; c: number } | null>(
        null,
    );

    const { handleMouseDown, handleClick } = useDraggableElement({
        element,
        isSelected,
        readOnly,
        selectedElementIds,
        slideElements,
        onElementUpdate,
        onMultiElementUpdate,
    });

    const totalCols = sum(columnWidths);
    const totalRows = sum(rowHeights);

    const commitCell = (r: number, c: number, html: string) => {
        setEditing(null);
        onStopEditing?.();
        if (readOnly || !onElementUpdate) return;
        const current = rows[r]?.[c]?.content ?? '';
        if (html === current) return;
        const nextRows = rows.map((row, ri) =>
            row.map((cell, ci) =>
                ri === r && ci === c ? { ...cell, content: html } : cell,
            ),
        );
        onElementUpdate(element.id, { rows: nextRows });
    };

    const startEdit = (r: number, c: number) => {
        if (readOnly) return;
        setEditing({ r, c });
        onStartEditing?.();
    };

    return (
        <div
            data-element-id={element.id}
            data-element-type="table"
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                cursor: readOnly ? 'default' : isSelected ? 'move' : 'pointer',
                outline: isSelected ? '2px solid #0066ff' : 'none',
                outlineOffset: '2px',
                ...style,
            }}
            onClick={(e) => handleClick(e, onClick)}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
        >
            <table
                style={{
                    width: '100%',
                    height: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                }}
            >
                <colgroup>
                    {columnWidths.map((w, ci) => (
                        <col
                            key={ci}
                            style={{ width: `${(w / totalCols) * 100}%` }}
                        />
                    ))}
                </colgroup>
                <tbody>
                    {rows.map((row, ri) => {
                        const isHeader = headerRow && ri === 0;
                        return (
                            <tr
                                key={ri}
                                style={{
                                    height: `${((rowHeights[ri] ?? 1) / totalRows) * 100}%`,
                                }}
                            >
                                {row.map((cell: TableCell, ci: number) => {
                                    const cellBg =
                                        cell.backgroundColor ??
                                        (isHeader
                                            ? headerBackgroundColor
                                            : undefined);
                                    const isEditingCell =
                                        editing?.r === ri && editing?.c === ci;
                                    return (
                                        <td
                                            key={ci}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(ri, ci);
                                            }}
                                            style={{
                                                border: `${borderWidth}px solid ${borderColor}`,
                                                padding: '4px 8px',
                                                verticalAlign: 'middle',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                fontWeight: isHeader
                                                    ? 'bold'
                                                    : undefined,
                                                backgroundColor: cellBg,
                                            }}
                                        >
                                            {isEditingCell ? (
                                                <CellEditor
                                                    initialHtml={cell.content}
                                                    onCommit={(html) =>
                                                        commitCell(ri, ci, html)
                                                    }
                                                />
                                            ) : (
                                                <div
                                                    className="ql-editor"
                                                    style={{
                                                        padding: 0,
                                                        minHeight: 0,
                                                    }}
                                                    // biome-ignore lint/security/noDangerouslySetInnerHtml: cell HTML is sanitized on write (agent tools + Quill)
                                                    dangerouslySetInnerHTML={{
                                                        __html:
                                                            cell.content || '',
                                                    }}
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

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
                minWidth={80}
                minHeight={40}
            />
        </div>
    );
};

export const TableElement = React.memo(TableElementComponent);
