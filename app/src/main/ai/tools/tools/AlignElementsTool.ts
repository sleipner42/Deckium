import { BaseTool } from '../BaseTool';
import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';

export class AlignElementsTool extends BaseTool {
  name = 'alignElements';
  description = 'Align multiple elements on a slide horizontally or vertically';
  requiredParams = {
    slideId: 'The ID of the slide containing the elements',
    elementIds: 'Comma-separated list of element IDs to align',
    alignType: 'Type of alignment: "top", "bottom", "left", "right", "center-horizontal", "center-vertical", "distribute-horizontal", "distribute-vertical"',
    referenceElementId: 'Optional ID of the element to use as reference for alignment. If not provided, the tool will determine a reference automatically based on the alignment type.',
    spacing: 'Optional spacing between elements in pixels (only used for distribute alignment types)',
  };

  protected async executeImpl(
    params: Record<string, any>,
    presentationService: PresentationService
  ): Promise<AIToolResult> {
    const { slideId, elementIds, alignType, referenceElementId, spacing } = params;

    if (!slideId) {
      return {
        success: false,
        error: 'slideId is required',
      };
    }

    if (!elementIds) {
      return {
        success: false,
        error: 'elementIds is required',
      };
    }

    if (!alignType) {
      return {
        success: false,
        error: 'alignType is required',
      };
    }

    const validAlignTypes = [
      'top',
      'bottom',
      'left',
      'right',
      'center-horizontal',
      'center-vertical',
      'distribute-horizontal',
      'distribute-vertical',
    ];

    if (!validAlignTypes.includes(alignType)) {
      return {
        success: false,
        error: `alignType must be one of: ${validAlignTypes.join(', ')}`,
      };
    }

    // Parse element IDs
    const elementIdList = elementIds
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);

    if (elementIdList.length < 2) {
      return {
        success: false,
        error: 'At least two elements are required for alignment',
      };
    }

    // Find the slide
    const currentPresentation = presentationService.getPresentation();
    const slide = currentPresentation.slides.find(
      (s) => s.id === slideId,
    );

    if (!slide) {
      return {
        success: false,
        error: `Slide with ID ${slideId} not found`,
      };
    }

    // Find all elements to align
    const elementsToAlign = slide.elements.filter((element) =>
      elementIdList.includes(element.id),
    );

    if (elementsToAlign.length !== elementIdList.length) {
      const missingIds = elementIdList.filter(
        (id: string) => !slide.elements.some((el) => el.id === id),
      );
      return {
        success: false,
        error: `Some elements were not found: ${missingIds.join(', ')}`,
      };
    }

    // Make a copy of the elements for alignment
    const elements = [...elementsToAlign];

    // Find reference element if specified
    let referenceElement = null;
    if (referenceElementId) {
      referenceElement = elements.find(el => el.id === referenceElementId);
      if (!referenceElement) {
        return {
          success: false,
          error: `Reference element with ID ${referenceElementId} was not found in the elementIds list`,
        };
      }
    }

    // Calculate alignment values based on alignType
    const updates: Array<{ id: string; updates: any }> = [];
    
    // Sort elements by position for distribution
    const elementsSortedHorizontal = [...elements].sort(
      (a, b) => a.position.x - b.position.x,
    );
    
    const elementsSortedVertical = [...elements].sort(
      (a, b) => a.position.y - b.position.y,
    );

