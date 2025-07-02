import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    TextField,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import type { Slide } from '../../../../common/domain/entities/types';

interface SlidePropertiesDialogProps {
    open: boolean;
    onClose: () => void;
    slide: Slide | null;
    onUpdate: (updates: Partial<Slide>) => void;
}

export const SlidePropertiesDialog: React.FC<SlidePropertiesDialogProps> = ({
    open,
    onClose,
    slide,
    onUpdate,
}) => {
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');

    useEffect(() => {
        if (slide) {
            setBackgroundColor(slide.background || '#ffffff');
        }
    }, [slide]);

    const handleSave = () => {
        if (slide) {
            onUpdate({
                background: backgroundColor,
            });
        }
        onClose();
    };

    const handleCancel = () => {
        if (slide) {
            setBackgroundColor(slide.background || '#ffffff');
        }
        onClose();
    };

    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBackgroundColor(event.target.value);
    };

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Slide Properties</DialogTitle>
            <DialogContent>
                <FormControl fullWidth margin="normal">
                    <InputLabel shrink>Background Color</InputLabel>
                    <TextField
                        type="color"
                        value={backgroundColor}
                        onChange={handleColorChange}
                        fullWidth
                        variant="outlined"
                        inputProps={{
                            style: { height: '40px' },
                        }}
                    />
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
