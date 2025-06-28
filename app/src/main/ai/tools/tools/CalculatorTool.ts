import type { AIToolResult } from "../../../../common/domain/entities/ai-types";
import type { PresentationService } from "../../../presentation/service";
import { BaseTool } from "../BaseTool";

export class CalculatorTool extends BaseTool {
	name = "calculator";

	description =
		"Calculate mathematical expressions for dimensions, positions, and other numeric values";

	requiredParams = {
		expression:
			"Mathematical expression to evaluate (e.g., '(500+500)/2', '1280/3', '720-100', 'sqrt(64)', 'pow(2,3)'). Supports basic arithmetic (+, -, *, /), parentheses, and common functions like sqrt, pow, abs, round, floor, ceil, min, max.",
	};

	private safeEvaluate(expression: string): number {
		const cleanExpression = expression.replace(
			/[^0-9+\-*/().\s,]/g,
			(match) => {
				const allowedFunctions = [
					"sqrt",
					"pow",
					"abs",
					"round",
					"floor",
					"ceil",
					"min",
					"max",
				];
				for (const func of allowedFunctions) {
					if (expression.includes(func)) {
						return match;
					}
				}
				throw new Error(`Invalid character or function: ${match}`);
			},
		);

		const context = {
			sqrt: Math.sqrt,
			pow: Math.pow,
			abs: Math.abs,
			round: Math.round,
			floor: Math.floor,
			ceil: Math.ceil,
			min: Math.min,
			max: Math.max,
		};

		try {
			const func = new Function(
				...Object.keys(context),
				`return ${cleanExpression}`,
			);
			const result = func(...Object.values(context));

			if (typeof result !== "number" || !Number.isFinite(result)) {
				throw new Error("Result is not a valid number");
			}

			return result;
		} catch (error) {
			throw new Error(
				`Invalid mathematical expression: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	protected async executeImpl(
		params: Record<string, any>,
		_presentationService: PresentationService,
	): Promise<AIToolResult> {
		const { expression } = params;

		if (!expression) {
			return {
				success: false,
				error: "Expression is required",
			};
		}

		if (typeof expression !== "string") {
			return {
				success: false,
				error: "Expression must be a string",
			};
		}

		try {
			const result = this.safeEvaluate(expression.trim());

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
						: "Failed to evaluate expression",
			};
		}
	}
}
