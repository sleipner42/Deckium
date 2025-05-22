import { AlignElementsTool } from '../../main/ai/tools/tools/AlignElementsTool';
import { MockPresentationService } from './MockPresentationService';

describe('AlignElementsTool', () => {
  let tool: AlignElementsTool;
  let mockService: MockPresentationService;
  let slideId: string;

  beforeEach(() => {
    tool = new AlignElementsTool();
    mockService = new MockPresentationService();
    
    // Add a test slide
    const slide = mockService.addSlide();
    slideId = slide.id;
  });

  describe('Parameter Validation', () => {
    it('should return error when slideId is missing', async () => {
      const result = await tool.execute({
        elementIds: 'el1,el2',
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('slideId is required');
    });

    it('should return error when elementIds is missing', async () => {
      const result = await tool.execute({
        slideId,
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('elementIds is required');
    });

    it('should return error when alignType is invalid', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: 'el1,el2',
        alignType: 'invalid-type',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('alignType must be one of');
    });

    it('should return error when less than 2 elements provided', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: 'el1',
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least two elements are required for alignment');
    });
  });

  describe('Element Finding', () => {
    it('should return error when slide not found', async () => {
      const result = await tool.execute({
        slideId: 'non-existent',
        elementIds: 'el1,el2',
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slide with ID non-existent not found');
    });

    it('should return error when elements not found', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: 'non-existent-1,non-existent-2',
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Some elements were not found');
    });
  });

  describe('Horizontal Alignment', () => {
    let element1Id: string;
    let element2Id: string;
    let element3Id: string;

    beforeEach(() => {
      // Add test elements with different positions
      const el1 = mockService.createMockTextElement({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
      });
      const el2 = mockService.createMockTextElement({
        position: { x: 150, y: 200 },
        size: { width: 200, height: 50 },
      });
      const el3 = mockService.createMockTextElement({
        position: { x: 200, y: 300 },
        size: { width: 200, height: 50 },
      });

      mockService.addElement(slideId, el1);
      mockService.addElement(slideId, el2);
      mockService.addElement(slideId, el3);

      element1Id = el1.id;
      element2Id = el2.id;
      element3Id = el3.id;
    });

    it('should align elements to the left', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id},${element3Id}`,
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have the same x position (leftmost = 100)
      elements.forEach(el => {
        expect(el.position.x).toBe(100);
      });
    });

    it('should align elements to the right', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id},${element3Id}`,
        alignType: 'right',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should align to the rightmost edge (200 + 200 = 400)
      const rightEdge = 400;
      elements.forEach(el => {
        expect(el.position.x).toBe(rightEdge - el.size.width);
      });
    });

    it('should center align elements horizontally', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id},${element3Id}`,
        alignType: 'center-horizontal',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have the same center x position
      const firstCenter = elements[0].position.x + elements[0].size.width / 2;
      elements.forEach(el => {
        const centerX = el.position.x + el.size.width / 2;
        expect(Math.abs(centerX - firstCenter)).toBeLessThan(1); // Allow for rounding
      });
    });
  });

  describe('Vertical Alignment', () => {
    let element1Id: string;
    let element2Id: string;

    beforeEach(() => {
      const el1 = mockService.createMockTextElement({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
      });
      const el2 = mockService.createMockTextElement({
        position: { x: 300, y: 200 },
        size: { width: 200, height: 100 },
      });

      mockService.addElement(slideId, el1);
      mockService.addElement(slideId, el2);

      element1Id = el1.id;
      element2Id = el2.id;
    });

    it('should align elements to the top', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id}`,
        alignType: 'top',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should have the same y position (topmost = 100)
      elements.forEach(el => {
        expect(el.position.y).toBe(100);
      });
    });

    it('should align elements to the bottom', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id}`,
        alignType: 'bottom',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should align to the bottommost edge (200 + 100 = 300)
      const bottomEdge = 300;
      elements.forEach(el => {
        expect(el.position.y).toBe(bottomEdge - el.size.height);
      });
    });
  });

  describe('Reference Element Alignment', () => {
    let element1Id: string;
    let element2Id: string;
    let referenceId: string;

    beforeEach(() => {
      const el1 = mockService.createMockTextElement({
        position: { x: 100, y: 100 },
      });
      const el2 = mockService.createMockTextElement({
        position: { x: 200, y: 200 },
      });
      const ref = mockService.createMockTextElement({
        position: { x: 300, y: 150 },
      });

      mockService.addElement(slideId, el1);
      mockService.addElement(slideId, el2);
      mockService.addElement(slideId, ref);

      element1Id = el1.id;
      element2Id = el2.id;
      referenceId = ref.id;
    });

    it('should use reference element for alignment', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id},${referenceId}`,
        alignType: 'left',
        referenceElementId: referenceId,
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // All elements should align to reference element's x position (300)
      elements.forEach(el => {
        expect(el.position.x).toBe(300);
      });
    });

    it('should return error when reference element not in elementIds', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id}`, // Reference not included
        alignType: 'left',
        referenceElementId: referenceId,
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reference element with ID');
    });
  });

  describe('Distribution', () => {
    let element1Id: string;
    let element2Id: string;
    let element3Id: string;

    beforeEach(() => {
      const el1 = mockService.createMockTextElement({
        position: { x: 100, y: 100 },
        size: { width: 100, height: 50 },
      });
      const el2 = mockService.createMockTextElement({
        position: { x: 300, y: 100 },
        size: { width: 100, height: 50 },
      });
      const el3 = mockService.createMockTextElement({
        position: { x: 500, y: 100 },
        size: { width: 100, height: 50 },
      });

      mockService.addElement(slideId, el1);
      mockService.addElement(slideId, el2);
      mockService.addElement(slideId, el3);

      element1Id = el1.id;
      element2Id = el2.id;
      element3Id = el3.id;
    });

    it('should distribute elements horizontally', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id},${element3Id}`,
        alignType: 'distribute-horizontal',
      }, mockService as any);

      expect(result.success).toBe(true);

      const slide = mockService.getSlideById(slideId);
      const elements = slide?.elements || [];
      
      // Should have even spacing between elements
      const sortedElements = elements.sort((a, b) => a.position.x - b.position.x);
      
      // First and last elements should remain in place
      expect(sortedElements[0].position.x).toBe(100);
      expect(sortedElements[2].position.x).toBe(500);
      
      // Middle element should be evenly spaced
      const gap1 = sortedElements[1].position.x - (sortedElements[0].position.x + sortedElements[0].size.width);
      const gap2 = sortedElements[2].position.x - (sortedElements[1].position.x + sortedElements[1].size.width);
      expect(Math.abs(gap1 - gap2)).toBeLessThan(1); // Should be equal gaps
    });

    it('should require at least 3 elements for distribution', async () => {
      const result = await tool.execute({
        slideId,
        elementIds: `${element1Id},${element2Id}`,
        alignType: 'distribute-horizontal',
      }, mockService as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least three elements are required for distribution');
    });
  });

  describe('No Changes Needed', () => {
    it('should return success when elements are already aligned', async () => {
      // Create elements that are already left-aligned
      const el1 = mockService.createMockTextElement({
        position: { x: 100, y: 100 },
      });
      const el2 = mockService.createMockTextElement({
        position: { x: 100, y: 200 },
      });

      mockService.addElement(slideId, el1);
      mockService.addElement(slideId, el2);

      const result = await tool.execute({
        slideId,
        elementIds: `${el1.id},${el2.id}`,
        alignType: 'left',
      }, mockService as any);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Elements are already aligned as requested');
    });
  });
});