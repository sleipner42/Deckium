import type { Presentation } from '../../../common/domain/entities/types';
import { diffSnapshots, takeSnapshot } from '../staleness';

function makePresentation(): Presentation {
    return {
        id: 'p1',
        title: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        slides: [
            {
                id: 's1',
                background: '#fff',
                elements: [
                    {
                        id: 'e1',
                        type: 'textbox',
                        content: '<p>hi</p>',
                        position: { x: 100, y: 100 },
                        size: { width: 200, height: 50 },
                        zIndex: 1,
                    },
                ],
            },
            {
                id: 's2',
                background: '#fff',
                elements: [],
            },
        ],
    } as Presentation;
}

describe('staleness diff', () => {
    it('returns null when nothing changed', () => {
        const presentation = makePresentation();
        const before = takeSnapshot(presentation);
        const after = takeSnapshot(presentation);
        expect(diffSnapshots(before, after)).toBeNull();
    });

    it('reports moved elements with old and new positions', () => {
        const presentation = makePresentation();
        const before = takeSnapshot(presentation);
        presentation.slides[0].elements[0].position = { x: 300, y: 400 };
        const diff = diffSnapshots(before, takeSnapshot(presentation));

        expect(diff).not.toBeNull();
        expect(diff?.changedSlideIds).toEqual(['s1']);
        expect(diff?.summary).toContain('moved from (100, 100) to (300, 400)');
    });

    it('reports added and deleted elements', () => {
        const presentation = makePresentation();
        const before = takeSnapshot(presentation);
        presentation.slides[0].elements = [
            {
                id: 'e2',
                type: 'image',
                content: 'x.png',
                position: { x: 0, y: 0 },
                size: { width: 10, height: 10 },
            },
        ];
        const diff = diffSnapshots(before, takeSnapshot(presentation));

        expect(diff?.summary).toContain('element e1 was deleted');
        expect(diff?.summary).toContain('element e2 was added');
    });

    it('reports slide deletion and reordering', () => {
        const presentation = makePresentation();
        const before = takeSnapshot(presentation);
        presentation.slides.reverse();
        const diff = diffSnapshots(before, takeSnapshot(presentation));
        expect(diff?.summary).toContain('reordered');

        const presentation2 = makePresentation();
        const before2 = takeSnapshot(presentation2);
        presentation2.slides.pop();
        const diff2 = diffSnapshots(before2, takeSnapshot(presentation2));
        expect(diff2?.summary).toContain('Slide s2 was deleted');
    });

    it('reports background changes', () => {
        const presentation = makePresentation();
        const before = takeSnapshot(presentation);
        presentation.slides[1].background = '#000';
        const diff = diffSnapshots(before, takeSnapshot(presentation));

        expect(diff?.changedSlideIds).toEqual(['s2']);
        expect(diff?.summary).toContain('background changed to #000');
    });
});
