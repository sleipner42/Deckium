import { useState } from 'react';
import { UUID } from '../../../common/domain/entities/types';

export interface ElementState {
    selectedElementId: UUID | null;
    selectedElementIds: UUID[];
    editingElementId: UUID | null;
}

export const useElementState = () => {
    const [selectedElementId, setSelectedElementId] = useState<UUID | null>(
        null,
    );
    const [selectedElementIds, setSelectedElementIds] = useState<UUID[]>([]);
    const [editingElementId, setEditingElementId] = useState<UUID | null>(null);

    const selectElement = (elementId: UUID | null) => {
        setSelectedElementId(elementId);
        setSelectedElementIds(elementId ? [elementId] : []);
        // When selecting a new element, stop editing any current element
        if (editingElementId && elementId !== editingElementId) {
            setEditingElementId(null);
        }
    };

    const selectMultipleElements = (elementIds: UUID[]) => {
        setSelectedElementIds(elementIds);
        setSelectedElementId(elementIds.length === 1 ? elementIds[0] : null);
        // Stop editing when multi-selecting
        if (elementIds.length > 1 && editingElementId) {
            setEditingElementId(null);
        }
    };

    const toggleElementSelection = (elementId: UUID) => {
        const isCurrentlySelected = selectedElementIds.includes(elementId);
        let newSelection: UUID[];

        if (isCurrentlySelected) {
            // Remove from selection
            newSelection = selectedElementIds.filter((id) => id !== elementId);
        } else {
            // Add to selection
            newSelection = [...selectedElementIds, elementId];
        }

        selectMultipleElements(newSelection);
    };

    const startEditingElement = (elementId: UUID) => {
        setSelectedElementId(elementId);
        setEditingElementId(elementId);
    };

    const stopEditingElement = () => {
        setEditingElementId(null);
    };

    const isSelected = (elementId: UUID): boolean => {
        return selectedElementIds.includes(elementId);
    };

    const isEditing = (elementId: UUID): boolean => {
        return editingElementId === elementId;
    };

    const clearSelection = () => {
        setSelectedElementId(null);
        setSelectedElementIds([]);
        setEditingElementId(null);
    };

    // Placeholder functions for move and resize - these will be handled by the presentation service
    const moveElement = (elementId: string, x: number, y: number) => {
        // This will be handled by the presentation service via updateElement
        console.log('Move element:', { elementId, x, y });
    };

    const resizeElement = (
        elementId: string,
        width: number,
        height: number,
    ) => {
        // This will be handled by the presentation service via updateElement
        console.log('Resize element:', { elementId, width, height });
    };

    return {
        selectedElementId,
        selectedElementIds,
        editingElementId,
        selectElement,
        selectMultipleElements,
        toggleElementSelection,
        startEditingElement,
        stopEditingElement,
        isSelected,
        isEditing,
        clearSelection,
        moveElement,
        resizeElement,
    };
};
