import { CalculatorTool } from '../../main/ai/tools/tools/CalculatorTool';
import { MockPresentationService } from './MockPresentationService';

describe('CalculatorTool', () => {
    let calculatorTool: CalculatorTool;
    let mockPresentationService: MockPresentationService;

    beforeEach(() => {
        calculatorTool = new CalculatorTool();
        mockPresentationService = new MockPresentationService();
    });

    it('should calculate basic arithmetic operations', async () => {
        const result = await calculatorTool.execute(
            { expression: '(500+500)/2' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(500);
        expect(result.data?.message).toBe('(500+500)/2 = 500');
    });

    it('should handle decimal results', async () => {
        const result = await calculatorTool.execute(
            { expression: '1280/3' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBeCloseTo(426.67, 2);
        expect(result.data?.formatted).toBe('426.67');
    });

    it('should support mathematical functions', async () => {
        const result = await calculatorTool.execute(
            { expression: 'sqrt(64)' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(8);
        expect(result.data?.message).toBe('sqrt(64) = 8');
    });

    it('should handle complex expressions', async () => {
        const result = await calculatorTool.execute(
            { expression: 'max(100, 200) + min(50, 30)' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(230);
    });

    it('should return error for invalid expressions', async () => {
        const result = await calculatorTool.execute(
            { expression: 'invalid expression' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
    });

    it('should return error for missing expression', async () => {
        const result = await calculatorTool.execute(
            {},
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Expression is required');
    });

    it('should handle slide dimension calculations', async () => {
        const result = await calculatorTool.execute(
            { expression: '1280 - 100 * 2' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(1080);
    });
});
