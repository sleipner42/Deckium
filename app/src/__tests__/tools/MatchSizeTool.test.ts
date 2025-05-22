import { MatchSizeTool } from '../../main/ai/tools/tools/MatchSizeTool';
import { MockPresentationService } from './MockPresentationService';
import { createAlignmentTestScenario, validateToolResult } from './test-utils';

describe('MatchSizeTool', () => {
  let tool: MatchSizeTool;
  let mockService: MockPresentationService;

  beforeEach(() => {
    tool = new MatchSizeTool();
    mockService = new MockPresentationService();
  });

  describe('Parameter Validation', () => {
    it('should return error when slideId is missing', async () => {
      const result = await tool.execute({
        elementIds: 'el1,el2',
        sizeMode: 'width',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('slideId is required');
    });

    it('should return error when elementIds is missing', async () => {
      const slide = mockService.addSlide();
      const result = await tool.execute({
        slideId: slide.id,
        sizeMode: 'width',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('elementIds is required');
    });

    it('should return error when sizeMode is invalid', async () => {
      const slide = mockService.addSlide();
      const result = await tool.execute({
        slideId: slide.id,
        elementIds: 'el1,el2',
        sizeMode: 'invalid-mode',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('sizeMode must be one of');
    });

    it('should return error when less than 2 elements provided', async () => {
      const slide = mockService.addSlide();
      const result = await tool.execute({
        slideId: slide.id,
        elementIds: 'el1',
        sizeMode: 'width',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least two elements are required for size matching');
    });
  });

  describe('Width Matching', () => {
    it('should match widths using first element as reference', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'width',
      }, mockService as any);

      validateToolResult(result);
      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have the same width as the first element (200)
      elements.forEach(el => {
        expect(el.size.width).toBe(200);
      });
    });

    it('should match widths to largest element', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'largest-width',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have width of 200 (the largest)
      elements.forEach(el => {
        expect(el.size.width).toBe(200);
      });
    });

    it('should match widths to smallest element', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'smallest-width',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have width of 150 (the smallest)
      elements.forEach(el => {
        expect(el.size.width).toBe(150);
      });
    });
  });

  describe('Height Matching', () => {
    it('should match heights using first element as reference', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'height',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have the same height as the first element (50)
      elements.forEach(el => {
        expect(el.size.height).toBe(50);
      });
    });

    it('should match heights to largest element', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'largest-height',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have height of 60 (the largest)
      elements.forEach(el => {
        expect(el.size.height).toBe(60);
      });
    });
  });

  describe('Both Dimensions Matching', () => {
    it('should match both width and height', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'both',
        maintainAspectRatio: 'false',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have the same dimensions as the first element
      elements.forEach(el => {
        expect(el.size.width).toBe(200);
        expect(el.size.height).toBe(50);
      });
    });

    it('should maintain aspect ratio when requested', async () => {
      const slide = mockService.addSlide();
      
      // Create elements with different aspect ratios
      const el1 = mockService.createMockTextElement({
        size: { width: 200, height: 100 }, // 2:1 ratio
      });
      const el2 = mockService.createMockTextElement({
        size: { width: 300, height: 200 }, // 1.5:1 ratio
      });
      
      mockService.addElement(slide.id, el1);
      mockService.addElement(slide.id, el2);

      const result = await tool.execute({
        slideId: slide.id,
        elementIds: `${el1.id},${el2.id}`,
        sizeMode: 'both',
        maintainAspectRatio: 'true',
      }, mockService as any);

      expect(result.success).toBe(true);

      const updatedSlide = mockService.getSlideById(slide.id);
      const elements = updatedSlide?.elements || [];
      
      // Check that aspect ratios are maintained
      elements.forEach(el => {
        const originalAspectRatio = el === el1 ? 2 : 1.5;
        const newAspectRatio = el.size.width / el.size.height;
        expect(Math.abs(newAspectRatio - originalAspectRatio)).toBeLessThan(0.1);
      });
    });
  });

  describe('Reference Element', () => {
    it('should use specified reference element', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);
      const referenceElementId = elementIds[1]; // Use second element as reference

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'width',
        referenceElementId,
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have width of reference element (150)
      elements.forEach(el => {
        expect(el.size.width).toBe(150);
      });
    });

    it('should return error when reference element not in list', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);
      const outsideElement = mockService.createMockTextElement();
      mockService.addElement(slideId, outsideElement);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','), // Reference not included
        sizeMode: 'width',
        referenceElementId: outsideElement.id,
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reference element with ID');
    });
  });

  describe('Safety Features', () => {
    it('should enforce minimum size limits', async () => {
      const slide = mockService.addSlide();
      
      const el1 = mockService.createMockTextElement({
        size: { width: 5, height: 5 }, // Very small
      });
      const el2 = mockService.createMockTextElement({
        size: { width: 200, height: 100 },
      });
      
      mockService.addElement(slide.id, el1);
      mockService.addElement(slide.id, el2);

      const result = await tool.execute({
        slideId: slide.id,
        elementIds: `${el1.id},${el2.id}`,
        sizeMode: 'smallest-both',
      }, mockService as any);

      expect(result.success).toBe(true);

      const updatedSlide = mockService.getSlideById(slide.id);
      const elements = updatedSlide?.elements || [];
      
      // Elements should not be smaller than 10px
      elements.forEach(el => {
        expect(el.size.width).toBeGreaterThanOrEqual(10);
        expect(el.size.height).toBeGreaterThanOrEqual(10);
      });
    });

    it('should respect slide boundaries', async () => {
      const slide = mockService.addSlide();
      
      // Create element near right edge
      const el1 = mockService.createMockTextElement({
        position: { x: 1200, y: 100 },
        size: { width: 50, height: 50 },
      });
      const el2 = mockService.createMockTextElement({
        size: { width: 500, height: 100 }, // Very wide
      });
      
      mockService.addElement(slide.id, el1);
      mockService.addElement(slide.id, el2);

      const result = await tool.execute({
        slideId: slide.id,
        elementIds: `${el1.id},${el2.id}`,
        sizeMode: 'largest-width',
      }, mockService as any);

      expect(result.success).toBe(true);

      const updatedSlide = mockService.getSlideById(slide.id);
      const element = updatedSlide?.elements.find(el => el.id === el1.id);
      
      // Element should not exceed slide width
      if (element) {
        expect(element.position.x + element.size.width).toBeLessThanOrEqual(1280);
      }
    });
  });

  describe('No Changes Needed', () => {
    it('should return success when elements already match', async () => {
      const slide = mockService.addSlide();
      
      // Create elements with same width
      const el1 = mockService.createMockTextElement({
        size: { width: 200, height: 50 },
      });
      const el2 = mockService.createMockTextElement({
        size: { width: 200, height: 100 },
      });
      
      mockService.addElement(slide.id, el1);
      mockService.addElement(slide.id, el2);

      const result = await tool.execute({
        slideId: slide.id,
        elementIds: `${el1.id},${el2.id}`,
        sizeMode: 'width',
      }, mockService as any);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Elements already have matching sizes as requested');
    });
  });

  describe('Detailed Feedback', () => {
    it('should provide detailed size change information', async () => {
      const { slideId, elementIds } = createAlignmentTestScenario(mockService);

      const result = await tool.execute({
        slideId,
        elementIds: elementIds.join(','),
        sizeMode: 'largest-width',
      }, mockService as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sizeChanges');
      expect(result.data).toHaveProperty('elementsResized');
      expect(result.data).toHaveProperty('targetSize');
      expect(result.data).toHaveProperty('maintainedAspectRatio');
      
      expect(Array.isArray(result.data.sizeChanges)).toBe(true);
      expect(typeof result.data.elementsResized).toBe('number');
    });
  });
});