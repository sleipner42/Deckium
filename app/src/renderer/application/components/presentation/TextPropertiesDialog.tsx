import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { TextBox } from '../../../../common/domain/entities/types';

interface TextPropertiesDialogProps {
    open: boolean;
    onClose: () => void;
    textBox: TextBox | null;
    onUpdate: (updates: Partial<TextBox>) => void;
}

export const TextPropertiesDialog: React.FC<TextPropertiesDialogProps> = ({
    open,
    onClose,
    textBox,
    onUpdate,
}) => {
    const [backgroundColor, setBackgroundColor] = useState('transparent');
    const [borderRadius, setBorderRadius] = useState(0);
    const [verticalAlign, setVerticalAlign] = useState<
        'top' | 'middle' | 'bottom'
    >('top');
    const [width, setWidth] = useState(200);
    const [height, setHeight] = useState(100);

    useEffect(() => {
        if (textBox) {
            setBackgroundColor(textBox.backgroundColor || 'transparent');
            setBorderRadius(textBox.borderRadius || 0);
            setVerticalAlign(textBox.verticalAlign || 'top');
            setWidth(textBox.size?.width || 200);
            setHeight(textBox.size?.height || 100);
        }
    }, [textBox]);

    const handleSave = () => {
        if (!textBox) return;

        const updates: Partial<TextBox> = {
            backgroundColor:
                backgroundColor === 'transparent' ? undefined : backgroundColor,
            borderRadius,
            verticalAlign,
            size: {
                width,
                height,
            },
        };

        onUpdate(updates);
        onClose();
    };

    const handleCancel = () => {
        // Reset to original values
        if (textBox) {
            setBackgroundColor(textBox.backgroundColor || 'transparent');
            setBorderRadius(textBox.borderRadius || 0);
            setVerticalAlign(textBox.verticalAlign || 'top');
            setWidth(textBox.size?.width || 200);
            setHeight(textBox.size?.height || 100);
        }
        onClose();
    };

    if (!textBox) return null;

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Text Properties</DialogTitle>

            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={3}>
                        {/* Size Section */}
                        <Grid size={12}>
                            <Typography variant="h6" gutterBottom>
                                Size
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <TextField
                                fullWidth
                                label="Width"
                                type="number"
                                value={width}
                                onChange={(e) =>
                                    setWidth(Number(e.target.value))
                                }
                                inputProps={{ min: 50, max: 1000 }}
                            />
                        </Grid>

                        <Grid size={6}>
                            <TextField
                                fullWidth
                                label="Height"
                                type="number"
                                value={height}
                                onChange={(e) =>
                                    setHeight(Number(e.target.value))
                                }
                                inputProps={{ min: 20, max: 1000 }}
                            />
                        </Grid>

                        {/* Background Section */}
                        <Grid size={12}>
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{ mt: 2 }}
                            >
                                Background
                            </Typography>
                        </Grid>

                        <Grid size={12}>
                            <Box>
                                <Typography variant="body2" gutterBottom>
                                    Background Color
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <input
                                        type="color"
                                        value={
                                            backgroundColor === 'transparent'
                                                ? '#ffffff'
                                                : backgroundColor
                                        }
                                        onChange={(e) =>
                                            setBackgroundColor(e.target.value)
                                        }
                                        style={{
                                            width: '50px',
                                            height: '40px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }}
                                    />
                                    <TextField
                                        size="small"
                                        value={backgroundColor}
                                        onChange={(e) =>
                                            setBackgroundColor(e.target.value)
                                        }
                                        placeholder="transparent"
                                        sx={{ flexGrow: 1 }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                            setBackgroundColor('transparent')
                                        }
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Border Radius */}
                        <Grid size={12}>
                            <TextField
                                fullWidth
                                label="Border Radius"
                                type="number"
                                value={borderRadius}
                                onChange={(e) =>
                                    setBorderRadius(Number(e.target.value))
                                }
                                inputProps={{ min: 0, max: 50 }}
                                helperText="Border radius in pixels (0 for sharp corners)"
                            />
                        </Grid>

                        {/* Vertical Alignment */}
                        <Grid size={12}>
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{ mt: 2 }}
                            >
                                Alignment
                            </Typography>
                        </Grid>

                        <Grid size={12}>
                            <FormControl fullWidth>
                                <InputLabel>Vertical Alignment</InputLabel>
                                <Select
                                    value={verticalAlign}
                                    label="Vertical Alignment"
                                    onChange={(e) =>
                                        setVerticalAlign(
                                            e.target.value as
                                                | 'top'
                                                | 'middle'
                                                | 'bottom',
                                        )
                                    }
                                >
                                    <MenuItem value="top">Top</MenuItem>
                                    <MenuItem value="middle">Middle</MenuItem>
                                    <MenuItem value="bottom">Bottom</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">
                    Apply Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};
