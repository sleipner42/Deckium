import React, { useEffect } from 'react';
import {
  ContentElement,
  Image,
  Plot,
  Shape,
  Slide,
  TextBox,
  BarChart,
} from '../../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../../common/utils/constants';
import { usePresentation } from '../../context/PresentationContext';
import { useElementState } from '../../hooks/useElementState';
import { ImageElement } from './elements/ImageElement';
import { PlotElement } from './elements/PlotElement';
import { ShapeElement } from './elements/ShapeElement';
import { TextElement } from './elements/TextElement';
import { BarChartElement } from './elements/BarChartElement';

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

  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        selectedElementId &&
        !editingElementId &&
        selectableElements
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

  const renderElement = (element: ContentElement) => {
    const commonProps = {
      element,
      onClick: () => handleElementClick(element.id),
      onElementUpdate: readOnly ? undefined : updateElement,
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
      isSelected: !readOnly && selectableElements && isSelected(element.id),
      isEditing: !readOnly && selectableElements && isEditing(element.id),
      onStartEditing: () =>
        !readOnly && selectableElements && startEditingElement(element.id),
      onStopEditing: (content?: string) => {
        if (readOnly) return;
        stopEditingElement();
        if (content !== undefined) {
          updateElement(element.id, { content });
        }
      },
      onElementUpdate: readOnly ? undefined : updateElement,
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
        ...style,
      }}
      className={className}
      onClick={() => !readOnly && selectableElements && selectElement(null)}
    >
      {slide.elements.map(renderElement)}
    </div>
  );
};
