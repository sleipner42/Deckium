import type {
    BarChart,
    ContentElement,
    Shape,
    Slide,
    TextBox,
} from '../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../common/utils/constants';
import type { GeometrySnapshot, Rect } from './geometry';
import * as messages from './messages';
import type { LintingError } from './types';

export interface LintContext {
    slide: Slide;
    geometry: GeometrySnapshot;
}

type LintRule = (element: ContentElement, ctx: LintContext) => LintingError[];

const SLIDE_WIDTH = PRESENTATION_DIMENSIONS.WIDTH;
const SLIDE_HEIGHT = PRESENTATION_DIMENSIONS.HEIGHT;

const isShapeType = (e: ContentElement): e is Shape =>
    e.type === 'rectangle' || e.type === 'circle' || e.type === 'triangle';

const isCollidableType = (e: ContentElement): boolean =>
    isShapeType(e) || e.type === 'image' || e.type === 'barchart';

const elementTypeName = (e: ContentElement): string =>
    e.type === 'barchart' ? 'Chart' : e.type === 'image' ? 'Image' : 'Shape';

const elementToolName = (e: ContentElement): string =>
    e.type === 'barchart'
        ? 'updateBarChart'
        : e.type === 'image'
          ? 'updateImageElement'
          : 'updateShape';

const modelRect = (e: ContentElement): Rect => ({
    x: e.position.x,
    y: e.position.y,
    width: e.size.width,
    height: e.size.height,
});

/** Strict AABB overlap: rects that merely touch do not overlap. */
const rectsOverlap = (a: Rect, b: Rect): boolean =>
    !(
        a.x >= b.x + b.width ||
        a.x + a.width <= b.x ||
        a.y >= b.y + b.height ||
        a.y + a.height <= b.y
    );

const textBoundsOf = (elementId: string, ctx: LintContext): Rect =>
    ctx.geometry.elements[elementId].textContentBounds ??
    ctx.geometry.elements[elementId].bounds;

const zIndexOf = (elementId: string, ctx: LintContext): number =>
    ctx.geometry.elements[elementId].zIndex;

// --- Textbox rules -------------------------------------------------------

const textToTextOverlap: LintRule = (element, ctx) => {
    const textBox = element as TextBox;
    const ownBounds = textBoundsOf(textBox.id, ctx);

    const overlappingIds = ctx.slide.elements
        .filter(
            (other) =>
                other.type === 'textbox' &&
                other.id !== textBox.id &&
                // Pair dedup: only the smaller id reports the overlap.
                textBox.id < other.id &&
                rectsOverlap(ownBounds, textBoundsOf(other.id, ctx)),
        )
        .map((other) => other.id);

    if (overlappingIds.length === 0) return [];
    return [
        messages.textOverlap(
            textBox.id,
            ctx.slide.id,
            overlappingIds.join(', '),
        ),
    ];
};

const textSizeVsContainer: LintRule = (element, ctx) => {
    const textBox = element as TextBox;
    const geometry = ctx.geometry.elements[textBox.id];
    // Model-sourced text bounds equal the container by construction; only
    // rendered content can meaningfully overflow it.
    if (!geometry.textContentBounds || geometry.textSource === 'model') {
        return [];
    }

    const errors: LintingError[] = [];
    const content = geometry.textContentBounds;

    if (content.width > textBox.size.width) {
        errors.push(
            messages.textWidthOverflow(
                textBox.id,
                ctx.slide.id,
                content.width,
                textBox.size.width,
            ),
        );
    }
    if (content.height > textBox.size.height) {
        errors.push(
            messages.textHeightOverflow(
                textBox.id,
                ctx.slide.id,
                content.height,
                textBox.size.height,
            ),
        );
    }
    return errors;
};

const textOutsideSlide: LintRule = (element, ctx) => {
    const textBox = element as TextBox;
    const bounds = textBoundsOf(textBox.id, ctx);
    const errors: LintingError[] = [];

    const textRight = bounds.x + bounds.width;
    const textBottom = bounds.y + bounds.height;

    if (bounds.x < 0) {
        errors.push(
            messages.textOutsideSlide.left(textBox.id, ctx.slide.id, bounds.x),
        );
    }
    if (bounds.y < 0) {
        errors.push(
            messages.textOutsideSlide.top(textBox.id, ctx.slide.id, bounds.y),
        );
    }
    if (textRight > SLIDE_WIDTH) {
        errors.push(
            messages.textOutsideSlide.right(
                textBox.id,
                ctx.slide.id,
                textRight,
                SLIDE_WIDTH,
            ),
        );
    }
    if (textBottom > SLIDE_HEIGHT) {
        errors.push(
            messages.textOutsideSlide.bottom(
                textBox.id,
                ctx.slide.id,
                textBottom,
                SLIDE_HEIGHT,
            ),
        );
    }
    return errors;
};

