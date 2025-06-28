import { ContentElement, Slide } from '../../common/domain/entities/types';

interface GridConfig {
  pixelsPerSquare: number;
  canvasWidth?: number;
  canvasHeight?: number;
  emptyChar?: string;
  elementChars?: {
    textbox?: string;
    shape?: string;
    plot?: string;
    image?: string;
    barchart?: string;
  };
}

export function generateSlideGrid(slide: Slide, config: GridConfig): string {
  const {
    pixelsPerSquare,
    canvasWidth = 1280,
    canvasHeight = 720,
    emptyChar = '0',
    elementChars = {
      textbox: 'T',
      shape: 'S',
      plot: 'P',
      image: 'I',
      barchart: 'B',
    },
  } = config;

  const gridWidth = Math.ceil(canvasWidth / pixelsPerSquare);
  const gridHeight = Math.ceil(canvasHeight / pixelsPerSquare);

  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(emptyChar));

  slide.elements.forEach((element) => {
    const startX = Math.floor(element.position.x / pixelsPerSquare);
    const startY = Math.floor(element.position.y / pixelsPerSquare);
    const endX = Math.min(
      Math.ceil((element.position.x + element.size.width) / pixelsPerSquare),
      gridWidth,
    );
    const endY = Math.min(
      Math.ceil((element.position.y + element.size.height) / pixelsPerSquare),
      gridHeight,
    );

    const char = getElementChar(element.type, elementChars);

    for (let y = Math.max(0, startY); y < endY; y++) {
      for (let x = Math.max(0, startX); x < endX; x++) {
        if (grid[y][x] !== emptyChar) {
          grid[y][x] = 'X';
        } else {
          grid[y][x] = char;
        }
      }
    }
  });

  const gridOutput = grid.map((row) => row.join('')).join('\n');

  const header = [
    `SLIDE GRID REPRESENTATION`,
    `Please use the following representation to see that the slide looks balanced and aligned.`,
    `Canvas: ${canvasWidth}x${canvasHeight}px | Grid: ${gridWidth}x${gridHeight} chars | ${pixelsPerSquare}px per char`,
    `Elements: ${slide.elements.length} | Slide ID: ${slide.id}`,
    `Legend: ${elementChars.textbox}=TextBox, ${elementChars.shape}=Shape, ${elementChars.plot}=Plot, ${elementChars.image}=Image, ${elementChars.barchart}=BarChart, X=Collision, ${emptyChar}=Empty`,
    `${'='.repeat(Math.min(80, gridWidth * 2))}`,
    '',
  ].join('\n');

  return header + gridOutput;
}

function getElementChar(
  type: ContentElement['type'],
  elementChars: GridConfig['elementChars'],
): string {
  switch (type) {
    case 'textbox':
      return elementChars?.textbox || 'T';
    case 'rectangle':
    case 'circle':
    case 'triangle':
      return elementChars?.shape || 'S';
    case 'plot':
      return elementChars?.plot || 'P';
    case 'image':
      return elementChars?.image || 'I';
    case 'barchart':
      return elementChars?.barchart || 'B';
    default:
      return 'X';
  }
}

export function generateSlideGridWithStats(
  slide: Slide,
  config: GridConfig,
): {
  grid: string;
  stats: {
    totalSquares: number;
    occupiedSquares: number;
    emptySquares: number;
    coverage: number;
    elementCounts: Record<string, number>;
  };
} {
  const grid = generateSlideGrid(slide, config);
  const lines = grid.split('\n');
  const totalSquares = lines.length * (lines[0]?.length || 0);

  const charCounts: Record<string, number> = {};
  let occupiedSquares = 0;

  lines.forEach((line) => {
    for (const char of line) {
      charCounts[char] = (charCounts[char] || 0) + 1;
      if (char !== (config.emptyChar || '0')) {
        occupiedSquares++;
      }
    }
  });

  const emptySquares = totalSquares - occupiedSquares;
  const coverage =
    totalSquares > 0 ? (occupiedSquares / totalSquares) * 100 : 0;

  return {
    grid,
    stats: {
      totalSquares,
      occupiedSquares,
      emptySquares,
      coverage,
      elementCounts: charCounts,
    },
  };
}
