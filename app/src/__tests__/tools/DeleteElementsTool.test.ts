import { DeleteElementsTool } from '../../main/ai/tools/tools/DeleteElementsTool';
import { MockPresentationService } from './MockPresentationService';

describe('DeleteElementsTool', () => {
    let tool: DeleteElementsTool;
    let mockService: MockPresentationService;
    let slideA: string;
    let slideB: string;

    beforeEach(() => {
        tool = new DeleteElementsTool();
        mockService = new MockPresentationService();
        slideA = mockService.addSlide().id;
        slideB = mockService.addSlide().id;
        mockService.addElement(
            slideA,
            mockService.createMockTextElement({ id: 'e1' }),
        );
        mockService.addElement(
            slideA,
            mockService.createMockTextElement({ id: 'e2' }),
        );
        mockService.addElement(
            slideB,
            mockService.createMockImageElement({ id: 'e3' }),
        );
    });

    it('deletes multiple elements across slides', async () => {
        const result = await tool.execute(
            { elementIds: ['e1', 'e3'] },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.deleted).toHaveLength(2);
        expect(result.editedSlidesIds?.sort()).toEqual([slideA, slideB].sort());
        expect(mockService.getElementById('e1')).toBeNull();
        expect(mockService.getElementById('e3')).toBeNull();
        expect(mockService.getElementById('e2')).not.toBeNull();
    });

    it('continues past missing elements and reports them', async () => {
        const result = await tool.execute(
            { elementIds: ['e1', 'ghost', 'e2'] },
            mockService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data.deleted.map((d: any) => d.elementId)).toEqual([
            'e1',
            'e2',
        ]);
        expect(result.data.notFound).toEqual(['ghost']);
        expect(result.data.message).toContain('ghost');
    });

    it('fails when no elements exist', async () => {
        const result = await tool.execute(
            { elementIds: ['ghost1', 'ghost2'] },
            mockService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('ghost1');
    });
});