const shapeCoveringText: LintRule = (element, ctx) => {
    const textBox = element as TextBox;
    const textBounds = textBoundsOf(textBox.id, ctx);
    const textZ = zIndexOf(textBox.id, ctx);
    const errors: LintingError[] = [];

    for (const shape of ctx.slide.elements.filter(isShapeType)) {
        const shapeZ = zIndexOf(shape.id, ctx);
        if (shapeZ > textZ && rectsOverlap(textBounds, modelRect(shape))) {
            errors.push(
                messages.textCoveredByShape(
                    textBox.id,
                    ctx.slide.id,
                    shape.id,
                    shapeZ,
                    textZ,
                ),
            );
        }
    }
    return errors;
};

const textPartlyOutsideShape: LintRule = (element, ctx) => {
    const textBox = element as TextBox;
    const text = textBoundsOf(textBox.id, ctx);
    const textZ = zIndexOf(textBox.id, ctx);
    const errors: LintingError[] = [];

    for (const shape of ctx.slide.elements.filter(isShapeType)) {
        if (textZ <= zIndexOf(shape.id, ctx)) continue;

        const shapeBounds = modelRect(shape);
        const completelyInside =
            text.x >= shapeBounds.x &&
            text.x + text.width <= shapeBounds.x + shapeBounds.width &&
            text.y >= shapeBounds.y &&
            text.y + text.height <= shapeBounds.y + shapeBounds.height;
        const completelyOutside = !rectsOverlap(text, shapeBounds);

        if (!completelyInside && !completelyOutside) {
            errors.push(
                messages.textPartlyOutsideShape(
                    textBox.id,
                    ctx.slide.id,
                    shape.id,
                ),
            );
        }
    }
    return errors;
};

// --- Shape / image / barchart rules --------------------------------------

const elementOutsideSlide: LintRule = (element, ctx) => {
    const bounds = modelRect(element);
    const typeName = elementTypeName(element);
    const toolName = elementToolName(element);
    const errors: LintingError[] = [];

    const right = bounds.x + bounds.width;
    const bottom = bounds.y + bounds.height;

    if (bounds.x < 0) {
        errors.push(
            messages.elementOutsideSlide.left(
                element.id,
                ctx.slide.id,
                typeName,
                toolName,
                bounds.x,
            ),
        );
    }
    if (bounds.y < 0) {
        errors.push(
            messages.elementOutsideSlide.top(
                element.id,
                ctx.slide.id,
                typeName,
                toolName,
                bounds.y,
            ),
        );
    }
    if (right > SLIDE_WIDTH) {
        errors.push(
            messages.elementOutsideSlide.right(
                element.id,
                ctx.slide.id,
                typeName,
                toolName,
                right,
                SLIDE_WIDTH,
            ),
        );
    }
    if (bottom > SLIDE_HEIGHT) {
        errors.push(
            messages.elementOutsideSlide.bottom(
                element.id,
                ctx.slide.id,
                typeName,
                toolName,
                bottom,
                SLIDE_HEIGHT,
            ),
        );
    }
    return errors;
};

const elementCollisions: LintRule = (element, ctx) => {
    const overlappingIds = ctx.slide.elements
        .filter(
            (other) =>
                isCollidableType(other) &&
                other.id !== element.id &&
                // Pair dedup: only the smaller id reports the collision.
                element.id < other.id &&
                rectsOverlap(modelRect(element), modelRect(other)),
        )
        .map((other) => other.id);

    if (overlappingIds.length === 0) return [];
    return [
        messages.elementCollision(
            element.id,
            ctx.slide.id,
            elementTypeName(element),
            elementToolName(element),
            overlappingIds.join(', '),
        ),
    ];
};

const barChartData: LintRule = (element) => {
    const barChart = element as BarChart;
    if (!barChart.data) return [];

    if (!barChart.data.x || !barChart.data.y) {
        return [messages.barChartMissingData()];
    }
    if (barChart.data.x.length !== barChart.data.y.length) {
        return [
            messages.barChartDataMismatch(
                barChart.data.x.length,
                barChart.data.y.length,
            ),
        ];
    }
    return [];
};

// --- Registry -------------------------------------------------------------

interface RuleGroup {
    appliesTo: (element: ContentElement) => boolean;
    rules: LintRule[];
}

// Rule order within each group preserves the pre-refactor error ordering,
// which the AI feedback string depends on.
const ruleGroups: RuleGroup[] = [
    {
        appliesTo: (e) => e.type === 'textbox',
        rules: [
            textToTextOverlap,
            textSizeVsContainer,
            textOutsideSlide,
            shapeCoveringText,
            textPartlyOutsideShape,
        ],
    },
    {
        appliesTo: isShapeType,
        rules: [elementOutsideSlide, elementCollisions],
    },
    {
        appliesTo: (e) => e.type === 'barchart',
        rules: [barChartData, elementOutsideSlide, elementCollisions],
    },
    {
        appliesTo: (e) => e.type === 'image',
        rules: [elementOutsideSlide, elementCollisions],
    },
];

export function runLintRules(ctx: LintContext): LintingError[] {
    const errors: LintingError[] = [];
    for (const element of ctx.slide.elements) {
        for (const group of ruleGroups) {
            if (!group.appliesTo(element)) continue;
            for (const rule of group.rules) {
                errors.push(...rule(element, ctx));
            }
        }
    }
    return errors;
}
