import React, { useState } from 'react';
import { usePresentation } from '../../context/PresentationContext';
import { 
  Box, 
  Button, 
  Divider, 
  IconButton, 
  Tooltip,
  Typography,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import ShapesIcon from '@mui/icons-material/Category';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import RectangleIcon from '@mui/icons-material/Rectangle';
import CircleIcon from '@mui/icons-material/RadioButtonUnchecked';
import TriangleIcon from '@mui/icons-material/ChangeHistory';
import BarChartIcon from '@mui/icons-material/BarChart';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';

interface ToolbarProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Toolbar: React.FC<ToolbarProps> = ({ className, style }) => {
  const { selectedSlide, addElement } = usePresentation();
  const [shapeAnchorEl, setShapeAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleShapeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setShapeAnchorEl(event.currentTarget);
  };
  
  const handleShapeMenuClose = () => {
    setShapeAnchorEl(null);
  };
  
  const addTextElement = async () => {
    if (!selectedSlide) return;
    console.log('addTextElement', selectedSlide.id);
    const newTextElement = ElementFactory.createTextBox({
      position: { x: 100, y: 100 },
      size: { width: 200, height: 200 },
      content: 'Hello, world!',
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      backgroundColor: '#FFFFFF',
      backgroundOpacity: 1,
      align: 'left'
    });
    await addElement(newTextElement);
  };
  
  const addShapeElement = async (shapeType: 'rectangle' | 'circle' | 'triangle') => {
    if (!selectedSlide) return;
    console.log('addShapeElement', selectedSlide.id, shapeType);
    const newShapeElement = ElementFactory.createShape({
      shapeType,
      position: { x: 100, y: 100 },
      size: { width: 150, height: 150 },
      fillColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 2
    });
    await addElement(newShapeElement);
    handleShapeMenuClose();
  };
  
  const addBarChartElement = async () => {
    if (!selectedSlide) return;
    console.log('addBarChartElement', selectedSlide.id);
    const newBarChartElement = ElementFactory.createBarChart({
      position: { x: 100, y: 100 },
      size: { width: 300, height: 200 },
      title: 'Sample Data',
      xAxisLabel: 'Categories',
      yAxisLabel: 'Values'
    });
    await addElement(newBarChartElement);
  };
  
  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        gap: 2,
        ...style
      }}
    >
      <Typography 
        variant="subtitle2" 
        sx={{ 
          fontWeight: 600, 
          color: 'text.secondary',
          mr: 1
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
            }
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
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            px: 2,
            borderColor: alpha('#000', 0.12),
            '&:hover': {
              bgcolor: alpha('#007AFF', 0.04),
              borderColor: alpha('#007AFF', 0.5),
            }
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
            }
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
            }
          }}
        >
          Chart
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
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      <Typography 
        variant="subtitle2" 
        sx={{ 
          fontWeight: 600, 
          color: 'text.secondary',
          ml: 1
        }}
      >
        Format
      </Typography>
      
      <Tooltip title="Bold">
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Italic">
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Underline">
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <FormatUnderlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Fill Color">
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <FormatColorFillIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
    </Box>
  );
};