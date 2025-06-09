import { MockPresentationService } from './MockPresentationService';
import {
  ContentElement,
  Slide,
  TextBox,
  Image,
  Shape,
} from '../../common/domain/entities/types';
import { AIToolResult } from '../../common/domain/entities/ai-types';

/**
 * Utility functions for testing tools
 */

/**
 * Creates a test scenario with multiple elements for alignment/distribution testing
 */
export function createAlignmentTestScenario(
  mockService: MockPresentationService,
) {
  const slide = mockService.addSlide();

  const elements = [
    mockService.createMockTextElement({
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      content: 'Element 1',
    }),
    mockService.createMockTextElement({
      position: { x: 200, y: 150 },
      size: { width: 150, height: 60 },
      content: 'Element 2',
    }),
    mockService.createMockTextElement({
      position: { x: 300, y: 200 },
      size: { width: 180, height: 40 },
      content: 'Element 3',
    }),
  ];

  elements.forEach((el) => mockService.addElement(slide.id, el));

  return {
    slideId: slide.id,
    elementIds: elements.map((el) => el.id),
    elements,
  };
}

/**
 * Creates a test scenario with overlapping elements
 */
export function createOverlapTestScenario(
  mockService: MockPresentationService,
) {
  const slide = mockService.addSlide();

  const elements = [
    mockService.createMockTextElement({
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      content: 'Base element',
    }),
    mockService.createMockTextElement({
      position: { x: 150, y: 120 }, // Overlaps with first
      size: { width: 200, height: 80 },
      content: 'Overlapping element',
    }),
  ];

  elements.forEach((el) => mockService.addElement(slide.id, el));

  return {
    slideId: slide.id,
    elementIds: elements.map((el) => el.id),
    elements,
  };
}

/**
 * Creates a grid of elements for testing complex layouts
 */
export function createGridTestScenario(
  mockService: MockPresentationService,
  rows: number = 2,
  cols: number = 3,
) {
  const slide = mockService.addSlide();
  const elements: ContentElement[] = [];

  const cellWidth = 200;
  const cellHeight = 100;
  const startX = 50;
  const startY = 50;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const element = mockService.createMockTextElement({
        position: {
          x: startX + col * (cellWidth + 20),
          y: startY + row * (cellHeight + 20),
        },
        size: { width: cellWidth, height: cellHeight },
        content: `Element ${row}-${col}`,
      });

      elements.push(element);
      mockService.addElement(slide.id, element);
    }
  }

  return {
    slideId: slide.id,
    elementIds: elements.map((el) => el.id),
    elements,
    grid: { rows, cols, cellWidth, cellHeight },
  };
}

/**
 * Asserts that elements are aligned correctly
 */
export function assertElementsAligned(
  elements: ContentElement[],
  alignType:
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'center-horizontal'
    | 'center-vertical',
  tolerance: number = 1,
) {
  if (elements.length < 2) return;

  const getAlignValue = (element: ContentElement) => {
    switch (alignType) {
      case 'left':
        return element.position.x;
      case 'right':
        return element.position.x + element.size.width;
      case 'top':
        return element.position.y;
      case 'bottom':
        return element.position.y + element.size.height;
      case 'center-horizontal':
        return element.position.x + element.size.width / 2;
      case 'center-vertical':
        return element.position.y + element.size.height / 2;
      default:
        throw new Error(`Unknown align type: ${alignType}`);
    }
  };

  const firstValue = getAlignValue(elements[0]);

  elements.forEach((element, index) => {
    const value = getAlignValue(element);
    expect(Math.abs(value - firstValue)).toBeLessThanOrEqual(tolerance);
  });
}

/**
 * Asserts that elements are distributed evenly
 */
