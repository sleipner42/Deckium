import { ContentElement } from '../../../common/domain/entities/types';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  elements: string[];
  guideType: 'edge-left' | 'edge-right' | 'edge-top' | 'edge-bottom' | 'center-x' | 'center-y';
}

export interface SnapResult {
  position: Point;
  snapped: boolean;
  guides: SnapGuide[];
}

export interface SnapConfiguration {
  tolerance: number;
  enableEdgeSnapping: boolean;
  enableCenterSnapping: boolean;
  enableDistributionSnapping: boolean;
}

export class SnapEngine {
  private config: SnapConfiguration;

  constructor(config: Partial<SnapConfiguration> = {}) {
    this.config = {
      tolerance: 8,
      enableEdgeSnapping: true,
      enableCenterSnapping: true,
      enableDistributionSnapping: true,
      ...config,
    };
  }

  /**
   * Calculate snap position for a dragged element
   */
  calculateSnap(
    draggedElement: ContentElement,
    newPosition: Point,
    allElements: ContentElement[],
    slideWidth: number = 1920,
    slideHeight: number = 1080
  ): SnapResult {
    const draggedBounds = this.getElementBounds(draggedElement, newPosition);
    const otherElements = allElements.filter(el => el.id !== draggedElement.id);
    const otherBounds = otherElements.map(el => this.getElementBounds(el));

    const snapGuides: SnapGuide[] = [];
    let snappedX = newPosition.x;
    let snappedY = newPosition.y;
    let hasSnappedX = false;
    let hasSnappedY = false;

    // Check snapping against other elements
    for (const otherBound of otherBounds) {
      // Horizontal snapping (X-axis)
      if (!hasSnappedX) {
        const xSnap = this.checkHorizontalSnap(draggedBounds, otherBound);
        if (xSnap) {
          snappedX = xSnap.position;
          snapGuides.push(xSnap.guide);
          hasSnappedX = true;
        }
      }

      // Vertical snapping (Y-axis)
      if (!hasSnappedY) {
        const ySnap = this.checkVerticalSnap(draggedBounds, otherBound);
        if (ySnap) {
          snappedY = ySnap.position;
          snapGuides.push(ySnap.guide);
          hasSnappedY = true;
        }
      }
    }

    // Check snapping to slide edges
    if (!hasSnappedX) {
      const slideXSnap = this.checkSlideEdgeSnapX(draggedBounds, slideWidth);
      if (slideXSnap) {
        snappedX = slideXSnap.position;
        snapGuides.push(slideXSnap.guide);
        hasSnappedX = true;
      }
    }

    if (!hasSnappedY) {
      const slideYSnap = this.checkSlideEdgeSnapY(draggedBounds, slideHeight);
      if (slideYSnap) {
        snappedY = slideYSnap.position;
        snapGuides.push(slideYSnap.guide);
        hasSnappedY = true;
      }
    }

    // Check center alignment to slide
    if (!hasSnappedX && this.config.enableCenterSnapping) {
      const centerXSnap = this.checkSlideCenterSnapX(draggedBounds, slideWidth);
      if (centerXSnap) {
        snappedX = centerXSnap.position;
        snapGuides.push(centerXSnap.guide);
        hasSnappedX = true;
      }
    }

    if (!hasSnappedY && this.config.enableCenterSnapping) {
      const centerYSnap = this.checkSlideCenterSnapY(draggedBounds, slideHeight);
      if (centerYSnap) {
        snappedY = centerYSnap.position;
        snapGuides.push(centerYSnap.guide);
        hasSnappedY = true;
      }
    }

    return {
      position: { x: snappedX, y: snappedY },
      snapped: hasSnappedX || hasSnappedY,
      guides: snapGuides,
    };
  }

