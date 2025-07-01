import { useCallback, useMemo, useState } from 'react';
import { ContentElement } from '../../../common/domain/entities/types';
import {
    Point,
    SnapConfiguration,
    SnapEngine,
    SnapGuide,
} from '../utils/snapEngine';

interface UseSnapSystemProps {
    elements: ContentElement[];
    slideWidth?: number;
    slideHeight?: number;
    config?: Partial<SnapConfiguration>;
}

interface UseSnapSystemReturn {
    snapEngine: SnapEngine;
    activeGuides: SnapGuide[];
    calculateSnapPosition: (
        element: ContentElement,
        newPosition: Point,
    ) => { position: Point; snapped: boolean };
    clearGuides: () => void;
    updateConfig: (newConfig: Partial<SnapConfiguration>) => void;
}

export const useSnapSystem = ({
    elements,
    slideWidth = 1920,
    slideHeight = 1080,
    config = {},
}: UseSnapSystemProps): UseSnapSystemReturn => {
    const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

    const snapEngine = useMemo(() => {
        return new SnapEngine(config);
    }, [config]);

    const calculateSnapPosition = useCallback(
        (element: ContentElement, newPosition: Point) => {
            const result = snapEngine.calculateSnap(
                element,
                newPosition,
                elements,
                slideWidth,
                slideHeight,
            );

            setActiveGuides(result.guides);

            return {
                position: result.position,
                snapped: result.snapped,
            };
        },
        [snapEngine, elements, slideWidth, slideHeight],
    );

    const clearGuides = useCallback(() => {
        setActiveGuides([]);
    }, []);

    const updateConfig = useCallback(
        (newConfig: Partial<SnapConfiguration>) => {
            snapEngine.updateConfig(newConfig);
        },
        [snapEngine],
    );

    return {
        snapEngine,
        activeGuides,
        calculateSnapPosition,
        clearGuides,
        updateConfig,
    };
};
