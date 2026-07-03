import { z } from 'zod';
import type { AIToolResult } from '../../../../common/domain/entities/ai-types';
import type { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';
import { evaluateExpression } from '../utils/math-eval';

export class CalculatorTool extends BaseTool {
    name = 'calculator';

    description =
        'Calculate mathematical expressions for dimensions, positions, and other numeric values';

    inputSchema = z.object({
        expression: z
            .string()
            .describe(
                "Mathematical expression to evaluate (e.g., '(500+500)/2', '1280/3', '720-100', 'sqrt(64)', 'pow(2,3)'). Supports basic arithmetic (+, -, *, /), parentheses, and common functions like sqrt, pow, abs, round, floor, ceil, min, max.",
            ),
    });

    protected async executeImpl(
        params: Record<string, any>,
        _presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const { expression } = params;

        if (!expression) {
            return {
                success: false,
                error: 'Expression is required',
            };
        }

        if (typeof expression !== 'string') {
            return {
                success: false,
                error: 'Expression must be a string',
            };
        }

        try {
            const result = evaluateExpression(expression.trim());

            return {
                success: true,
                data: {
                    expression: expression.trim(),
                    result: result,
                    formatted: Number.isInteger(result)
                        ? result.toString()
                        : result.toFixed(2),
                    message: `${expression.trim()} = ${Number.isInteger(result) ? result : result.toFixed(2)}`,
                },
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to evaluate expression',
            };
        }
    }
}
