import { LintingService } from './service';

export class ToolLintingHelper {
    private lintingService: LintingService;

    constructor(lintingService: LintingService) {
        this.lintingService = lintingService;
    }

    async validateToolParameters(
        params: Record<string, any>,
        requiredParams: string[],
    ): Promise<string | null> {
        const errors = this.lintingService.validateParameters(
            params,
            requiredParams,
        );

        if (errors.length > 0) {
            return errors[0].message;
        }

        return null;
    }

    async validateSlideExists(slideId: string): Promise<string | null> {
        const error = this.lintingService.validateSlideExists(slideId);
        return error ? error.message : null;
    }

    async validateElementExists(elementId: string): Promise<string | null> {
        const error =
            await this.lintingService.validateElementExists(elementId);
        return error ? error.message : null;
    }

    async validateBarChartData(data: {
        x: any[];
        y: any[];
    }): Promise<string[]> {
        const errors = this.lintingService.validateBarChartData(data);
        return errors.map((error) => error.message);
    }

    async runPostCreationChecks(elementId: string): Promise<{
        overlapWarnings: string[];
        outsideSlideWarnings: string[];
        textOverflowWarnings: string[];
        suggestedPosition?: { x: number; y: number };
    }> {
        const [overlapErrors, textOverflowErrors] = await Promise.all([
            this.lintingService.checkDOMOverlap(elementId),
            this.lintingService.checkTextOverflow(elementId),
        ]);

        const overlapWarnings: string[] = [];
        const outsideSlideWarnings: string[] = [];
        const textOverflowWarnings: string[] = [];
        let suggestedPosition: { x: number; y: number } | undefined;

        for (const error of overlapErrors) {
            if (error.type === 'dom_overlap') {
                overlapWarnings.push(error.message);
                if (error.suggestedFix?.includes('position is (')) {
                    const match = error.suggestedFix.match(
                        /position is \(([^,]+),\s*([^)]+)\)/,
                    );
                    if (match) {
                        suggestedPosition = {
                            x: Number(match[1]),
                            y: Number(match[2]),
                        };
                    }
                }
            } else if (error.type === 'outside_slide') {
                outsideSlideWarnings.push(error.message);
                if (error.suggestedFix?.includes('repositioning to (')) {
                    const match = error.suggestedFix.match(
                        /repositioning to \(([^,]+),\s*([^)]+)\)/,
                    );
                    if (match) {
                        suggestedPosition = {
                            x: Number(match[1]),
                            y: Number(match[2]),
                        };
                    }
                }
            }
        }

        for (const error of textOverflowErrors) {
            textOverflowWarnings.push(error.message);
        }

        return {
            overlapWarnings,
            outsideSlideWarnings,
            textOverflowWarnings,
            suggestedPosition,
        };
    }

    async generatePostCreationMessage(
        elementId: string,
        baseMessage: string,
    ): Promise<string> {
        const checks = await this.runPostCreationChecks(elementId);
        let message = baseMessage;

        if (checks.outsideSlideWarnings.length > 0) {
            message += `\n\nWARNING: ${checks.outsideSlideWarnings[0]}`;
            if (checks.suggestedPosition) {
                message += ` Consider repositioning to (${checks.suggestedPosition.x}, ${checks.suggestedPosition.y}) to ensure visibility.`;
            }
        }

        if (checks.overlapWarnings.length > 0) {
            message += `\n\nWARNING: OVERLAP DETECTED. ${checks.overlapWarnings[0]}`;
            if (checks.suggestedPosition) {
                message += ` Closest non-overlapping position is (${checks.suggestedPosition.x}, ${checks.suggestedPosition.y}). You can also adjust z-index to control layering.`;
            } else {
                message += ` Please check the element placement to ensure readability. You can use the changeElementZIndex tool to adjust layering.`;
            }
        }

        if (checks.textOverflowWarnings.length > 0) {
            message += `\n\n⚠️ ${checks.textOverflowWarnings[0]}`;
        }

        return message;
    }

    static createParameterValidationError(param: string): {
        success: false;
        error: string;
    } {
        return {
            success: false,
            error: `${param} is required`,
        };
    }

    static createNotFoundError(
        type: 'slide' | 'element',
        id: string,
    ): { success: false; error: string } {
        const entityType = type === 'slide' ? 'Slide' : 'Element';
        return {
            success: false,
            error: `${entityType} with ID ${id} not found`,
        };
    }

    static createDataValidationError(message: string): {
        success: false;
        error: string;
    } {
        return {
            success: false,
            error: message,
        };
    }
}
