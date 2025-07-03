import React, { useEffect, useRef, useState } from 'react';
import {
    cloneElements,
    createImage,
} from '../../../../common/domain/entities/element-factory';
import {
    BarChart,
    ContentElement,
    Image as ImageType,
    Plot,
    Shape,
    Slide,
    TextBox,
} from '../../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../../common/utils/constants';
import { useClipboard } from '../../context/ClipboardContext';
import { usePresentation } from '../../context/PresentationContext';
import { useSnapSystem } from '../../hooks/useSnapSystem';
import { BarChartPropertiesDialog } from './BarChartPropertiesDialog';
import { ElementContextMenu } from './ElementContextMenu';
import { BarChartElement } from './elements/BarChartElement';
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
        toggleElementSelection,
        clearElementSelection,
        startEditingElement,
        stopEditingElement,
    } = usePresentation();

    const { copyElements, getCopiedElements, hasCopiedElements } =
        useClipboard();

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

    // Enhanced updateElement with snap support
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

        updateElement(elementId, updates);
    };

    // Add mouse up event listener to clear guides when dragging ends
    useEffect(() => {
        const handleMouseUp = () => {
            // Delay clearing guides to let element mouseup handlers fire first
            setTimeout(() => {
                clearGuides();
            }, 0);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [clearGuides]);

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
                    
                    // Store in app context
                    copyElements(selectedElements);
                    
                    // Also store in system clipboard with marker
                    const elementData = {
                        type: 'kraftpo-elements',
                        version: '1.0',
                        elements: selectedElements,
                        elementIds: selectedElements.map(el => el.id),
                        timestamp: Date.now()
                    };
                    
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(JSON.stringify(elementData)).catch(() => {
                            // Fallback: silent failure, app clipboard still works
                        });
                    }
                }
                return;
            }

            // Handle Paste (Ctrl+V or Cmd+V) for app elements only
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                if (selectableElements && hasCopiedElements) {
                    e.preventDefault();
                    
                    // First try to read system clipboard text for app elements
                    navigator.clipboard.readText().then(text => {
                        let handled = false;
                        
                        if (text) {
                            try {
                                const elementData = JSON.parse(text);
                                if (elementData.type === 'kraftpo-elements' && elementData.elements) {
                                    // Valid app element data found
                                    const clonedElements = cloneElements(elementData.elements);

                                    // Add all cloned elements to the current slide
                                    const updatedElements = [
                                        ...slide.elements,
                                        ...clonedElements,
                                    ];
                                    updateSlide(slide.id, { elements: updatedElements });

                                    // Select the newly pasted elements
                                    const newElementIds = clonedElements.map((el) => el.id);
                                    if (newElementIds.length === 1) {
                                        selectElement(newElementIds[0]);
                                    } else {
                                        clearElementSelection();
                                        newElementIds.forEach((id) =>
                                            toggleElementSelection(id),
                                        );
                                    }
                                    handled = true;
                                    return;
                                }
                            } catch (parseError) {
                                // Not valid JSON or not our element data
                            }
                        }
                        
                        // If no valid system clipboard data, use app clipboard
                        if (!handled) {
                            const copiedElements = getCopiedElements();
                            const clonedElements = cloneElements(copiedElements);

                            // Add all cloned elements to the current slide
                            const updatedElements = [
                                ...slide.elements,
                                ...clonedElements,
                            ];
                            updateSlide(slide.id, { elements: updatedElements });

                            // Select the newly pasted elements
                            const newElementIds = clonedElements.map((el) => el.id);
                            if (newElementIds.length === 1) {
                                selectElement(newElementIds[0]);
                            } else {
                                clearElementSelection();
                                newElementIds.forEach((id) =>
                                    toggleElementSelection(id),
                                );
                            }
                        }
                    }).catch(() => {
                        // Clipboard read failed, use app clipboard
                        const copiedElements = getCopiedElements();
                        const clonedElements = cloneElements(copiedElements);

                        // Add all cloned elements to the current slide
                        const updatedElements = [
                            ...slide.elements,
                            ...clonedElements,
                        ];
                        updateSlide(slide.id, { elements: updatedElements });

                        // Select the newly pasted elements
                        const newElementIds = clonedElements.map((el) => el.id);
                        if (newElementIds.length === 1) {
                            selectElement(newElementIds[0]);
                        } else {
                            clearElementSelection();
                            newElementIds.forEach((id) =>
                                toggleElementSelection(id),
                            );
                        }
                    });
                }
                // Don't return here - let image paste handler deal with images
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
        toggleElementSelection,
        clearElementSelection,
        updateSlide,
        hasCopiedElements,
        getCopiedElements,
        copyElements,
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

            // Check if we're in the agent input field
            const isAgentInput = activeElement && (
                activeElement.closest('[data-testid="agent-input"]') ||
                activeElement.closest('.chat-interface')
            );

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

    const handleSlideContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        if (readOnly || !selectableElements) return;

        // Only show slide context menu if clicking on the slide background
        // (not on any elements)
        const target = event.target as HTMLElement;
        const isSlideBackground = target.hasAttribute('data-slide-container');

        if (isSlideBackground) {
            setSlideContextMenu({
                mouseX: event.clientX - 2,
                mouseY: event.clientY - 4,
            });
        }
    };

    const handleCloseSlideContextMenu = () => {
        setSlideContextMenu(null);
    };

    const handlePasteElements = () => {
        if (hasCopiedElements && selectableElements) {
            const copiedElements = getCopiedElements();
            const clonedElements = cloneElements(copiedElements);

            // Add all cloned elements to the current slide
            const updatedElements = [...slide.elements, ...clonedElements];
            updateSlide(slide.id, { elements: updatedElements });

            // Select the newly pasted elements
            const newElementIds = clonedElements.map((el) => el.id);
            if (newElementIds.length === 1) {
                selectElement(newElementIds[0]);
            } else {
                clearElementSelection();
                newElementIds.forEach((id) => toggleElementSelection(id));
            }
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
                // Store in app context
                copyElements(selectedElements);
                
                // Also store in system clipboard with marker
                const elementData = {
                    type: 'kraftpo-elements',
                    version: '1.0',
                    elements: selectedElements,
                    elementIds: selectedElements.map(el => el.id),
                    timestamp: Date.now()
                };
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(JSON.stringify(elementData)).catch(() => {
                        // Fallback: silent failure, app clipboard still works
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
            {slide.elements.map(renderElement)}

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
                canPaste={hasCopiedElements}
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
