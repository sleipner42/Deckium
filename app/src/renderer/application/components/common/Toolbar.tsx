import BarChartIcon from '@mui/icons-material/BarChart';
import ShapesIcon from '@mui/icons-material/Category';
import TriangleIcon from '@mui/icons-material/ChangeHistory';
import ImageIcon from '@mui/icons-material/Image';
import CircleIcon from '@mui/icons-material/RadioButtonUnchecked';
import RectangleIcon from '@mui/icons-material/Rectangle';
import PresentationIcon from '@mui/icons-material/Slideshow';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {
    alpha,
    Box,
    Button,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import {
    createBarChart,
    createImage,
    createShape,
    createTextBox,
} from '../../../../common/domain/entities/element-factory';
import { usePresentation } from '../../context/PresentationContext';

interface ToolbarProps {
    style?: React.CSSProperties;
}

export const Toolbar: React.FC<ToolbarProps> = ({ style }) => {
    const { selectedSlide, addElement } = usePresentation();

    const [shapeAnchorEl, setShapeAnchorEl] = useState<null | HTMLElement>(
        null,
    );

    const handleShapeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setShapeAnchorEl(event.currentTarget);
    };

    const handleShapeMenuClose = () => {
        setShapeAnchorEl(null);
    };

    const addTextElement = async () => {
        if (!selectedSlide) return;
        console.log('addTextElement', selectedSlide.id);
        const newTextElement = createTextBox({
            position: { x: 100, y: 100 },
            size: { width: 200, height: 200 },
            content: '<p>Hello, world!</p>',
        });
        await addElement(newTextElement);
    };

    const addShapeElement = async (
        shapeType: 'rectangle' | 'circle' | 'triangle',
    ) => {
        if (!selectedSlide) return;
        console.log('addShapeElement', selectedSlide.id, shapeType);
        const newShapeElement = createShape({
            shapeType,
            position: { x: 100, y: 100 },
            size: { width: 150, height: 150 },
            fillColor: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 2,
        });
        await addElement(newShapeElement);
        handleShapeMenuClose();
    };

    const addBarChartElement = async () => {
        if (!selectedSlide) return;
        console.log('addBarChartElement', selectedSlide.id);
        const newBarChartElement = createBarChart({
            position: { x: 100, y: 100 },
            size: { width: 300, height: 200 },
            title: 'Sample Data',
            xAxisLabel: 'Categories',
            yAxisLabel: 'Values',
        });
        await addElement(newBarChartElement);
    };

    const addImageElement = async () => {
        if (!selectedSlide) return;

        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                // Convert file to data URL
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const imageDataUrl = e.target?.result as string;

                    // Create new image element
                    const newImageElement = createImage({
                        position: { x: 100, y: 100 },
                        size: { width: 200, height: 150 },
                        content: imageDataUrl,
                    });

                    await addElement(newImageElement);
                };
                reader.readAsDataURL(file);
            }
        };

        // Trigger file dialog
        input.click();
    };

    const handleStartPresentation = () => {
        window.electron.presentation.openFullscreen();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                height: '60px',
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                gap: 2,
                WebkitAppRegion: 'drag',
                position: 'relative',
                ...style,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexGrow: 1,
                    WebkitAppRegion: 'no-drag',
                    gap: 1,
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 600,
                        color: 'text.secondary',
                        mr: 1,
                    }}
                >
                    Insert
                </Typography>

                <Tooltip title="Add Text">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TextFieldsIcon />}
                        onClick={addTextElement}
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            px: 2,
                            borderColor: alpha('#000', 0.12),
                            '&:hover': {
                                bgcolor: alpha('#007AFF', 0.04),
                                borderColor: alpha('#007AFF', 0.5),
                            },
                        }}
                    >
                        Text
                    </Button>
                </Tooltip>

                <Tooltip title="Add Image">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ImageIcon />}
                        onClick={addImageElement}
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            px: 2,
                            borderColor: alpha('#000', 0.12),
                            '&:hover': {
                                bgcolor: alpha('#007AFF', 0.04),
                                borderColor: alpha('#007AFF', 0.5),
                            },
                        }}
                    >
                        Image
                    </Button>
                </Tooltip>

                <Tooltip title="Add Shape">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ShapesIcon />}
                        onClick={handleShapeMenuOpen}
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            px: 2,
                            borderColor: alpha('#000', 0.12),
                            '&:hover': {
                                bgcolor: alpha('#007AFF', 0.04),
                                borderColor: alpha('#007AFF', 0.5),
                            },
                        }}
                    >
                        Shape
                    </Button>
                </Tooltip>

                <Tooltip title="Add Bar Chart">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<BarChartIcon />}
                        onClick={addBarChartElement}
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            px: 2,
                            borderColor: alpha('#000', 0.12),
                            '&:hover': {
                                bgcolor: alpha('#007AFF', 0.04),
                                borderColor: alpha('#007AFF', 0.5),
                            },
                        }}
                    >
                        Chart
                    </Button>
                </Tooltip>

                <Tooltip title="Present">
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PresentationIcon />}
                        onClick={handleStartPresentation}
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            px: 2,
                            ml: 1,
                            bgcolor: 'primary.main',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            },
                        }}
                    >
                        Present
                    </Button>
                </Tooltip>

                <Menu
                    anchorEl={shapeAnchorEl}
                    open={Boolean(shapeAnchorEl)}
                    onClose={handleShapeMenuClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <MenuItem onClick={() => addShapeElement('rectangle')}>
                        <ListItemIcon>
                            <RectangleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Rectangle</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => addShapeElement('circle')}>
                        <ListItemIcon>
                            <CircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Circle</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => addShapeElement('triangle')}>
                        <ListItemIcon>
                            <TriangleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Triangle</ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default Toolbar;