export function assertElementsDistributedEvenly(
  elements: ContentElement[],
  direction: 'horizontal' | 'vertical',
  tolerance: number = 1,
) {
  if (elements.length < 3) return;

  const sortedElements = [...elements].sort((a, b) => {
    if (direction === 'horizontal') {
      return a.position.x - b.position.x;
    }
    return a.position.y - b.position.y;
  });

  const gaps: number[] = [];

  for (let i = 0; i < sortedElements.length - 1; i++) {
    const current = sortedElements[i];
    const next = sortedElements[i + 1];

    let gap: number;
    if (direction === 'horizontal') {
      gap = next.position.x - (current.position.x + current.size.width);
    } else {
      gap = next.position.y - (current.position.y + current.size.height);
    }

    gaps.push(gap);
  }

  // All gaps should be approximately equal
  const firstGap = gaps[0];
  gaps.forEach((gap) => {
    expect(Math.abs(gap - firstGap)).toBeLessThanOrEqual(tolerance);
  });
}

/**
 * Creates a performance test with many elements
 */
export function createPerformanceTestScenario(
  mockService: MockPresentationService,
  elementCount: number = 100,
) {
  const slide = mockService.addSlide();
  const elements: ContentElement[] = [];

  for (let i = 0; i < elementCount; i++) {
    const element = mockService.createMockTextElement({
      position: {
        x: Math.random() * 1000,
        y: Math.random() * 600,
      },
      content: `Performance Test Element ${i}`,
    });

    elements.push(element);
    mockService.addElement(slide.id, element);
  }

  return {
    slideId: slide.id,
    elementIds: elements.map((el) => el.id),
    elements,
  };
}

/**
 * Measures execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  return {
    result,
    timeMs: end - start,
  };
}

/**
 * Validates tool result structure
 */
export function validateToolResult(result: any) {
  expect(result).toHaveProperty('success');
  expect(typeof result.success).toBe('boolean');

  if (result.success) {
    expect(result).toHaveProperty('data');
  } else {
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  }
}

/**
 * Creates mock environment variables for testing tools that need them
 */
export function setupMockEnvironment() {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      PEXELS_API_KEY: 'mock-pexels-api-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });
}

/**
 * Creates a slide with the given elements
 */
export function createSlideWithElements(elements: ContentElement[]): Slide {
  const slideId = `slide-${Date.now()}-${Math.random()}`;
  return {
    id: slideId,
    elements: elements.map((el) => ({ ...el })),
    background: '#ffffff',
  };
}

/**
 * Creates a text element for testing
 */
export function createTextElement(
  content: string,
  x: number,
  y: number,
  width: number = 400,
  height: number = 200,
  color: string = '#000000',
  zIndex: number = 1,
): TextBox {
  return {
    id: `element-${Date.now()}-${Math.random()}`,
    type: 'textbox',
    position: { x, y },
    size: { width, height },
    content,
    color,
    zIndex,
  };
}

/**
 * Creates an image element for testing
 */
export function createImageElement(
  content: string,
  x: number,
  y: number,
  width: number = 200,
  height: number = 150,
  zIndex: number = 1,
): Image {
  return {
    id: `element-${Date.now()}-${Math.random()}`,
    type: 'image',
    position: { x, y },
    size: { width, height },
    content,
    zIndex,
  };
}

/**
 * Creates a shape element for testing
 */
export function createShapeElement(
  shapeType: 'rectangle' | 'circle' | 'triangle',
  x: number,
  y: number,
  width: number = 100,
  height: number = 100,
  fillColor: string = '#0066cc',
  zIndex: number = 1,
): Shape {
  return {
    id: `element-${Date.now()}-${Math.random()}`,
    type: shapeType,
    position: { x, y },
    size: { width, height },
    fillColor,
    strokeColor: '#000000',
    strokeWidth: 1,
    zIndex,
  };
}

/**
 * Asserts that a tool result indicates success
 */
export function expectToolSuccess(result: AIToolResult) {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.error).toBeUndefined();
}

/**
 * Asserts that a tool result indicates an error with the expected message
 */
export function expectToolError(result: AIToolResult, expectedError?: string) {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.data).toBeUndefined();

  if (expectedError) {
    expect(result.error).toBe(expectedError);
  }
}
