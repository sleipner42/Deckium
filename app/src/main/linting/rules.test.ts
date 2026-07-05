/**
 * @jest-environment node
 */
import type {
    BarChart,
    ContentElement,
    Shape,
    Slide,
    TextBox,
} from '../../common/domain/entities/types';
import type { ElementGeometry, GeometrySnapshot, Rect } from './geometry';
import { runLintRules } from './rules';

let nextId = 0;
const id = (prefix: string) => `${prefix}-${String(nextId++).padStart(3, '0')}`;

const makeTextBox = (
    overrides: Partial<TextBox> & { id?: string } = {},
): TextBox => ({
    id: id('text'),
    type: 'textbox',
    position: { x: 100, y: 100 },
    size: { width: 200, height: 50 },
    content: 'hello',
    ...overrides,
});

const makeShape = (
    overrides: Partial<Shape> & { id?: string } = {},
): Shape => ({
    id: id('shape'),
    type: 'rectangle',
    position: { x: 400, y: 400 },
    size: { width: 100, height: 100 },
    fillColor: '#fff',
    strokeColor: '#000',
    strokeWidth: 1,
    ...overrides,
});

const makeBarChart = (
    overrides: Partial<BarChart> & { id?: string } = {},
): BarChart => ({
    id: id('chart'),
    type: 'barchart',
    position: { x: 600, y: 100 },
    size: { width: 300, height: 200 },
    data: { x: ['a', 'b'], y: [1, 2] },
    title: 't',
    xAxisLabel: 'x',
    yAxisLabel: 'y',
    ...overrides,
});

const makeSlide = (elements: ContentElement[]): Slide => ({
    id: 'slide-1',
    elements,
    background: '#FFFFFF',
});

/** Model-derived snapshot, with optional per-element geometry overrides. */
const makeSnapshot = (
    slide: Slide,
    overrides: Record<string, Partial<ElementGeometry>> = {},
): GeometrySnapshot => {
    const elements: Record<string, ElementGeometry> = {};
    for (const element of slide.elements) {
        const bounds: Rect = {
            x: element.position.x,
            y: element.position.y,
            width: element.size.width,
            height: element.size.height,
        };
        elements[element.id] = {
            elementId: element.id,
            source: 'model',
            bounds,
            zIndex: element.zIndex || 1,
            ...(element.type === 'textbox'
                ? { textContentBounds: bounds, textSource: 'model' as const }
                : {}),
            ...overrides[element.id],
        };
    }
    return { slideId: slide.id, elements };
};

const lint = (
    slide: Slide,
    overrides: Record<string, Partial<ElementGeometry>> = {},
) => runLintRules({ slide, geometry: makeSnapshot(slide, overrides) });

