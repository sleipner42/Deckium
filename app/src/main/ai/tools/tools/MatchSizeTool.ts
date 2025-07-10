import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class MatchSizeTool extends BaseTool {
    name = 'matchSize';

    description =
        'Make elements the same size by matching width, height, or both dimensions';

    requiredParams = {
        slideId: 'The ID of the slide containing the elements',
        elementIds: 'Comma-separated list of element IDs to resize',
        sizeMode:
            'What to match: "width", "height", "both", "largest-width", "largest-height", "largest-both", "smallest-width", "smallest-height", "smallest-both"',
    };

    optionalParams = {
        referenceElementId:
            'ID of the element to use as size reference. If not provided, behavior depends on sizeMode (e.g., largest/smallest modes use automatic selection)',
        maintainAspectRatio:
            'boolean (true/false) to maintain aspect ratio when resizing. Defaults to false for individual width/height, true for "both" modes',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            elementIds,
            sizeMode,
            referenceElementId,
            maintainAspectRatio,
        } = params;

        if (!slideId) {
            return {
                success: false,
                error: 'slideId is required',
            };
        }

        if (!elementIds) {
            return {
                success: false,
                error: 'elementIds is required',
            };
        }

        const validSizeModes = [
            'width',
            'height',
            'both',
            'largest-width',
            'largest-height',
            'largest-both',
            'smallest-width',
            'smallest-height',
            'smallest-both',
        ];

        if (!sizeMode || !validSizeModes.includes(sizeMode)) {
            return {
                success: false,
                error: `sizeMode must be one of: ${validSizeModes.join(', ')}`,
            };
        }

        // Parse element IDs
        const elementIdList = elementIds
            .split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0);

        if (elementIdList.length < 2) {
            return {
                success: false,
                error: 'At least two elements are required for size matching',
            };
        }

        // Find the slide
        const currentPresentation = presentationService.getPresentation();
        const slide = currentPresentation.slides.find((s) => s.id === slideId);

        if (!slide) {
            return {
                success: false,
                error: `Slide with ID ${slideId} not found`,
            };
        }

        // Find all elements to resize
        const elementsToResize = slide.elements.filter((element) =>
            elementIdList.includes(element.id),
        );

        if (elementsToResize.length !== elementIdList.length) {
            const missingIds = elementIdList.filter(
                (id: string) => !slide.elements.some((el) => el.id === id),
            );
            return {
                success: false,
                error: `Some elements were not found: ${missingIds.join(', ')}`,
            };
        }

        // Find reference element or determine target size
        let referenceElement = null;
        let targetWidth: number;
        let targetHeight: number;

        if (referenceElementId) {
            referenceElement = elementsToResize.find(
                (el) => el.id === referenceElementId,
            );
            if (!referenceElement) {
                return {
                    success: false,
                    error: `Reference element with ID ${referenceElementId} was not found in the elementIds list`,
                };
            }
            targetWidth = referenceElement.size.width;
            targetHeight = referenceElement.size.height;
        } else {
            // Determine target size based on mode
            const { width: autoTargetWidth, height: autoTargetHeight } =
                this.calculateTargetSize(elementsToResize, sizeMode);
            targetWidth = autoTargetWidth;
            targetHeight = autoTargetHeight;
        }

        // Determine if we should maintain aspect ratio
        let shouldMaintainAspectRatio = false;
        if (maintainAspectRatio !== undefined) {
            shouldMaintainAspectRatio =
                maintainAspectRatio === 'true' || maintainAspectRatio === true;
        } else {
            // Default behavior: maintain aspect ratio for 'both' modes
            shouldMaintainAspectRatio = sizeMode.includes('both');
        }

        const updates: Array<{
            id: string;
            updates: any;
            originalSize: { width: number; height: number };
            newSize: { width: number; height: number };
            sizeChange: string;
        }> = [];

        // Calculate new sizes for each element
        elementsToResize.forEach((element) => {
            let newWidth = element.size.width;
            let newHeight = element.size.height;

            const originalAspectRatio =
                element.size.width / element.size.height;

            switch (sizeMode) {
                case 'width':
                case 'largest-width':
                case 'smallest-width':
                    newWidth = targetWidth;
                    if (shouldMaintainAspectRatio) {
                        newHeight = newWidth / originalAspectRatio;
                    }
                    break;

                case 'height':
                case 'largest-height':
                case 'smallest-height':
                    newHeight = targetHeight;
                    if (shouldMaintainAspectRatio) {
                        newWidth = newHeight * originalAspectRatio;
                    }
                    break;

                case 'both':
                case 'largest-both':
                case 'smallest-both':
                    if (shouldMaintainAspectRatio) {
                        // Scale proportionally to fit target size
                        const targetAspectRatio = targetWidth / targetHeight;
                        if (originalAspectRatio > targetAspectRatio) {
                            // Element is wider - constrain by width
                            newWidth = targetWidth;
                            newHeight = newWidth / originalAspectRatio;
                        } else {
                            // Element is taller - constrain by height
                            newHeight = targetHeight;
                            newWidth = newHeight * originalAspectRatio;
                        }
                    } else {
                        newWidth = targetWidth;
                        newHeight = targetHeight;
                    }
                    break;
            }

            // Round to avoid sub-pixel sizes
            newWidth = Math.round(newWidth);
            newHeight = Math.round(newHeight);

            // Ensure minimum size (prevent elements from becoming too small)
            newWidth = Math.max(10, newWidth);
            newHeight = Math.max(10, newHeight);

            // Ensure elements don't exceed slide boundaries when positioned
            newWidth = Math.min(newWidth, 1280 - element.position.x);
            newHeight = Math.min(newHeight, 720 - element.position.y);

            // Only add update if size actually changes
            const sizeChanged =
                Math.abs(newWidth - element.size.width) > 0.5 ||
                Math.abs(newHeight - element.size.height) > 0.5;

            if (sizeChanged) {
                const widthChange = newWidth - element.size.width;
                const heightChange = newHeight - element.size.height;
                const sizeChangeDesc = `${widthChange > 0 ? '+' : ''}${widthChange.toFixed(0)}w, ${heightChange > 0 ? '+' : ''}${heightChange.toFixed(0)}h`;

                updates.push({
                    id: element.id,
                    updates: {
                        size: { width: newWidth, height: newHeight },
                    },
                    originalSize: {
                        width: element.size.width,
                        height: element.size.height,
                    },
                    newSize: { width: newWidth, height: newHeight },
                    sizeChange: sizeChangeDesc,
                });
            }
        });

        if (updates.length === 0) {
            return {
                success: true,
                data: {
                    message:
                        'Elements already have matching sizes as requested',
                    targetSize: { width: targetWidth, height: targetHeight },
                    sizeMode,
                    maintainedAspectRatio: shouldMaintainAspectRatio,
                },
            };
        }

        // Apply all updates
        for (const update of updates) {
            presentationService.updateElement(update.id, update.updates);
        }

        // Create detailed feedback
        const sizeSummary = updates.map(
            (update) =>
                `${update.id.substring(0, 8)}... ${update.originalSize.width}×${update.originalSize.height} → ${update.newSize.width}×${update.newSize.height} (${update.sizeChange})`,
        );

        let referenceDescription = '';
        if (referenceElement) {
            referenceDescription = `using element ${referenceElement.id.substring(0, 8)}... as reference`;
        } else {
            referenceDescription = `using ${sizeMode} automatic selection`;
        }

        return {
            success: true,
            data: {
                message: `Successfully matched ${sizeMode} for ${updates.length} elements ${referenceDescription}`,
                targetSize: { width: targetWidth, height: targetHeight },
                sizeMode,
                maintainedAspectRatio: shouldMaintainAspectRatio,
                elementsResized: updates.length,
                sizeChanges: sizeSummary,
                updates,
            },
            editedSlidesIds: [slideId],
        };
    }

    /**
     * Calculates target size based on automatic mode selection
     */
    private calculateTargetSize(
        elements: any[],
        sizeMode: string,
    ): { width: number; height: number } {
        const widths = elements.map((el) => el.size.width);
        const heights = elements.map((el) => el.size.height);

        let targetWidth = widths[0];
        let targetHeight = heights[0];

        switch (sizeMode) {
            case 'largest-width':
            case 'largest-both':
                targetWidth = Math.max(...widths);
                break;
            case 'smallest-width':
            case 'smallest-both':
                targetWidth = Math.min(...widths);
                break;
            case 'width':
            case 'both':
                // Use first element as default
                break;
        }

        switch (sizeMode) {
            case 'largest-height':
            case 'largest-both':
                targetHeight = Math.max(...heights);
                break;
            case 'smallest-height':
            case 'smallest-both':
                targetHeight = Math.min(...heights);
                break;
            case 'height':
            case 'both':
                // Use first element as default
                break;
        }

        return { width: targetWidth, height: targetHeight };
    }
}
