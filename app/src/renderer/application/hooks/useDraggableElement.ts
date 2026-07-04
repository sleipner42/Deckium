import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentElement } from '../../../common/domain/entities/types';
import {
    getRenderedScale,
    getSlideContainer,
    screenDeltaToSlide,
} from '../utils/coordinates';

// Screen pixels the pointer must travel before a press becomes a drag. Below
// this it's treated as a click (replaces the old setTimeout(setHasDragged)).
const DRAG_THRESHOLD_PX = 3;

type ElementUpdate = { elementId: string; updates: Partial<ContentElement> };
type PositionUpdate = { position: { x: number; y: number } };

interface UseDraggableElementArgs {
    element: ContentElement;
    isSelected: boolean;
    readOnly: boolean;
    selectedElementIds: string[];
    slideElements: ContentElement[];
    // Drag only ever updates position; the minimal type keeps this assignable
    // from element-specific callbacks like (id, updates: Partial<Image>).
    onElementUpdate?: (elementId: string, updates: PositionUpdate) => void;
    onMultiElementUpdate?: (
        primaryElementId: string,
        primaryUpdates: Partial<ContentElement>,
        allUpdates: ElementUpdate[],
    ) => void;
}

interface DragSession {
    startMouse: { x: number; y: number };
    scale: number;
    // Slide-unit start positions of every element that moves this gesture.
    startPositions: Map<string, { x: number; y: number }>;
}

/**
 * Shared drag behaviour for every slide element. Converts screen-pixel pointer
 * movement into slide-unit position updates using the measured render scale
 * (see utils/coordinates), so dragging tracks the cursor 1:1 at any zoom.
 * Handles single- and multi-element moves and click-vs-drag disambiguation.
 */
export function useDraggableElement({
    element,
    isSelected,
    readOnly,
    selectedElementIds,
    slideElements,
    onElementUpdate,
    onMultiElementUpdate,
}: UseDraggableElementArgs) {
    const [isDragging, setIsDragging] = useState(false);
    const session = useRef<DragSession | null>(null);
    // Whether the current press has crossed the drag threshold. Reset on every
    // mousedown (even when not draggable) so a click after a drag still selects.
    const movedRef = useRef(false);

    // Keep callbacks/inputs in refs so the move handler never goes stale and we
    // don't re-subscribe listeners mid-gesture.
    const latest = useRef({
        element,
        selectedElementIds,
        slideElements,
        onElementUpdate,
        onMultiElementUpdate,
    });
    useEffect(() => {
        latest.current = {
            element,
            selectedElementIds,
            slideElements,
            onElementUpdate,
            onMultiElementUpdate,
        };
    });

    // Cleanup for the in-flight gesture's document listeners.
    const dragCleanup = useRef<(() => void) | null>(null);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            movedRef.current = false;
            if (readOnly || !isSelected) return;
            e.stopPropagation();

            const container = getSlideContainer(e.currentTarget as HTMLElement);
            const scale = getRenderedScale(container);

            const {
                element: el,
                selectedElementIds: ids,
                slideElements: els,
            } = latest.current;

            // Snapshot start positions for every element that will move so the
            // group translates rigidly and per-frame math has no drift.
            const startPositions = new Map<string, { x: number; y: number }>();
            const moversIds = ids.length > 1 ? ids : [el.id];
            for (const id of moversIds) {
                const target = els.find((candidate) => candidate.id === id);
                if (target) {
                    startPositions.set(id, {
                        x: target.position.x,
                        y: target.position.y,
                    });
                }
            }
            if (!startPositions.has(el.id)) {
                startPositions.set(el.id, {
                    x: el.position.x,
                    y: el.position.y,
                });
            }

            session.current = {
                startMouse: { x: e.clientX, y: e.clientY },
                scale,
                startPositions,
            };
            setIsDragging(true);

            // Attach listeners synchronously (not via an effect) so no pointer
            // movement between mousedown and the next render is lost.
            let rafId: number | null = null;
            let pending: MouseEvent | null = null;

            const apply = () => {
                rafId = null;
                const s = session.current;
                const ev = pending;
                pending = null;
                if (!s || !ev) return;

                const rawDx = ev.clientX - s.startMouse.x;
                const rawDy = ev.clientY - s.startMouse.y;
                if (
                    !movedRef.current &&
                    Math.hypot(rawDx, rawDy) < DRAG_THRESHOLD_PX
                ) {
                    return;
                }
                movedRef.current = true;

                const delta = screenDeltaToSlide(rawDx, rawDy, s.scale);
                const {
                    element: current,
                    selectedElementIds: currentIds,
                    onElementUpdate: onUpdate,
                    onMultiElementUpdate: onMultiUpdate,
                } = latest.current;

                const posOf = (
                    id: string,
                    fallback: { x: number; y: number },
                ) => {
                    const start = s.startPositions.get(id) ?? fallback;
                    return { x: start.x + delta.x, y: start.y + delta.y };
                };

                const primaryPos = posOf(current.id, current.position);

                if (currentIds.length > 1 && onMultiUpdate) {
                    const allUpdates: ElementUpdate[] = currentIds
                        .filter((id) => s.startPositions.has(id))
                        .map((id) => ({
                            elementId: id,
                            updates: { position: posOf(id, current.position) },
                        }));
                    onMultiUpdate(
                        current.id,
                        { position: primaryPos },
                        allUpdates,
                    );
                } else if (onUpdate) {
                    onUpdate(current.id, { position: primaryPos });
                }
            };

            const onMove = (ev: MouseEvent) => {
                pending = ev;
                if (rafId === null) rafId = requestAnimationFrame(apply);
            };
            const cleanup = () => {
                if (rafId !== null) cancelAnimationFrame(rafId);
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                dragCleanup.current = null;
            };
            const onUp = () => {
                cleanup();
                setIsDragging(false);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            dragCleanup.current = cleanup;
        },
        [readOnly, isSelected],
    );

    // Tear down a gesture that's still in flight if the element unmounts.
    useEffect(() => () => dragCleanup.current?.(), []);

    const handleClick = useCallback(
        (e: React.MouseEvent, onClick?: (event?: React.MouseEvent) => void) => {
            if (readOnly) return;
            e.stopPropagation();
            // A gesture that never crossed the threshold is a click.
            if (!movedRef.current && onClick) {
                onClick(e);
            }
        },
        [readOnly],
    );

    return { isDragging, handleMouseDown, handleClick };
}
