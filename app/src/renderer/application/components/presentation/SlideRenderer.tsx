import React, { useEffect, useState } from 'react';
import {
  BarChart,
  ContentElement,
  Image,
  Plot,
  Shape,
  Slide,
  TextBox,
} from '../../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../../common/utils/constants';
import { usePresentation } from '../../context/PresentationContext';
import { useElementState } from '../../hooks/useElementState';
import { useSnapSystem } from '../../hooks/useSnapSystem';
import { BarChartPropertiesDialog } from './BarChartPropertiesDialog';
import { ElementContextMenu } from './ElementContextMenu';
import { SnapGuides } from './SnapGuides';
import { BarChartElement } from './elements/BarChartElement';
import { ImageElement } from './elements/ImageElement';
import { PlotElement } from './elements/PlotElement';
import { ShapeElement } from './elements/ShapeElement';
import { TextElement } from './elements/TextElement';
import { ShapePropertiesDialog } from './ShapePropertiesDialog';

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
  const { updateElement, updateSlide } = usePresentation();
  const {
    selectedElementId,
    editingElementId,
    selectElement,
    startEditingElement,
    stopEditingElement,
    isSelected,
    isEditing,
  } = useElementState();

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
  const updateElementWithSnap = (elementId: string, updates: Partial<ContentElement>) => {
    const element = slide.elements.find(el => el.id === elementId);
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

  const [propertiesDialog, setPropertiesDialog] = useState<{
    open: boolean;
    elementId: string | null;
  }>({ open: false, elementId: null });

  const [chartPropertiesDialog, setChartPropertiesDialog] = useState<{
    open: boolean;
    elementId: string | null;
  }>({ open: false, elementId: null });

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

      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        selectedElementId &&
        !editingElementId &&
        selectableElements &&
        !isInputFocused
      ) {
        const elementToDelete = slide.elements.find(
          (el) => el.id === selectedElementId,
        );
        if (elementToDelete) {
          const updatedElements = slide.elements.filter(
            (el) => el.id !== selectedElementId,
          );

          selectElement(null);

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
    editingElementId,
    selectableElements,
    slide,
    selectElement,
    updateSlide,
  ]);

  const handleElementClick = (elementId: string) => {
    if (!readOnly && selectableElements) {
      selectElement(elementId);
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
      const nextZIndex = Math.min(...elementsAbove.map((el) => el.zIndex || 1));
      updateElement(elementId, { zIndex: nextZIndex + 1 });
    }
  };

  const moveElementBackward = (elementId: string) => {
    const currentZIndex = getElementZIndex(elementId);
    const elementsBelow = slide.elements.filter(
      (el) => (el.zIndex || 1) < currentZIndex,
    );

    if (elementsBelow.length > 0) {
      const prevZIndex = Math.max(...elementsBelow.map((el) => el.zIndex || 1));
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

  const renderElement = (element: ContentElement) => {
    const commonProps = {
      element,
      onClick: () => handleElementClick(element.id),
      onContextMenu: (event: React.MouseEvent) =>
        handleContextMenu(event, element.id),
      onElementUpdate: readOnly ? undefined : updateElementWithSnap,
      isSelected: !readOnly && selectableElements && isSelected(element.id),
      isEditing: !readOnly && selectableElements && isEditing(element.id),
      onStartEditing: () =>
        !readOnly && selectableElements && startEditingElement(element.id),
      onStopEditing: () => !readOnly && stopEditingElement(),
      readOnly,
    };

    const textProps = {
      element: element as TextBox,
      onClick: () => handleElementClick(element.id),
      onContextMenu: (event: React.MouseEvent) =>
        handleContextMenu(event, element.id),
      isSelected: !readOnly && selectableElements && isSelected(element.id),
      isEditing: !readOnly && selectableElements && isEditing(element.id),
      onStartEditing: () =>
        !readOnly && selectableElements && startEditingElement(element.id),
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
            element={element as Image}
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
      data-slide-container
      style={{
        width: PRESENTATION_DIMENSIONS.WIDTH,
        height: PRESENTATION_DIMENSIONS.HEIGHT,
        backgroundColor: slide.background,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
      className={className}
      onClick={() => {
        if (!readOnly && selectableElements) {
          selectElement(null);
          clearGuides(); // Clear guides when clicking background
        }
      }}
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
            ? slide.elements.find((el) => el.id === contextMenu.elementId)?.type
            : undefined
        }
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
    </div>
  );
};
