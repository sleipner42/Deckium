import { useState } from 'react';
import { UUID } from '../../../common/domain/entities/types';

export interface ElementState {
    selectedElementId: UUID | null;
    editingElementId: UUID | null;
}

export const useElementState = () => {
    const [selectedElementId, setSelectedElementId] = useState<UUID | null>(
        null,
    );
    const [editingElementId, setEditingElementId] = useState<UUID | null>(null);

    const selectElement = (elementId: UUID | null) => {
        setSelectedElementId(elementId);
        // When selecting a new element, stop editing any current element
        if (editingElementId && elementId !== editingElementId) {
            setEditingElementId(null);
        }
    };

    const startEditingElement = (elementId: UUID) => {
        setSelectedElementId(elementId);
        setEditingElementId(elementId);
    };

    const stopEditingElement = () => {
        setEditingElementId(null);
    };

    const isSelected = (elementId: UUID): boolean => {
        return selectedElementId === elementId;
    };

    const isEditing = (elementId: UUID): boolean => {
        return editingElementId === elementId;
    };

    return {
        selectedElementId,
        editingElementId,
        selectElement,
        startEditingElement,
        stopEditingElement,
        isSelected,
        isEditing,
    };
};