describe('lint rules', () => {
    beforeEach(() => {
        nextId = 0;
    });

    describe('text-to-text overlap', () => {
        it('detects overlap for a textbox at x:0, y:0 (falsy-zero regression)', () => {
            const a = makeTextBox({ id: 'a', position: { x: 0, y: 0 } });
            const b = makeTextBox({ id: 'b', position: { x: 50, y: 20 } });
            const errors = lint(makeSlide([a, b]));

            const overlap = errors.filter((e) => e.type === 'text_overlap');
            expect(overlap).toHaveLength(1);
            expect(overlap[0].id).toBe('a-text-overlap');
            expect(overlap[0].message).toContain(
                'TEXT_ELEMENT_OVERLAP: Text element "a" visually overlaps with other text elements: b.',
            );
        });

        it('reports each overlapping pair exactly once, from the smaller id', () => {
            const a = makeTextBox({ id: 'a', position: { x: 10, y: 10 } });
            const b = makeTextBox({ id: 'b', position: { x: 20, y: 20 } });
            const errors = lint(makeSlide([b, a]));

            const overlap = errors.filter((e) => e.type === 'text_overlap');
            expect(overlap).toHaveLength(1);
            expect(overlap[0].elementId).toBe('a');
        });

        it('treats touching edges as non-overlapping', () => {
            const a = makeTextBox({
                id: 'a',
                position: { x: 0, y: 0 },
                size: { width: 100, height: 50 },
            });
            const b = makeTextBox({ id: 'b', position: { x: 100, y: 0 } });
            expect(
                lint(makeSlide([a, b])).filter(
                    (e) => e.type === 'text_overlap',
                ),
            ).toHaveLength(0);
        });
    });

    describe('text size vs container', () => {
        it('reports rendered content exceeding the container', () => {
            const a = makeTextBox({ id: 'a' });
            const errors = lint(makeSlide([a]), {
                a: {
                    source: 'canvas',
                    textContentBounds: {
                        x: 100,
                        y: 100,
                        width: 250,
                        height: 80,
                    },
                    textSource: 'canvas',
                },
            });

            const overflow = errors.filter((e) => e.type === 'text_overflow');
            expect(overflow.map((e) => e.id)).toEqual([
                'a-text-width-overflow',
                'a-text-height-overflow',
            ]);
            expect(overflow[0].message).toBe(
                'TEXT_WIDTH_OVERFLOW: Text content in element "a" exceeds container width. Text width: 250px, Container width: 200px. Horizontal overflow detected.',
            );
            expect(overflow[0].suggestedFix).toBe(
                'ACTION_REQUIRED: Use updateTextElement tool to increase container width or reduce font size to fit content horizontally',
            );
        });

        it('never fires from model-derived text bounds', () => {
            const a = makeTextBox({ id: 'a' });
            expect(
                lint(makeSlide([a])).filter((e) => e.type === 'text_overflow'),
            ).toHaveLength(0);
        });
    });

    describe('text outside slide', () => {
        it('reports all four edges with exact ids and messages', () => {
            const a = makeTextBox({ id: 'a' });
            const errors = lint(makeSlide([a]), {
                a: {
                    textContentBounds: {
                        x: -10,
                        y: -5,
                        width: 1400,
                        height: 800,
                    },
                    textSource: 'canvas',
                },
            });

            const outside = errors.filter((e) => e.type === 'outside_slide');
            expect(outside.map((e) => e.id)).toEqual([
                'a-text-left-outside',
                'a-text-top-outside',
                'a-text-right-outside',
                'a-text-bottom-outside',
            ]);
            expect(outside[2].message).toBe(
                'TEXT_RIGHT_BOUNDARY_VIOLATION: Text element "a" extends beyond right slide edge. Right edge position: 1390px exceeds slide width: 1280px.',
            );
        });

        it('reports an off-slide textbox even with pure model fallback', () => {
            const a = makeTextBox({ id: 'a', position: { x: 1200, y: 100 } });
            const errors = lint(makeSlide([a]));
            expect(errors.map((e) => e.id)).toContain('a-text-right-outside');
        });
    });

    describe('shape covering text', () => {
        it('detects a covering shape at y:0 (falsy-zero regression)', () => {
            const text = makeTextBox({
                id: 'text',
                position: { x: 10, y: 10 },
            });
            const shape = makeShape({
                id: 'shape',
                position: { x: 0, y: 0 },
                size: { width: 300, height: 300 },
            });
            const errors = lint(makeSlide([text, shape]), {
                text: { zIndex: 1 },
                shape: { zIndex: 5 },
            });

            const covered = errors.filter((e) => e.type === 'zindex_issue');
            expect(covered).toHaveLength(1);
            expect(covered[0].id).toBe('text-covered-by-shape');
            expect(covered[0].message).toBe(
                'TEXT_VISIBILITY_BLOCKED: Text element "text" is visually covered by shape "shape". Shape z-index: 5, Text z-index: 1. Text content may be unreadable.',
            );
        });

        it('does not fire when z-indexes are equal', () => {
            const text = makeTextBox({
                id: 'text',
                position: { x: 10, y: 10 },
            });
            const shape = makeShape({
                id: 'shape',
                position: { x: 0, y: 0 },
                size: { width: 300, height: 300 },
            });
            expect(
                lint(makeSlide([text, shape])).filter(
                    (e) => e.type === 'zindex_issue',
                ),
            ).toHaveLength(0);
        });
    });

    describe('text partly outside shape', () => {
        it('fires when text in front straddles a shape boundary at y:0', () => {
            const text = makeTextBox({
                id: 'text',
                position: { x: 250, y: 10 },
            });
            const shape = makeShape({
                id: 'shape',
                position: { x: 0, y: 0 },
                size: { width: 300, height: 300 },
            });
            const errors = lint(makeSlide([text, shape]), {
                text: { zIndex: 5 },
                shape: { zIndex: 1 },
            });

            const partly = errors.filter(
                (e) => e.type === 'text_shape_boundary',
            );
            expect(partly).toHaveLength(1);
            expect(partly[0].id).toBe('text-partly-outside-shape');
        });

        it('stays quiet when text is completely inside or outside', () => {
            const inside = makeTextBox({
                id: 'inside',
                position: { x: 10, y: 10 },
                size: { width: 50, height: 20 },
            });
            const outside = makeTextBox({
                id: 'outside',
                position: { x: 800, y: 500 },
            });
            const shape = makeShape({
                id: 'shape',
                position: { x: 0, y: 0 },
                size: { width: 300, height: 300 },
            });
            const errors = lint(makeSlide([inside, outside, shape]), {
                inside: { zIndex: 5 },
                outside: { zIndex: 5 },
                shape: { zIndex: 1 },
            });
            expect(
                errors.filter((e) => e.type === 'text_shape_boundary'),
            ).toHaveLength(0);
        });
    });

    describe('element outside slide', () => {
        it.each([
            ['rectangle', makeShape, 'SHAPE', 'updateShape'],
            ['image', undefined, 'IMAGE', 'updateImageElement'],
            ['barchart', undefined, 'CHART', 'updateBarChart'],
        ] as const)(
            'reports %s boundary violations with the right tool name',
            (type, _factory, label, tool) => {
                const element: ContentElement =
                    type === 'rectangle'
                        ? makeShape({
                              id: 'el',
                              position: { x: -20, y: 700 },
                          })
                        : type === 'image'
                          ? {
                                id: 'el',
                                type: 'image',
                                position: { x: -20, y: 700 },
                                size: { width: 100, height: 100 },
                                content: 'http://example.com/x.png',
                            }
                          : makeBarChart({
                                id: 'el',
                                position: { x: -20, y: 700 },
                                size: { width: 100, height: 100 },
                            });
                const errors = lint(makeSlide([element]));

                const outside = errors.filter(
                    (e) => e.type === 'outside_slide',
                );
                expect(outside.map((e) => e.id)).toEqual([
                    'el-left-outside',
                    'el-bottom-outside',
                ]);
                expect(outside[0].message).toContain(
                    `${label}_LEFT_BOUNDARY_VIOLATION`,
                );
                expect(outside[0].suggestedFix).toBe(
                    `ACTION_REQUIRED: Use ${tool} tool to set x position to 0 or greater to keep element within slide boundaries`,
                );
            },
        );
    });

    describe('element collisions', () => {
        it('reports a pair once from the smaller id, including images and charts', () => {
            const a = makeShape({ id: 'a', position: { x: 0, y: 0 } });
            const b = makeBarChart({
                id: 'b',
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
            });
            const errors = lint(makeSlide([b, a]));

            const collisions = errors.filter((e) => e.type === 'shape_overlap');
            expect(collisions).toHaveLength(1);
            expect(collisions[0].id).toBe('a-collision');
            expect(collisions[0].message).toBe(
                'SHAPE_ELEMENT_COLLISION: Shape element "a" spatially overlaps with other elements: b. Visual collision may cause content conflicts.',
            );
        });

        it('ignores textboxes for shape collision purposes', () => {
            const shape = makeShape({ id: 'shape', position: { x: 0, y: 0 } });
            const text = makeTextBox({ id: 'a', position: { x: 10, y: 10 } });
            expect(
                lint(makeSlide([shape, text])).filter(
                    (e) => e.type === 'shape_overlap',
                ),
            ).toHaveLength(0);
        });
    });

    describe('barchart data', () => {
        it('keeps the unknown-element quirk for missing data arrays', () => {
            const chart = makeBarChart({
                data: { x: undefined, y: [1] } as unknown as BarChart['data'],
            });
            const errors = lint(makeSlide([chart]));

            const dataErrors = errors.filter(
                (e) => e.type === 'data_validation',
            );
            expect(dataErrors).toHaveLength(1);
            expect(dataErrors[0].id).toBe('barchart-missing-data');
            expect(dataErrors[0].elementId).toBe('unknown');
            expect(dataErrors[0].slideId).toBe('unknown');
            expect(dataErrors[0].severity).toBe('error');
        });

        it('reports mismatched array lengths', () => {
            const chart = makeBarChart({
                data: { x: ['a', 'b', 'c'], y: [1] },
            });
            const errors = lint(makeSlide([chart]));
            const mismatch = errors.find(
                (e) => e.id === 'barchart-data-mismatch',
            );
            expect(mismatch?.message).toBe(
                'BARCHART_DATA_MISMATCH: BarChart x and y data arrays have mismatched lengths. X array: 3 items, Y array: 1 items. Arrays must have equal length.',
            );
        });

        it('is silent when data is absent entirely', () => {
            const chart = makeBarChart({
                data: undefined as unknown as BarChart['data'],
            });
            expect(
                lint(makeSlide([chart])).filter(
                    (e) => e.type === 'data_validation',
                ),
            ).toHaveLength(0);
        });
    });

    it('produces zero errors for a clean slide', () => {
        const slide = makeSlide([
            makeTextBox({ position: { x: 100, y: 100 } }),
            makeShape({ position: { x: 500, y: 400 } }),
            makeBarChart({ position: { x: 900, y: 100 } }),
        ]);
        expect(lint(slide)).toHaveLength(0);
    });

    describe('text density', () => {
        const words = (n: number) => Array(n).fill('word').join(' ');

        it('flags a textbox over the per-box word limit', () => {
            const slide = makeSlide([makeTextBox({ content: words(41) })]);
            const errors = lint(slide).filter((e) => e.type === 'text_density');
            expect(errors.some((e) => e.message.includes('TEXT_DENSITY'))).toBe(
                true,
            );
        });

        it('counts words from text content, not HTML markup', () => {
            const html = `<ul>${'<li><strong>word</strong></li>'.repeat(3)}</ul>`;
            const slide = makeSlide([makeTextBox({ content: html })]);
            expect(
                lint(slide).filter((e) => e.type === 'text_density'),
            ).toHaveLength(0);
        });

        it('flags too many bullets', () => {
            const html = `<ul>${'<li>point</li>'.repeat(5)}</ul>`;
            const slide = makeSlide([makeTextBox({ content: html })]);
            const errors = lint(slide).filter((e) => e.type === 'text_density');
            expect(errors.some((e) => e.message.includes('BULLET_COUNT'))).toBe(
                true,
            );
        });

        it('flags slide-wide density once when boxes are individually fine', () => {
            const slide = makeSlide([
                makeTextBox({
                    content: words(35),
                    position: { x: 50, y: 50 },
                    size: { width: 400, height: 200 },
                }),
                makeTextBox({
                    content: words(35),
                    position: { x: 50, y: 400 },
                    size: { width: 400, height: 200 },
                }),
            ]);
            const errors = lint(slide).filter((e) =>
                e.message.includes('SLIDE_DENSITY'),
            );
            expect(errors).toHaveLength(1);
        });

        it('stays quiet for restrained slides', () => {
            const slide = makeSlide([
                makeTextBox({ content: `<h2>${words(6)}</h2>` }),
            ]);
            expect(
                lint(slide).filter((e) => e.type === 'text_density'),
            ).toHaveLength(0);
        });
    });
});
