import { act, renderHook } from '@testing-library/react';
import type {
    ContentElement,
    TextBox,
} from '../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../common/utils/constants';
import { useDraggableElement } from './useDraggableElement';

// Render the slide at half size so 1 screen px = 2 slide units.
const SCALE = 0.5;

function makeTextbox(id: string, x: number, y: number): TextBox {
    return {
        id,
        type: 'textbox',
        position: { x, y },
        size: { width: 100, height: 40 },
        content: '',
    } as TextBox;
}

function setupContainer(): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('data-slide-container', '');
    container.getBoundingClientRect = () =>
        ({ width: PRESENTATION_DIMENSIONS.WIDTH * SCALE }) as DOMRect;
    const child = document.createElement('div');
    container.appendChild(child);
    document.body.appendChild(container);
    return child;
}

function mouseDownOn(node: HTMLElement, clientX: number, clientY: number) {
    return {
        clientX,
        clientY,
        currentTarget: node,
        stopPropagation: () => {},
    } as unknown as React.MouseEvent;
}

describe('useDraggableElement', () => {
    let rafSpy: jest.SpyInstance;

    beforeEach(() => {
        // Run the rAF-throttled apply synchronously.
        rafSpy = jest
            .spyOn(window, 'requestAnimationFrame')
            .mockImplementation((cb: FrameRequestCallback) => {
                cb(0);
                return 0;
            });
    });

    afterEach(() => {
        rafSpy.mockRestore();
        document.body.innerHTML = '';
    });

    it('moves a single element by the screen delta divided by scale', () => {
        const element = makeTextbox('a', 200, 100);
        const onElementUpdate = jest.fn();
        const node = setupContainer();

        const { result } = renderHook(() =>
            useDraggableElement({
                element,
                isSelected: true,
                readOnly: false,
                selectedElementIds: ['a'],
                slideElements: [element],
                onElementUpdate,
            }),
        );

        act(() => {
            result.current.handleMouseDown(mouseDownOn(node, 100, 100));
        });
        act(() => {
            // 40px right / 20px down on screen -> 80 / 40 slide units at 0.5.
            document.dispatchEvent(
                new MouseEvent('mousemove', { clientX: 140, clientY: 120 }),
            );
        });

        expect(onElementUpdate).toHaveBeenCalledWith('a', {
            position: { x: 280, y: 140 },
        });
    });

    it('ignores movement below the drag threshold (a click)', () => {
        const element = makeTextbox('a', 0, 0);
        const onElementUpdate = jest.fn();
        const node = setupContainer();

        const { result } = renderHook(() =>
            useDraggableElement({
                element,
                isSelected: true,
                readOnly: false,
                selectedElementIds: ['a'],
                slideElements: [element],
                onElementUpdate,
            }),
        );

        act(() => {
            result.current.handleMouseDown(mouseDownOn(node, 100, 100));
        });
        act(() => {
            document.dispatchEvent(
                new MouseEvent('mousemove', { clientX: 101, clientY: 101 }),
            );
        });

        expect(onElementUpdate).not.toHaveBeenCalled();
    });

    it('translates a multi-selection rigidly by the same slide delta', () => {
        const a = makeTextbox('a', 200, 100);
        const b = makeTextbox('b', 500, 300);
        const onMultiElementUpdate = jest.fn();
        const node = setupContainer();

        const { result } = renderHook(() =>
            useDraggableElement({
                element: a,
                isSelected: true,
                readOnly: false,
                selectedElementIds: ['a', 'b'],
                slideElements: [a, b] as ContentElement[],
                onElementUpdate: jest.fn(),
                onMultiElementUpdate,
            }),
        );

        act(() => {
            result.current.handleMouseDown(mouseDownOn(node, 0, 0));
        });
        act(() => {
            document.dispatchEvent(
                new MouseEvent('mousemove', { clientX: 50, clientY: 0 }),
            );
        });

        // 50px screen / 0.5 = 100 slide units, applied to both from their starts.
        expect(onMultiElementUpdate).toHaveBeenCalledWith(
            'a',
            { position: { x: 300, y: 100 } },
            [
                { elementId: 'a', updates: { position: { x: 300, y: 100 } } },
                { elementId: 'b', updates: { position: { x: 600, y: 300 } } },
            ],
        );
    });

    it('does not drag when not selected', () => {
        const element = makeTextbox('a', 0, 0);
        const onElementUpdate = jest.fn();
        const node = setupContainer();

        const { result } = renderHook(() =>
            useDraggableElement({
                element,
                isSelected: false,
                readOnly: false,
                selectedElementIds: ['a'],
                slideElements: [element],
                onElementUpdate,
            }),
        );

        act(() => {
            result.current.handleMouseDown(mouseDownOn(node, 100, 100));
        });
        act(() => {
            document.dispatchEvent(
                new MouseEvent('mousemove', { clientX: 200, clientY: 200 }),
            );
        });

        expect(onElementUpdate).not.toHaveBeenCalled();
    });
});