    switch (alignType) {
      case 'top': {
        // Find the reference position
        let topY;
        if (referenceElement) {
          topY = referenceElement.position.y;
        } else {
          // Default behavior: Use the topmost element
          topY = Math.min(...elements.map((el) => el.position.y));
        }
        
        elements.forEach((el) => {
          if (el.position.y !== topY) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: el.position.x,
                  y: topY,
                },
              },
            });
          }
        });
        break;
      }
      case 'bottom': {
        // Find the reference position
        let bottomY;
        if (referenceElement) {
          bottomY = referenceElement.position.y + referenceElement.size.height;
        } else {
          // Default behavior: Use the bottom-most element
          bottomY = Math.max(
            ...elements.map((el) => el.position.y + el.size.height),
          );
        }
        
        elements.forEach((el) => {
          const newY = bottomY - el.size.height;
          if (el.position.y !== newY) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: el.position.x,
                  y: newY,
                },
              },
            });
          }
        });
        break;
      }
      case 'left': {
        // Find the reference position
        let leftX;
        if (referenceElement) {
          leftX = referenceElement.position.x;
        } else {
          // Default behavior: Use the leftmost element
          leftX = Math.min(...elements.map((el) => el.position.x));
        }
        
        elements.forEach((el) => {
          if (el.position.x !== leftX) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: leftX,
                  y: el.position.y,
                },
              },
            });
          }
        });
        break;
      }
      case 'right': {
        // Find the reference position
        let rightX;
        if (referenceElement) {
          rightX = referenceElement.position.x + referenceElement.size.width;
        } else {
          // Default behavior: Use the rightmost element
          rightX = Math.max(
            ...elements.map((el) => el.position.x + el.size.width),
          );
        }
        
        elements.forEach((el) => {
          const newX = rightX - el.size.width;
          if (el.position.x !== newX) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: newX,
                  y: el.position.y,
                },
              },
            });
          }
        });
        break;
      }
      case 'center-horizontal': {
        // Find the reference center position
        let centerX;
        if (referenceElement) {
          centerX = referenceElement.position.x + (referenceElement.size.width / 2);
        } else {
          // Default behavior: Find the average center X position
          const totalCenterX = elements.reduce(
            (sum, el) => sum + (el.position.x + el.size.width / 2),
            0,
          );
          centerX = totalCenterX / elements.length;
        }
        
        elements.forEach((el) => {
          const newX = centerX - el.size.width / 2;
          if (el.position.x !== newX) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: newX,
                  y: el.position.y,
                },
              },
            });
          }
        });
        break;
      }
      case 'center-vertical': {
        // Find the reference center position
        let centerY;
        if (referenceElement) {
          centerY = referenceElement.position.y + (referenceElement.size.height / 2);
        } else {
          // Default behavior: Find the average center Y position
          const totalCenterY = elements.reduce(
            (sum, el) => sum + (el.position.y + el.size.height / 2),
            0,
          );
          centerY = totalCenterY / elements.length;
        }
        
        elements.forEach((el) => {
          const newY = centerY - el.size.height / 2;
          if (el.position.y !== newY) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: el.position.x,
                  y: newY,
                },
              },
            });
          }
        });
        break;
      }
      case 'distribute-horizontal': {
        if (elementsSortedHorizontal.length < 3) {
          return {
            success: false,
            error: 'At least three elements are required for distribution',
          };
        }
        
        // For distribution, we need first and last element
        // If reference element is provided, it becomes the first element
        let firstEl, lastEl;
        
        if (referenceElement) {
          // Use the reference element as the first element and find the rightmost as the last
          const rightmost = elementsSortedHorizontal[elementsSortedHorizontal.length - 1];
          
          // If reference is already the rightmost, use the leftmost as first
          if (referenceElement.id === rightmost.id) {
            firstEl = elementsSortedHorizontal[0];
            lastEl = referenceElement;
          } else {
            firstEl = referenceElement;
            lastEl = rightmost;
          }
        } else {
          // Default behavior: Use leftmost and rightmost
          firstEl = elementsSortedHorizontal[0];
          lastEl = elementsSortedHorizontal[elementsSortedHorizontal.length - 1];
        }
        
        // Get all elements between first and last
        let middleElements;
        if (referenceElement) {
          // Need to reorder based on x position with reference first
          const sorted = elementsSortedHorizontal.filter(
            el => el.id !== firstEl.id && el.id !== lastEl.id
          );
          middleElements = sorted;
        } else {
          middleElements = elementsSortedHorizontal.slice(1, -1);
        }
        
        const startX = firstEl.position.x + firstEl.size.width;
        const endX = lastEl.position.x;
        const totalWidth = endX - startX;
        
        const spacingValue = Number(spacing) || 0;
        
        // Calculate even distribution
        const totalElementsWidth = middleElements.reduce(
          (sum, el) => sum + el.size.width,
          0
        );
        
        // If spacing is provided, use it; otherwise calculate even spacing
        const totalSpacing = spacingValue
          ? (middleElements.length - 1) * spacingValue
          : totalWidth - totalElementsWidth;
          
        const gapWidth = totalSpacing / (middleElements.length - 1 || 1);
        
        let currentX = startX;
        
        middleElements.forEach((el, index) => {
          if (index > 0) {
            currentX += gapWidth;
          }
          
          if (el.position.x !== currentX) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: currentX,
                  y: el.position.y,
                },
              },
            });
          }
          
          currentX += el.size.width;
        });
        break;
      }
      case 'distribute-vertical': {
        if (elementsSortedVertical.length < 3) {
          return {
            success: false,
            error: 'At least three elements are required for distribution',
          };
        }
        
        // For distribution, we need top and bottom element
        // If reference element is provided, it becomes the top element
        let topEl, bottomEl;
        
        if (referenceElement) {
          // Use the reference element as the top element and find the bottommost as the last
          const bottommost = elementsSortedVertical[elementsSortedVertical.length - 1];
          
          // If reference is already the bottommost, use the topmost as first
          if (referenceElement.id === bottommost.id) {
            topEl = elementsSortedVertical[0];
            bottomEl = referenceElement;
          } else {
            topEl = referenceElement;
            bottomEl = bottommost;
          }
        } else {
          // Default behavior: Use topmost and bottommost
          topEl = elementsSortedVertical[0];
          bottomEl = elementsSortedVertical[elementsSortedVertical.length - 1];
        }
        
        // Get all elements between top and bottom
        let middleElements;
        if (referenceElement) {
          // Need to reorder based on y position with reference first
          const sorted = elementsSortedVertical.filter(
            el => el.id !== topEl.id && el.id !== bottomEl.id
          );
          middleElements = sorted;
        } else {
          middleElements = elementsSortedVertical.slice(1, -1);
        }
        
        const startY = topEl.position.y + topEl.size.height;
        const endY = bottomEl.position.y;
        const totalHeight = endY - startY;
        
        const spacingValue = Number(spacing) || 0;
        
        // Calculate even distribution
        const totalElementsHeight = middleElements.reduce(
          (sum, el) => sum + el.size.height,
          0
        );
        
        // If spacing is provided, use it; otherwise calculate even spacing
        const totalSpacing = spacingValue
          ? (middleElements.length - 1) * spacingValue
          : totalHeight - totalElementsHeight;
          
        const gapHeight = totalSpacing / (middleElements.length - 1 || 1);
        
        let currentY = startY;
        
        middleElements.forEach((el, index) => {
          if (index > 0) {
            currentY += gapHeight;
          }
          
          if (el.position.y !== currentY) {
            updates.push({
              id: el.id,
              updates: {
                position: {
                  x: el.position.x,
                  y: currentY,
                },
              },
            });
          }
          
          currentY += el.size.height;
        });
        break;
      }
    }

    if (updates.length === 0) {
      return {
        success: true,
        data: {
          message: 'Elements are already aligned as requested',
        },
      };
    }

    // Apply all updates
    for (const update of updates) {
      presentationService.updateElement(update.id, update.updates);
    }

    return {
      success: true,
      data: {
        message: `Successfully aligned ${updates.length} elements using "${alignType}" alignment`,
        updates,
      },
    };
  }
} 