  private getElementBounds(element: ContentElement, customPosition?: Point): ElementBounds {
    const pos = customPosition || element.position;
    const size = element.size;
    
    return {
      id: element.id,
      left: pos.x,
      right: pos.x + size.width,
      top: pos.y,
      bottom: pos.y + size.height,
      centerX: pos.x + size.width / 2,
      centerY: pos.y + size.height / 2,
      width: size.width,
      height: size.height,
    };
  }

  private checkHorizontalSnap(draggedBounds: ElementBounds, otherBounds: ElementBounds) {
    const { tolerance } = this.config;

    // Check if elements are vertically aligned (overlapping in Y)
    const verticalOverlap = !(
      draggedBounds.bottom < otherBounds.top ||
      draggedBounds.top > otherBounds.bottom
    );

    if (!verticalOverlap) return null;

    // Left edge to left edge
    if (this.config.enableEdgeSnapping) {
      const leftToLeft = Math.abs(draggedBounds.left - otherBounds.left);
      if (leftToLeft <= tolerance) {
        return {
          position: otherBounds.left,
          guide: {
            type: 'vertical' as const,
            position: otherBounds.left,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-left' as const,
          },
        };
      }

      // Right edge to right edge
      const rightToRight = Math.abs(draggedBounds.right - otherBounds.right);
      if (rightToRight <= tolerance) {
        return {
          position: otherBounds.right - draggedBounds.width,
          guide: {
            type: 'vertical' as const,
            position: otherBounds.right,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-right' as const,
          },
        };
      }

      // Left edge to right edge
      const leftToRight = Math.abs(draggedBounds.left - otherBounds.right);
      if (leftToRight <= tolerance) {
        return {
          position: otherBounds.right,
          guide: {
            type: 'vertical' as const,
            position: otherBounds.right,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-right' as const,
          },
        };
      }

      // Right edge to left edge
      const rightToLeft = Math.abs(draggedBounds.right - otherBounds.left);
      if (rightToLeft <= tolerance) {
        return {
          position: otherBounds.left - draggedBounds.width,
          guide: {
            type: 'vertical' as const,
            position: otherBounds.left,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-left' as const,
          },
        };
      }
    }

    // Center to center
    if (this.config.enableCenterSnapping) {
      const centerToCenter = Math.abs(draggedBounds.centerX - otherBounds.centerX);
      if (centerToCenter <= tolerance) {
        return {
          position: otherBounds.centerX - draggedBounds.width / 2,
          guide: {
            type: 'vertical' as const,
            position: otherBounds.centerX,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'center-x' as const,
          },
        };
      }
    }

    return null;
  }

  private checkVerticalSnap(draggedBounds: ElementBounds, otherBounds: ElementBounds) {
    const { tolerance } = this.config;

    // Check if elements are horizontally aligned (overlapping in X)
    const horizontalOverlap = !(
      draggedBounds.right < otherBounds.left ||
      draggedBounds.left > otherBounds.right
    );

    if (!horizontalOverlap) return null;

    // Top edge to top edge
    if (this.config.enableEdgeSnapping) {
      const topToTop = Math.abs(draggedBounds.top - otherBounds.top);
      if (topToTop <= tolerance) {
        return {
          position: otherBounds.top,
          guide: {
            type: 'horizontal' as const,
            position: otherBounds.top,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-top' as const,
          },
        };
      }

      // Bottom edge to bottom edge
      const bottomToBottom = Math.abs(draggedBounds.bottom - otherBounds.bottom);
      if (bottomToBottom <= tolerance) {
        return {
          position: otherBounds.bottom - draggedBounds.height,
          guide: {
            type: 'horizontal' as const,
            position: otherBounds.bottom,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-bottom' as const,
          },
        };
      }

      // Top edge to bottom edge
      const topToBottom = Math.abs(draggedBounds.top - otherBounds.bottom);
      if (topToBottom <= tolerance) {
        return {
          position: otherBounds.bottom,
          guide: {
            type: 'horizontal' as const,
            position: otherBounds.bottom,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-bottom' as const,
          },
        };
      }

      // Bottom edge to top edge
      const bottomToTop = Math.abs(draggedBounds.bottom - otherBounds.top);
      if (bottomToTop <= tolerance) {
        return {
          position: otherBounds.top - draggedBounds.height,
          guide: {
            type: 'horizontal' as const,
            position: otherBounds.top,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'edge-top' as const,
          },
        };
      }
    }

    // Center to center
    if (this.config.enableCenterSnapping) {
      const centerToCenter = Math.abs(draggedBounds.centerY - otherBounds.centerY);
      if (centerToCenter <= tolerance) {
        return {
          position: otherBounds.centerY - draggedBounds.height / 2,
          guide: {
            type: 'horizontal' as const,
            position: otherBounds.centerY,
            elements: [draggedBounds.id, otherBounds.id],
            guideType: 'center-y' as const,
          },
        };
      }
    }

    return null;
  }

