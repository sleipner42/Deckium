import {
    BarChart,
    Shape,
    Slide,
    TextBox,
} from '../../../common/domain/entities/types';
import { generateSlideGrid } from '../utils';

describe('Slide Grid Utils', () => {
    it('should generate and print slide grid representation', () => {
        const sampleSlide: Slide = {
            id: 'test-slide',
            background: '#ffffff',
            elements: [
                {
                    id: 'textbox-1',
                    type: 'textbox',
                    position: { x: 50, y: 50 },
                    size: { width: 150, height: 100 },
                    content: 'Sample Text',
                    fontSize: 16,
                    fontFamily: 'Arial',
                    color: '#000000',
                } as TextBox,
                {
                    id: 'shape-1',
                    type: 'rectangle',
                    position: { x: 250, y: 200 },
                    size: { width: 100, height: 150 },
                    fillColor: '#ff0000',
                    strokeColor: '#000000',
                    strokeWidth: 2,
                } as Shape,
                {
                    id: 'chart-1',
                    type: 'barchart',
                    position: { x: 400, y: 400 },
                    size: { width: 200, height: 200 },
                    data: { x: ['A', 'B', 'C'], y: [10, 20, 15] },
                    title: 'Sample Chart',
                    xAxisLabel: 'Categories',
                    yAxisLabel: 'Values',
                } as BarChart,
            ],
        };

        const gridConfig = {
            pixelsPerSquare: 50,
            canvasWidth: 600,
            canvasHeight: 800,
        };

        const grid = generateSlideGrid(sampleSlide, gridConfig);

        console.log(grid);

        expect(grid).toBeDefined();
        expect(grid.length).toBeGreaterThan(0);
    });
});
