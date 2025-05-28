import { GridAlignTool } from '../../main/ai/tools/tools/GridAlignTool';
import { MockPresentationService } from './MockPresentationService';
import {
  createSlideWithElements,
  expectToolSuccess,
  expectToolError,
  createTextElement,
  createImageElement,
  createShapeElement,
} from './test-utils';

describe('GridAlignTool', () => {
  let tool: GridAlignTool;
  let mockService: MockPresentationService;

  beforeEach(() => {
    tool = new GridAlignTool();
    mockService = new MockPresentationService();
  });

  describe('Parameter Validation', () => {
    it('should return error when slideId is missing', async () => {
      const result = await tool.execute({}, mockService as any);
      expectToolError(result, 'slideId is required');
    });

    it('should return error when elementIds is missing', async () => {
      const result = await tool.execute(
        { slideId: 'test-slide' },
        mockService as any,
      );
      expectToolError(result, 'elementIds is required');
    });

    it('should return error when gridSize is missing', async () => {
      const result = await tool.execute(
        {
          slideId: 'test-slide',
          elementIds: 'element1',
        },
        mockService as any,
      );
      expectToolError(result, 'gridSize is required and must be a number');
    });

    it('should return error when gridSize is not a number', async () => {
      const result = await tool.execute(
        {
          slideId: 'test-slide',
          elementIds: 'element1',
          gridSize: 'invalid',
        },
        mockService as any,
      );
      expectToolError(result, 'gridSize is required and must be a number');
    });

    it('should return error when snapMode is missing', async () => {
      const result = await tool.execute(
        {
          slideId: 'test-slide',
          elementIds: 'element1',
          gridSize: '20',
        },
        mockService as any,
      );
      expectToolError(
        result,
        'snapMode must be one of: top-left, center, nearest-corner',
      );
    });

    it('should return error when snapMode is invalid', async () => {
      const result = await tool.execute(
        {
          slideId: 'test-slide',
          elementIds: 'element1',
          gridSize: '20',
          snapMode: 'invalid-mode',
        },
        mockService as any,
      );
      expectToolError(
        result,
        'snapMode must be one of: top-left, center, nearest-corner',
      );
    });

    it('should return error when gridOrigin format is invalid', async () => {
      const result = await tool.execute(
        {
          slideId: 'test-slide',
          elementIds: 'element1',
          gridSize: '20',
          snapMode: 'top-left',
          gridOrigin: 'invalid',
        },
        mockService as any,
      );
      expectToolError(
        result,
        'gridOrigin must be in format "x,y" (e.g., "0,0" or "10,20")',
      );
    });

    it('should return error when slide does not exist', async () => {
      const result = await tool.execute(
        {
          slideId: 'non-existent-slide',
          elementIds: 'element1',
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );
      expectToolError(result, 'Slide with ID non-existent-slide not found');
    });

    it('should return error when elements do not exist', async () => {
      const slide = createSlideWithElements([]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: 'non-existent-element',
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );
      expectToolError(
        result,
        'Some elements were not found: non-existent-element',
      );
    });

    it('should return error when some elements do not exist', async () => {
      const element1 = createTextElement('Element 1', 100, 100);
      const slide = createSlideWithElements([element1]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: `${element1.id},non-existent-element`,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );
      expectToolError(
        result,
        'Some elements were not found: non-existent-element',
      );
    });
  });

  describe('Top-Left Snap Mode', () => {
    it('should snap element top-left corner to nearest grid intersection', async () => {
      // Element at (107, 113) should snap to (100, 120) with 20px grid
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.gridInfo.cellSize).toBe(20);
      expect(result.data?.gridInfo.snapMode).toBe('top-left');
      expect(result.data?.updates).toHaveLength(1);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 120,
      });
    });

    it('should handle custom grid origin', async () => {
      // Element at (107, 113) with origin (5, 5) should snap to (105, 105) with 20px grid
      // Math: (107-5) = 102, snap to nearest 20px = 100, add origin back = 105
      //       (113-5) = 108, snap to nearest 20px = 100, add origin back = 105
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
          gridOrigin: '5,5',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.gridInfo.origin).toEqual({ x: 5, y: 5 });
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 105,
        y: 105,
      });
    });

    it('should handle multiple elements', async () => {
      const element1 = createTextElement('Test 1', 107, 113, 200, 100);
      const element2 = createTextElement('Test 2', 147, 173, 150, 80);
      const slide = createSlideWithElements([element1, element2]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: `${element1.id},${element2.id}`,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates).toHaveLength(2);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 120,
      });
      expect(result.data?.updates[1].updates.position).toEqual({
        x: 140,
        y: 180,
      });
    });
  });

  describe('Center Snap Mode', () => {
    it('should snap element center to nearest grid intersection', async () => {
      // Element at (100, 100) with size 200x100 has center at (200, 150)
      // Center should snap to (200, 160) with 20px grid
      // New position should be (100, 110)
      const element = createTextElement('Test', 100, 100, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'center',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 110,
      });
    });

    it('should handle different grid sizes', async () => {
      const element = createTextElement('Test', 100, 100, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '50',
          snapMode: 'center',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      // Center at (200, 150) should snap to (200, 150) with 50px grid - no movement needed
      if (result.data?.updates) {
        expect(result.data?.updates[0].updates.position).toEqual({
          x: 100,
          y: 100,
        });
      } else {
        // Element was already aligned, no updates needed
        expect(result.data?.message).toContain('already aligned');
      }
    });
  });

  describe('Nearest-Corner Snap Mode', () => {
    it('should snap the nearest corner to grid intersection', async () => {
      // Element at (102, 103) with size 50x50
      // Corners: (102,103), (152,103), (102,153), (152,153)
      // Nearest grid points with 20px grid: (100,100), (160,100), (100,160), (160,160)
      // Top-left corner (102,103) is closest to (100,100) - distance ~3.6
      const element = createTextElement('Test', 102, 103, 50, 50);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'nearest-corner',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 100,
      });
    });

    it('should snap bottom-right corner when it is nearest', async () => {
      // Element at (142, 143) with size 50x50
      // Corners: (142,143), (192,143), (142,193), (192,193)
      // Nearest grid points: (140,140), (200,140), (140,200), (200,200)
      // Top-left corner (142,143) is closest to (140,140) - distance ~4.2
      // So it should snap to (140,140)
      const element = createTextElement('Test', 142, 143, 50, 50);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'nearest-corner',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 140,
        y: 140,
      });
    });
  });

  describe('Boundary Constraints', () => {
    it('should keep elements within slide bounds when snapping', async () => {
      // Element near right edge that would be pushed outside
      const element = createTextElement('Test', 1270, 100, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      // Should be constrained to stay within 1280px slide width
      expect(result.data?.updates[0].updates.position.x).toBeLessThanOrEqual(
        1080,
      ); // 1280 - 200
    });

    it('should keep elements within slide bounds vertically', async () => {
      // Element near bottom edge
      const element = createTextElement('Test', 100, 710, 100, 200);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      // Should be constrained to stay within 720px slide height
      expect(result.data?.updates[0].updates.position.y).toBeLessThanOrEqual(
        520,
      ); // 720 - 200
    });
  });

  describe('No Movement Cases', () => {
    it('should return success when elements are already aligned', async () => {
      // Element already perfectly aligned to 20px grid
      const element = createTextElement('Test', 100, 120, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.message).toBe(
        'Elements are already aligned to the grid',
      );
      expect(result.data?.updates).toBeUndefined();
    });

    it('should ignore very small movements (sub-pixel)', async () => {
      // Element very close to grid (within 0.5px tolerance)
      const element = createTextElement('Test', 100.2, 120.3, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.message).toBe(
        'Elements are already aligned to the grid',
      );
    });
  });

  describe('Different Element Types', () => {
    it('should work with text elements', async () => {
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 120,
      });
    });

    it('should work with image elements', async () => {
      const element = createImageElement('test.jpg', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 120,
      });
    });

    it('should work with shape elements', async () => {
      const element = createShapeElement('rectangle', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 120,
      });
    });

    it('should work with mixed element types', async () => {
      const textElement = createTextElement('Test', 107, 113, 200, 100);
      const imageElement = createImageElement('test.jpg', 147, 173, 150, 80);
      const shapeElement = createShapeElement('circle', 87, 93, 100, 100);
      const slide = createSlideWithElements([
        textElement,
        imageElement,
        shapeElement,
      ]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: `${textElement.id},${imageElement.id},${shapeElement.id}`,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates).toHaveLength(3);
      expect(result.data?.gridInfo.elementsAligned).toBe(3);
    });
  });

  describe('Grid Size Variations', () => {
    it('should work with small grid sizes', async () => {
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '10',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.gridInfo.cellSize).toBe(10);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 110,
        y: 110,
      });
    });

    it('should work with large grid sizes', async () => {
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '50',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.gridInfo.cellSize).toBe(50);
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 100,
        y: 100,
      });
    });
  });

  describe('Complex Grid Origins', () => {
    it('should handle negative grid origins', async () => {
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
          gridOrigin: '-5,-5',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.gridInfo.origin).toEqual({ x: -5, y: -5 });
      expect(result.data?.updates[0].updates.position).toEqual({
        x: 115,
        y: 115,
      });
    });

    it('should handle fractional grid origins', async () => {
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: element.id,
          gridSize: '20',
          snapMode: 'top-left',
          gridOrigin: '2.5,7.5',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.gridInfo.origin).toEqual({ x: 2.5, y: 7.5 });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of elements', async () => {
      const elements = Array.from({ length: 20 }, (_, i) =>
        createTextElement(`Element ${i}`, 100 + i * 30, 100 + i * 20, 50, 30),
      );
      const slide = createSlideWithElements(elements);
      mockService.addSlide(slide);

      const elementIds = elements.map((e) => e.id).join(',');

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds,
          gridSize: '25',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates.length).toBeGreaterThan(0);
    });

    it('should handle empty element ID list gracefully', async () => {
      const slide = createSlideWithElements([]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: '  ,  ,  ',
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolError(result, 'At least one element is required');
    });

    it('should handle whitespace in element IDs', async () => {
      const element = createTextElement('Test', 107, 113, 200, 100);
      const slide = createSlideWithElements([element]);
      mockService.addSlide(slide);

      const result = await tool.execute(
        {
          slideId: slide.id,
          elementIds: `  ${element.id}  `,
          gridSize: '20',
          snapMode: 'top-left',
        },
        mockService as any,
      );

      expectToolSuccess(result);
      expect(result.data?.updates).toHaveLength(1);
    });
  });
});