  private checkSlideEdgeSnapX(draggedBounds: ElementBounds, slideWidth: number) {
    const { tolerance } = this.config;

    // Left edge to slide left
    const leftToSlideLeft = Math.abs(draggedBounds.left - 0);
    if (leftToSlideLeft <= tolerance) {
      return {
        position: 0,
        guide: {
          type: 'vertical' as const,
          position: 0,
          elements: [draggedBounds.id],
          guideType: 'edge-left' as const,
        },
      };
    }

    // Right edge to slide right
    const rightToSlideRight = Math.abs(draggedBounds.right - slideWidth);
    if (rightToSlideRight <= tolerance) {
      return {
        position: slideWidth - draggedBounds.width,
        guide: {
          type: 'vertical' as const,
          position: slideWidth,
          elements: [draggedBounds.id],
          guideType: 'edge-right' as const,
        },
      };
    }

    return null;
  }

  private checkSlideEdgeSnapY(draggedBounds: ElementBounds, slideHeight: number) {
    const { tolerance } = this.config;

    // Top edge to slide top
    const topToSlideTop = Math.abs(draggedBounds.top - 0);
    if (topToSlideTop <= tolerance) {
      return {
        position: 0,
        guide: {
          type: 'horizontal' as const,
          position: 0,
          elements: [draggedBounds.id],
          guideType: 'edge-top' as const,
        },
      };
    }

    // Bottom edge to slide bottom
    const bottomToSlideBottom = Math.abs(draggedBounds.bottom - slideHeight);
    if (bottomToSlideBottom <= tolerance) {
      return {
        position: slideHeight - draggedBounds.height,
        guide: {
          type: 'horizontal' as const,
          position: slideHeight,
          elements: [draggedBounds.id],
          guideType: 'edge-bottom' as const,
        },
      };
    }

    return null;
  }

  private checkSlideCenterSnapX(draggedBounds: ElementBounds, slideWidth: number) {
    const { tolerance } = this.config;
    const slideCenter = slideWidth / 2;

    const centerToSlideCenter = Math.abs(draggedBounds.centerX - slideCenter);
    if (centerToSlideCenter <= tolerance) {
      return {
        position: slideCenter - draggedBounds.width / 2,
        guide: {
          type: 'vertical' as const,
          position: slideCenter,
          elements: [draggedBounds.id],
          guideType: 'center-x' as const,
        },
      };
    }

    return null;
  }

  private checkSlideCenterSnapY(draggedBounds: ElementBounds, slideHeight: number) {
    const { tolerance } = this.config;
    const slideCenter = slideHeight / 2;

    const centerToSlideCenter = Math.abs(draggedBounds.centerY - slideCenter);
    if (centerToSlideCenter <= tolerance) {
      return {
        position: slideCenter - draggedBounds.height / 2,
        guide: {
          type: 'horizontal' as const,
          position: slideCenter,
          elements: [draggedBounds.id],
          guideType: 'center-y' as const,
        },
      };
    }

    return null;
  }

  /**
   * Update snap configuration
   */
  updateConfig(newConfig: Partial<SnapConfiguration>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SnapConfiguration {
    return { ...this.config };
  }
}