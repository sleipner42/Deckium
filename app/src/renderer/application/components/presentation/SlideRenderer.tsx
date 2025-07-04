import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    cloneElements,
    createImage,
} from '../../../../common/domain/entities/element-factory';
import {
    BarChart,
    ContentElement,
    Graph,
    Image as ImageType,
    Plot,
    Shape,
    Slide,
    TextBox,
} from '../../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../../common/utils/constants';
import { usePresentation } from '../../context/PresentationContext';
import { useSnapSystem } from '../../hooks/useSnapSystem';
import { BarChartPropertiesDialog } from './BarChartPropertiesDialog';
import { ElementContextMenu } from './ElementContextMenu';
import { BarChartElement } from './elements/BarChartElement';
import { GraphElement } from './elements/GraphElement';
import { ImageElement } from './elements/ImageElement';
import { PlotElement } from './elements/PlotElement';
import { ShapeElement } from './elements/ShapeElement';
import { TextElement } from './elements/TextElement';
import { ShapePropertiesDialog } from './ShapePropertiesDialog';
import { SlideContextMenu } from './SlideContextMenu';
import { SlidePropertiesDialog } from './SlidePropertiesDialog';
import { SnapGuides } from './SnapGuides';

interface SlideRendererProps {
    slide: Slide;
    style?: React.CSSProperties;
    className?: string;
    readOnly?: boolean;
    scale?: number;
    maintainAspectRatio?: boolean;
    selectableElements?: boolean;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
    slide,
    style,
    className,
    readOnly = false,
    scale = 1,
    maintainAspectRatio = true,
    selectableElements = true,
}) => {
    const {
        updateElement,
        updateSlide,
        selectedElementId,
        selectedElementIds,
        editingElementId,
        selectElement,
        selectMultipleElements,
        toggleElementSelection,
        clearElementSelection,
        startEditingElement,
        stopEditingElement,
    } = usePresentation();

    // Define helper functions to use PresentationContext state
    const isSelected = (elementId: string): boolean => {
        return selectedElementIds.includes(elementId);
    };

    const isEditing = (elementId: string): boolean => {
        return editingElementId === elementId;
    };

    // Initialize snap system
    const { activeGuides, calculateSnapPosition, clearGuides } = useSnapSystem({
        elements: slide.elements,
        slideWidth: PRESENTATION_DIMENSIONS.WIDTH,
        slideHeight: PRESENTATION_DIMENSIONS.HEIGHT,
        config: {
            tolerance: 8,
            enableEdgeSnapping: true,
            enableCenterSnapping: true,
            enableDistributionSnapping: false, // Can be enabled later
        },
    });

    // Track mouse state for debounced updates
    const [isMouseDown, setIsMouseDown] = useState(false);
    const pendingUpdatesRef = useRef<{
        [elementId: string]: Partial<ContentElement>;
    }>({});

    // Enhanced updateElement with snap support and debounced history
    const updateElementWithSnap = (
        elementId: string,
        updates: Partial<ContentElement>,
    ) => {
        const element = slide.elements.find((el) => el.id === elementId);
        if (!element) return;

        // If we're updating position and not in read-only mode, apply snapping
        if (updates.position && !readOnly) {
            const snapResult = calculateSnapPosition(element, updates.position);
            updates.position = snapResult.position;
        }

        // If mouse is down, skip history to avoid flooding undo stack
        const skipHistory = isMouseDown;
        updateElement(elementId, updates, skipHistory);

        // Track pending updates for final history save
        if (isMouseDown) {
            pendingUpdatesRef.current[elementId] = {
                ...pendingUpdatesRef.current[elementId],
                ...updates,
            };
        }
    };

    // Save final state to history when mouse is released
    const handleMouseUp = useCallback(() => {
        if (isMouseDown && Object.keys(pendingUpdatesRef.current).length > 0) {
            // Save final state with history
            Object.entries(pendingUpdatesRef.current).forEach(
                ([elementId, updates]) => {
                    updateElement(elementId, updates, false); // Save to history
                },
            );
            pendingUpdatesRef.current = {};
        }
        setIsMouseDown(false);

        // Clear snap guides
        setTimeout(() => {
            clearGuides();
        }, 0);
    }, [isMouseDown, updateElement, clearGuides]);

    const handleMouseDown = useCallback(() => {
        setIsMouseDown(true);
    }, []);

    // Add mouse event listeners for debounced updates
    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [handleMouseUp, handleMouseDown]);

    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        elementId: string;
    } | null>(null);

    const [slideContextMenu, setSlideContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);

    const [propertiesDialog, setPropertiesDialog] = useState<{
        open: boolean;
        elementId: string | null;
    }>({ open: false, elementId: null });

    const [chartPropertiesDialog, setChartPropertiesDialog] = useState<{
        open: boolean;
        elementId: string | null;
    }>({ open: false, elementId: null });

    const [slidePropertiesDialog, setSlidePropertiesDialog] = useState<{
        open: boolean;
    }>({ open: false });

    const [canPasteElements, setCanPasteElements] = useState(false);

    // Check clipboard for valid elements when opening context menu
    const checkClipboardForElements = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const elementData = JSON.parse(text);
            setCanPasteElements(
                elementData.type === 'kraftpo-elements' && elementData.elements,
            );
        } catch (error) {
            setCanPasteElements(false);
        }
    };

    useEffect(() => {
        if (readOnly) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent deletion if focus is on an input, textarea, or contenteditable element
            const activeElement = document.activeElement;
            const isInputFocused =
                activeElement &&
                (activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true');

            // Handle Copy (Ctrl+C or Cmd+C)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (selectedElementIds.length > 0 && selectableElements) {
                    e.preventDefault();
                    const selectedElements = slide.elements.filter((element) =>
                        selectedElementIds.includes(element.id),
                    );

                    // Store only in system clipboard with marker
                    const elementData = {
                        type: 'kraftpo-elements',
                        version: '1.0',
                        elements: selectedElements,
                        elementIds: selectedElements.map((el) => el.id),
                        timestamp: Date.now(),
                    };

                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard
                            .writeText(JSON.stringify(elementData))
                            .catch(() => {
                                console.warn(
                                    'Failed to copy elements to clipboard',
                                );
                            });
                    }
                }
                return;
            }

            // Handle Select All (Ctrl+A or Cmd+A)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                // Check if we're in text editing mode or an input field
                const isAgentInput = activeElement && (
                    activeElement.closest('[data-testid="agent-input"]') ||
                    activeElement.closest('.chat-interface') ||
                    activeElement.closest('.ql-editor')
                );

                if (!isInputFocused && !isAgentInput && !editingElementId && selectableElements) {
                    e.preventDefault();
                    const allElementIds = slide.elements.map(el => el.id);
                    if (allElementIds.length > 0) {
                        selectMultipleElements(allElementIds);
                    }
                }
                return;
            }

            if (
                (e.key === 'Backspace' || e.key === 'Delete') &&
                (selectedElementId || selectedElementIds.length > 0) &&
                !editingElementId &&
                selectableElements &&
                !isInputFocused
            ) {
                // Delete multiple selected elements or single selected element
                const elementsToDelete =
                    selectedElementIds.length > 0
                        ? selectedElementIds
                        : selectedElementId
                          ? [selectedElementId]
                          : [];

                if (elementsToDelete.length > 0) {
                    const updatedElements = slide.elements.filter(
                        (el) => !elementsToDelete.includes(el.id),
                    );

                    clearElementSelection();
                    updateSlide(slide.id, { elements: updatedElements });
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        readOnly,
        selectedElementId,
        selectedElementIds,
        editingElementId,
        selectableElements,
        slide,
        selectElement,
        selectMultipleElements,
        toggleElementSelection,
        clearElementSelection,
        updateSlide,
    ]);

    // Handle image paste from clipboard on this specific slide
    const slideRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (readOnly || !slideRef.current) return;

        const slideElement = slideRef.current;

        const handlePaste = async (e: ClipboardEvent) => {
            // Check if focus is on an input, textarea, or contenteditable element
            const activeElement = document.activeElement;
            const isInputFocused =
                activeElement &&
                (activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true');

            // Check if we're in the agent input field or any chat interface
            const isAgentInput =
                activeElement &&
                (activeElement.closest('[data-testid="agent-input"]') ||
                    activeElement.closest('.chat-interface') ||
                    activeElement.getAttribute('data-testid') ===
                        'agent-input');

            // Don't handle paste if we're editing text or in agent input
            if (isInputFocused || editingElementId || isAgentInput) {
                return;
            }

            const clipboardData = e.clipboardData;
            if (!clipboardData) return;

            // Check if clipboard contains image data
            const items = Array.from(clipboardData.items);
            const imageItem = items.find((item) =>
                item.type.startsWith('image/'),
            );

            if (imageItem) {
                e.preventDefault();
                e.stopPropagation(); // Prevent other handlers from processing this event

                const file = imageItem.getAsFile();
                if (!file) return;

                // Convert image to base64
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Data = event.target?.result as string;
                    if (!base64Data) return;

                    // Create image element on slide
                    const img = new Image();
                    img.onload = () => {
                        // Calculate appropriate size while maintaining aspect ratio
                        const maxWidth = 400;
                        const maxHeight = 300;
                        let { width, height } = img;

                        // Scale down if too large
                        if (width > maxWidth || height > maxHeight) {
                            const widthRatio = maxWidth / width;
                            const heightRatio = maxHeight / height;
                            const ratio = Math.min(widthRatio, heightRatio);
                            width *= ratio;
                            height *= ratio;
                        }

                        // Create image element at center of slide
                        const imageElement = createImage({
                            content: base64Data,
                            position: {
                                x:
                                    PRESENTATION_DIMENSIONS.WIDTH / 2 -
                                    width / 2,
                                y:
                                    PRESENTATION_DIMENSIONS.HEIGHT / 2 -
                                    height / 2,
                            },
                            size: {
                                width: Math.round(width),
                                height: Math.round(height),
                            },
                        });

                        // Add image to slide
                        const updatedElements = [
                            ...slide.elements,
                            imageElement,
                        ];
                        updateSlide(slide.id, { elements: updatedElements });

                        // Select the newly created image
                        selectElement(imageElement.id);
                    };
                    img.src = base64Data;
                };

                reader.readAsDataURL(file);
                return;
            }

            // Check for text content (elements or file paths)
            const textItem = items.find((item) => item.type === 'text/plain');
            if (textItem) {
                textItem.getAsString(async (text) => {
                    const trimmedText = text.trim();

                    // First, check if it's element data from our app
                    try {
                        const elementData = JSON.parse(trimmedText);
                        if (
                            elementData.type === 'kraftpo-elements' &&
                            elementData.elements
                        ) {
                            e.preventDefault();
                            e.stopPropagation();

                            // Clone and paste elements
                            const clonedElements = cloneElements(
                                elementData.elements,
                            );
                            const updatedElements = [
                                ...slide.elements,
                                ...clonedElements,
                            ];
                            updateSlide(slide.id, {
                                elements: updatedElements,
                            });

                            // Select the newly pasted elements after a small delay to prevent DOM conflicts
                            setTimeout(() => {
                                const newElementIds = clonedElements.map(
                                    (el) => el.id,
                                );
                                if (newElementIds.length === 1) {
                                    selectElement(newElementIds[0]);
                                } else {
                                    clearElementSelection();
                                    newElementIds.forEach((id) =>
                                        toggleElementSelection(id),
                                    );
                                }
                            }, 10);
                            return;
                        }
                    } catch (parseError) {
                        // Not JSON or not our element data, continue to check for file paths
                    }

                    // Check if it's a file path to an image
                    const imageExtensions = [
                        '.png',
                        '.jpg',
                        '.jpeg',
                        '.gif',
                        '.bmp',
                        '.webp',
                        '.svg',
                    ];
                    const isImagePath = imageExtensions.some((ext) =>
                        trimmedText.toLowerCase().endsWith(ext),
                    );

                    if (
                        isImagePath &&
                        (trimmedText.startsWith('/') ||
                            trimmedText.match(/^[a-zA-Z]:\\/))
                    ) {
                        e.preventDefault();
                        e.stopPropagation();

                        try {
                            // Use Electron's file reading capability
                            const fileBuffer =
                                await window.electron.fs.readFile(trimmedText);
                            const blob = new Blob([fileBuffer]);

                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const base64Data = event.target
                                    ?.result as string;
                                if (!base64Data) return;

                                // Create image element on slide
                                const img = new Image();
                                img.onload = () => {
                                    // Calculate appropriate size while maintaining aspect ratio
                                    const maxWidth = 400;
                                    const maxHeight = 300;
                                    let { width, height } = img;

                                    // Scale down if too large
                                    if (
                                        width > maxWidth ||
                                        height > maxHeight
                                    ) {
                                        const widthRatio = maxWidth / width;
                                        const heightRatio = maxHeight / height;
                                        const ratio = Math.min(
                                            widthRatio,
                                            heightRatio,
                                        );
                                        width *= ratio;
                                        height *= ratio;
                                    }

                                    // Create image element at center of slide
                                    const imageElement = createImage({
                                        content: base64Data,
                                        position: {
                                            x:
                                                PRESENTATION_DIMENSIONS.WIDTH /
                                                    2 -
                                                width / 2,
                                            y:
                                                PRESENTATION_DIMENSIONS.HEIGHT /
                                                    2 -
                                                height / 2,
                                        },
                                        size: {
                                            width: Math.round(width),
                                            height: Math.round(height),
                                        },
                                    });

                                    // Add image to slide
                                    const updatedElements = [
                                        ...slide.elements,
                                        imageElement,
                                    ];
                                    updateSlide(slide.id, {
                                        elements: updatedElements,
                                    });

                                    // Select the newly created image
                                    selectElement(imageElement.id);
                                };
                                img.src = base64Data;
                            };
                            reader.readAsDataURL(blob);
                        } catch (error) {
                            console.warn('Failed to read image file:', error);
                        }
                    }
                });
            }
        };

        slideElement.addEventListener('paste', handlePaste);

        return () => {
            slideElement.removeEventListener('paste', handlePaste);
        };
    }, [
        readOnly,
        editingElementId,
        slide.elements,
        slide.id,
        updateSlide,
        selectElement,
        clearElementSelection,
        toggleElementSelection,
    ]);

    const handleElementClick = (
        elementId: string,
        event?: React.MouseEvent,
    ) => {
        if (!readOnly && selectableElements) {
            // Check if Ctrl (or Cmd on Mac) is pressed for multi-selection
            if (event && (event.ctrlKey || event.metaKey)) {
                toggleElementSelection(elementId);
            } else {
                selectElement(elementId);
            }
        }
    };

    const handleContextMenu = (event: React.MouseEvent, elementId: string) => {
        event.preventDefault();
        if (readOnly || !selectableElements) return;

        setContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            elementId,
        });
        selectElement(elementId);
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleSlideContextMenu = async (event: React.MouseEvent) => {
        event.preventDefault();
        if (readOnly || !selectableElements) return;

        // Only show slide context menu if clicking on the slide background
        // (not on any elements)
        const target = event.target as HTMLElement;
        const isSlideBackground = target.hasAttribute('data-slide-container');

        if (isSlideBackground) {
            await checkClipboardForElements();
            setSlideContextMenu({
                mouseX: event.clientX - 2,
                mouseY: event.clientY - 4,
            });
        }
    };

    const handleCloseSlideContextMenu = () => {
        setSlideContextMenu(null);
    };

    const handlePasteElements = async () => {
        if (!selectableElements) return;

        try {
            const text = await navigator.clipboard.readText();
            const elementData = JSON.parse(text);

            if (
                elementData.type === 'kraftpo-elements' &&
                elementData.elements
            ) {
                const clonedElements = cloneElements(elementData.elements);

                // Add all cloned elements to the current slide
                const updatedElements = [...slide.elements, ...clonedElements];
                updateSlide(slide.id, { elements: updatedElements });

                // Select the newly pasted elements after a small delay to prevent DOM conflicts
                setTimeout(() => {
                    const newElementIds = clonedElements.map((el) => el.id);
                    if (newElementIds.length === 1) {
                        selectElement(newElementIds[0]);
                    } else {
                        clearElementSelection();
                        newElementIds.forEach((id) =>
                            toggleElementSelection(id),
                        );
                    }
                }, 10);
            }
        } catch (error) {
            console.warn('No valid elements to paste');
        }
    };

    const handleSlideProperties = () => {
        setSlidePropertiesDialog({ open: true });
    };

    const handleCloseSlidePropertiesDialog = () => {
        setSlidePropertiesDialog({ open: false });
    };

    const handleUpdateSlideProperties = (updates: Partial<Slide>) => {
        updateSlide(slide.id, updates);
    };

    const getElementZIndex = (elementId: string): number => {
        const element = slide.elements.find((el) => el.id === elementId);
        return element?.zIndex || 1;
    };

    const getMaxZIndex = (): number => {
        return Math.max(...slide.elements.map((el) => el.zIndex || 1), 0);
    };

    const getMinZIndex = (): number => {
        return Math.min(...slide.elements.map((el) => el.zIndex || 1), 1);
    };

    const moveElementForward = (elementId: string) => {
        const currentZIndex = getElementZIndex(elementId);
        const elementsAbove = slide.elements.filter(
            (el) => (el.zIndex || 1) > currentZIndex,
        );

        if (elementsAbove.length > 0) {
            const nextZIndex = Math.min(
                ...elementsAbove.map((el) => el.zIndex || 1),
            );
            updateElement(elementId, { zIndex: nextZIndex + 1 });
        }
    };

    const moveElementBackward = (elementId: string) => {
        const currentZIndex = getElementZIndex(elementId);
        const elementsBelow = slide.elements.filter(
            (el) => (el.zIndex || 1) < currentZIndex,
        );

        if (elementsBelow.length > 0) {
            const prevZIndex = Math.max(
                ...elementsBelow.map((el) => el.zIndex || 1),
            );
            updateElement(elementId, { zIndex: Math.max(prevZIndex - 1, 1) });
        }
    };

    const moveElementToTop = (elementId: string) => {
        const maxZIndex = getMaxZIndex();
        updateElement(elementId, { zIndex: maxZIndex + 1 });
    };

    const moveElementToBottom = (elementId: string) => {
        const minZIndex = getMinZIndex();
        updateElement(elementId, { zIndex: Math.max(minZIndex - 1, 1) });
    };

    const handleEditProperties = (elementId: string) => {
        const element = slide.elements.find((el) => el.id === elementId);
        if (element?.type === 'barchart') {
            setChartPropertiesDialog({ open: true, elementId });
        } else {
            setPropertiesDialog({ open: true, elementId });
        }
    };

    const handleClosePropertiesDialog = () => {
        setPropertiesDialog({ open: false, elementId: null });
    };

    const handleUpdateShapeProperties = (updates: Partial<Shape>) => {
        if (propertiesDialog.elementId) {
            updateElement(propertiesDialog.elementId, updates);
        }
    };

    const handleCloseChartPropertiesDialog = () => {
        setChartPropertiesDialog({ open: false, elementId: null });
    };

    const handleUpdateChartProperties = (updates: Partial<BarChart>) => {
        if (chartPropertiesDialog.elementId) {
            updateElement(chartPropertiesDialog.elementId, updates);
        }
    };

    const handleCopyElement = () => {
        if (contextMenu?.elementId) {
            const selectedElements = slide.elements.filter((element) =>
                selectedElementIds.includes(element.id),
            );
            if (selectedElements.length > 0) {
                // Store only in system clipboard with marker
                const elementData = {
                    type: 'kraftpo-elements',
                    version: '1.0',
                    elements: selectedElements,
                    elementIds: selectedElements.map((el) => el.id),
                    timestamp: Date.now(),
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard
                        .writeText(JSON.stringify(elementData))
                        .catch(() => {
                            console.warn(
                                'Failed to copy elements to clipboard',
                            );
                        });
                }
            }
        }
    };

    // Handle multi-element updates for dragging multiple selected elements
    const handleMultiElementUpdate = (
        primaryElementId: string,
        primaryUpdates: Partial<ContentElement>,
        allUpdates: Array<{
            elementId: string;
            updates: Partial<ContentElement>;
        }>,
    ) => {
        if (readOnly) return;

        // Apply snapping only to the primary element being dragged
        const primaryElement = slide.elements.find(
            (el) => el.id === primaryElementId,
        );
        if (!primaryElement || !primaryUpdates.position) return;

        const snapResult = calculateSnapPosition(
            primaryElement,
            primaryUpdates.position,
        );
        const snappedPosition = snapResult.position;

        // Calculate the delta from the original intended position to the snapped position
        const deltaX = snappedPosition.x - primaryUpdates.position.x;
        const deltaY = snappedPosition.y - primaryUpdates.position.y;

        // Apply the snapped position to the primary element
        updateElement(primaryElementId, { position: snappedPosition });

        // Apply the same delta to all other selected elements (without snapping)
        allUpdates.forEach(({ elementId, updates: elementUpdates }) => {
            if (elementId !== primaryElementId && elementUpdates.position) {
                updateElement(elementId, {
                    position: {
                        x: elementUpdates.position.x + deltaX,
                        y: elementUpdates.position.y + deltaY,
                    },
                });
            }
        });
    };

    const renderElement = (element: ContentElement) => {
        const commonProps = {
            element,
            onClick: (event?: React.MouseEvent) =>
                handleElementClick(element.id, event),
            onContextMenu: (event: React.MouseEvent) =>
                handleContextMenu(event, element.id),
            onElementUpdate: readOnly ? undefined : updateElementWithSnap,
            onMultiElementUpdate: readOnly
                ? undefined
                : handleMultiElementUpdate,
            selectedElementIds,
            slideElements: slide.elements,
            isSelected:
                !readOnly && selectableElements && isSelected(element.id),
            isEditing: !readOnly && selectableElements && isEditing(element.id),
            onStartEditing: () =>
                !readOnly &&
                selectableElements &&
                startEditingElement(element.id),
            onStopEditing: () => !readOnly && stopEditingElement(),
            readOnly,
        };

        const textProps = {
            element: element as TextBox,
            onClick: (event?: React.MouseEvent) =>
                handleElementClick(element.id, event),
            onContextMenu: (event: React.MouseEvent) =>
                handleContextMenu(event, element.id),
            onMultiElementUpdate: readOnly
                ? undefined
                : handleMultiElementUpdate,
            selectedElementIds,
            slideElements: slide.elements,
            isSelected:
                !readOnly && selectableElements && isSelected(element.id),
            isEditing: !readOnly && selectableElements && isEditing(element.id),
            onStartEditing: () =>
                !readOnly &&
                selectableElements &&
                startEditingElement(element.id),
            onStopEditing: (content?: string) => {
                if (readOnly) return;
                stopEditingElement();
                clearGuides(); // Clear guides when stopping text editing
                if (content !== undefined) {
                    updateElement(element.id, { content });
                }
            },
            onElementUpdate: readOnly ? undefined : updateElementWithSnap,
            readOnly,
        };

        switch (element.type) {
            case 'rectangle':
            case 'circle':
            case 'triangle':
                return (
                    <ShapeElement
                        key={element.id}
                        {...commonProps}
                        element={element as Shape}
                    />
                );
            case 'textbox':
                return <TextElement key={element.id} {...textProps} />;
            case 'image':
                return (
                    <ImageElement
                        key={element.id}
                        {...commonProps}
                        element={element as ImageType}
                    />
                );
            case 'plot':
                return (
                    <PlotElement
                        key={element.id}
                        {...commonProps}
                        element={element as Plot}
                    />
                );
            case 'barchart':
                return (
                    <BarChartElement
                        key={element.id}
                        {...commonProps}
                        element={element as BarChart}
                    />
                );
            case 'graph':
                return (
                    <GraphElement
                        key={element.id}
                        {...commonProps}
                        element={element as Graph}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div
            ref={slideRef}
            data-slide-container
            tabIndex={0}
            style={{
                width: PRESENTATION_DIMENSIONS.WIDTH,
                height: PRESENTATION_DIMENSIONS.HEIGHT,
                backgroundColor: slide.background,
                overflow: 'hidden',
                position: 'relative',
                outline: 'none', // Remove focus outline
                ...style,
            }}
            className={className}
            onClick={() => {
                if (!readOnly && selectableElements) {
                    clearElementSelection();
                    clearGuides(); // Clear guides when clicking background
                }
            }}
            onContextMenu={handleSlideContextMenu}
        >
            {slide.elements
                .filter((element, index, array) => {
                    // Filter out elements with duplicate IDs (keep first occurrence)
                    return (
                        array.findIndex((el) => el.id === element.id) === index
                    );
                })
                .map((element) => {
                    try {
                        return renderElement(element);
                    } catch (error) {
                        console.warn(
                            'Error rendering element:',
                            element.id,
                            error,
                        );
                        return null;
                    }
                })}

            {/* Snap guides overlay */}
            {!readOnly && (
                <SnapGuides
                    guides={activeGuides}
                    slideWidth={PRESENTATION_DIMENSIONS.WIDTH}
                    slideHeight={PRESENTATION_DIMENSIONS.HEIGHT}
                    scale={scale}
                />
            )}

            <ElementContextMenu
                anchorEl={contextMenu ? document.body : null}
                open={Boolean(contextMenu)}
                onClose={handleCloseContextMenu}
                onCopy={handleCopyElement}
                onMoveForward={() =>
                    contextMenu && moveElementForward(contextMenu.elementId)
                }
                onMoveBackward={() =>
                    contextMenu && moveElementBackward(contextMenu.elementId)
                }
                onMoveToTop={() =>
                    contextMenu && moveElementToTop(contextMenu.elementId)
                }
                onMoveToBottom={() =>
                    contextMenu && moveElementToBottom(contextMenu.elementId)
                }
                onEditProperties={() =>
                    contextMenu && handleEditProperties(contextMenu.elementId)
                }
                elementType={
                    contextMenu
                        ? slide.elements.find(
                              (el) => el.id === contextMenu.elementId,
                          )?.type
                        : undefined
                }
            />

            <SlideContextMenu
                anchorEl={slideContextMenu ? document.body : null}
                open={Boolean(slideContextMenu)}
                onClose={handleCloseSlideContextMenu}
                onPaste={handlePasteElements}
                onProperties={handleSlideProperties}
                canPaste={canPasteElements}
            />

            {contextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.mouseY,
                        left: contextMenu.mouseX,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none',
                        zIndex: 9999,
                    }}
                />
            )}

            {slideContextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: slideContextMenu.mouseY,
                        left: slideContextMenu.mouseX,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none',
                        zIndex: 9999,
                    }}
                />
            )}

            <ShapePropertiesDialog
                open={propertiesDialog.open}
                onClose={handleClosePropertiesDialog}
                shape={
                    propertiesDialog.elementId
                        ? (slide.elements.find(
                              (el) => el.id === propertiesDialog.elementId,
                          ) as Shape)
                        : null
                }
                onUpdate={handleUpdateShapeProperties}
            />

            <BarChartPropertiesDialog
                open={chartPropertiesDialog.open}
                onClose={handleCloseChartPropertiesDialog}
                chart={
                    chartPropertiesDialog.elementId
                        ? (slide.elements.find(
                              (el) => el.id === chartPropertiesDialog.elementId,
                          ) as BarChart)
                        : null
                }
                onUpdate={handleUpdateChartProperties}
            />

            <SlidePropertiesDialog
                open={slidePropertiesDialog.open}
                onClose={handleCloseSlidePropertiesDialog}
                slide={slide}
                onUpdate={handleUpdateSlideProperties}
            />
        </div>
    );
};
