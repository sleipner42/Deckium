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
        expect(result.error).toContain('Unknown function');
    });

    describe('code injection resistance', () => {
        const injections = [
            'sqrt(4) && process.exit(1)',
            'min(1, globalThis.x = 5)',
            "pow(2, require('fs'))",
            'sqrt(4); console.log(1)',
            'constructor.constructor("return 1")()',
            '[].map(min)',
        ];

        for (const expression of injections) {
            it(`rejects: ${expression}`, async () => {
                const result = await calculatorTool.execute(
                    { expression },
                    mockPresentationService as any,
                );

                expect(result.success).toBe(false);
            });
        }

        it('never executes side effects', async () => {
            const globalRecord = globalThis as Record<string, unknown>;
            await calculatorTool.execute(
                { expression: 'min(1, globalThis.__calcInjected = 5)' },
                mockPresentationService as any,
            );
            expect(globalRecord.__calcInjected).toBeUndefined();
        });
    });

    it('handles modulo and nested functions', async () => {
        const result = await calculatorTool.execute(
            { expression: 'round(sqrt(pow(3, 2) + pow(4, 2))) % 3' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(2);
    });

    it('handles unary minus', async () => {
        const result = await calculatorTool.execute(
            { expression: '-5 + 10' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(5);
    });

    it('reports division producing non-finite results', async () => {
        const result = await calculatorTool.execute(
            { expression: '1/0' },
            mockPresentationService as any,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('not a finite number');
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
