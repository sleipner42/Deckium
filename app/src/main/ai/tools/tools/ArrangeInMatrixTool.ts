import { AIToolResult } from '../../../../common/domain/entities/ai-types';
import { PresentationService } from '../../../presentation/service';
import { BaseTool } from '../BaseTool';

export class ArrangeInMatrixTool extends BaseTool {
    name = 'arrangeInMatrix';

    description =
        'Arrange elements in a 2D matrix/grid layout with specified rows and columns. This can be used to create evenly spaces matrices. First create all the elements and the, use this tool to arrange them';

    requiredParams = {
        slideId: 'The ID of the slide containing the elements',
        elementIds:
            'Comma-separated list of element IDs to arrange in matrix order',
        rows: 'Number of rows in the matrix (e.g., 2)',
        columns: 'Number of columns in the matrix (e.g., 2)',
    };

    optionalParams = {
        startX: 'X coordinate for top-left position of the matrix (defaults to 100)',
        startY: 'Y coordinate for top-left position of the matrix (defaults to 100)',
        spacingX:
            'Horizontal spacing between elements in pixels (defaults to 50)',
        spacingY:
            'Vertical spacing between elements in pixels (defaults to 50)',
        fillDirection:
            'How to fill the matrix: "row-first" (left-to-right, top-to-bottom) or "column-first" (top-to-bottom, left-to-right). Defaults to "row-first"',
    };

    protected async executeImpl(
        params: Record<string, any>,
        presentationService: PresentationService,
    ): Promise<AIToolResult> {
        const {
            slideId,
            elementIds,
            rows,
            columns,
            startX = 100,
            startY = 100,
            spacingX = 50,
            spacingY = 50,
            fillDirection = 'row-first',
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

        if (!rows || Number.isNaN(Number(rows)) || Number(rows) < 1) {
            return {
                success: false,
                error: 'rows is required and must be a positive number',
            };
        }

        if (!columns || Number.isNaN(Number(columns)) || Number(columns) < 1) {
            return {
                success: false,
                error: 'columns is required and must be a positive number',
            };
        }

        const numRows = Number(rows);
        const numColumns = Number(columns);
        const matrixStartX = Number(startX);
        const matrixStartY = Number(startY);
        const hSpacing = Number(spacingX);
        const vSpacing = Number(spacingY);

        if (!['row-first', 'column-first'].includes(fillDirection)) {
            return {
                success: false,
                error: 'fillDirection must be "row-first" or "column-first"',
            };
        }

        // Parse element IDs
        const elementIdList = elementIds
            .split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0);

        if (elementIdList.length === 0) {
            return {
                success: false,
                error: 'At least one element is required',
            };
        }

        const maxElements = numRows * numColumns;
        if (elementIdList.length > maxElements) {
            return {
                success: false,
                error: `Too many elements (${elementIdList.length}) for ${numRows}×${numColumns} matrix. Maximum: ${maxElements}`,
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

        // Find all elements to arrange
        const elementsToArrange = slide.elements.filter((element) =>
            elementIdList.includes(element.id),
        );

        if (elementsToArrange.length !== elementIdList.length) {
            const missingIds = elementIdList.filter(
                (id: string) => !slide.elements.some((el) => el.id === id),
            );
            return {
                success: false,
                error: `Some elements were not found: ${missingIds.join(', ')}`,
            };
        }

        const updates: Array<{
            id: string;
            updates: any;
            originalPos: { x: number; y: number };
            newPos: { x: number; y: number };
            matrixPosition: { row: number; column: number };
        }> = [];

        // Calculate positions for each element
        elementIdList.forEach((elementId, index) => {
            const element = elementsToArrange.find((el) => el.id === elementId);
            if (!element) return;

            let row: number;
            let column: number;

            if (fillDirection === 'row-first') {
                // Fill row by row (left-to-right, then next row)
                row = Math.floor(index / numColumns);
                column = index % numColumns;
            } else {
                // Fill column by column (top-to-bottom, then next column)
                column = Math.floor(index / numRows);
                row = index % numRows;
            }

            // Calculate position for this matrix cell
            const x = matrixStartX + column * (element.size.width + hSpacing);
            const y = matrixStartY + row * (element.size.height + vSpacing);

            // Ensure the element stays within slide bounds
            const maxX = 1280 - element.size.width;
            const maxY = 720 - element.size.height;
            const finalX = Math.max(0, Math.min(x, maxX));
            const finalY = Math.max(0, Math.min(y, maxY));

            // Only add update if position actually changes
            const positionChanged =
                Math.abs(finalX - element.position.x) > 0.5 ||
                Math.abs(finalY - element.position.y) > 0.5;

            if (positionChanged) {
                updates.push({
                    id: element.id,
                    updates: {
                        position: {
                            x: Math.round(finalX),
                            y: Math.round(finalY),
                        },
                    },
                    originalPos: {
                        x: element.position.x,
                        y: element.position.y,
                    },
                    newPos: { x: Math.round(finalX), y: Math.round(finalY) },
                    matrixPosition: { row, column },
                });
            }
        });

        if (updates.length === 0) {
            return {
                success: true,
                data: {
                    message:
                        'Elements are already in the specified matrix positions',
                    matrixInfo: {
                        rows: numRows,
                        columns: numColumns,
                        startPosition: { x: matrixStartX, y: matrixStartY },
                        spacing: { x: hSpacing, y: vSpacing },
                        fillDirection,
                    },
                },
            };
        }

        // Apply all updates
        for (const update of updates) {
            presentationService.updateElement(update.id, update.updates);
        }

        // Create detailed feedback about the matrix arrangement
        const movementSummary = updates.map(
            (update) =>
                `${update.id.substring(0, 8)}... moved to matrix position (${update.matrixPosition.row}, ${update.matrixPosition.column}) at (${update.newPos.x}, ${update.newPos.y})`,
        );

        return {
            success: true,
            data: {
                message: `Successfully arranged ${updates.length} elements in a ${numRows}×${numColumns} matrix using "${fillDirection}" fill order`,
                matrixInfo: {
                    rows: numRows,
                    columns: numColumns,
                    startPosition: { x: matrixStartX, y: matrixStartY },
                    spacing: { x: hSpacing, y: vSpacing },
                    fillDirection,
                    elementsArranged: updates.length,
                    totalCapacity: maxElements,
                },
                movements: movementSummary,
                updates,
            },
            editedSlidesIds: [slideId],
        };
    }
}
