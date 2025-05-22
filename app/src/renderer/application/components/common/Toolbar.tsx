import React, { useState, useEffect } from 'react';
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
  ListItemText,
} from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import ShapesIcon from '@mui/icons-material/Category';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import RectangleIcon from '@mui/icons-material/Rectangle';
import CircleIcon from '@mui/icons-material/RadioButtonUnchecked';
import TriangleIcon from '@mui/icons-material/ChangeHistory';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PresentationIcon from '@mui/icons-material/Slideshow';
import { useAuth } from '../../context/AuthContext';
import { usePresentation } from '../../context/PresentationContext';
import { ElementFactory } from '../../../../common/domain/entities/element-factory';

interface ToolbarProps {
  style?: React.CSSProperties;
}

export const Toolbar: React.FC<ToolbarProps> = ({ style }) => {
  const { selectedSlide, addElement } = usePresentation();

  const [shapeAnchorEl, setShapeAnchorEl] = useState<null | HTMLElement>(null);
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);
  const [balance, setBalance] = useState<number>(0);
  const [balanceError, setBalanceError] = useState<boolean>(false);
  const { authState, logout, getBalance } = useAuth();

  const fetchUserBalance = async () => {
    if (authState.isAuthenticated) {
      try {
        setBalanceError(false);
        const userBalance = await getBalance();
        setBalance(userBalance);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalanceError(true);
      }
    }
  };

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchUserBalance();
    }
  }, [authState.isAuthenticated]);

  const handleShapeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setShapeAnchorEl(event.currentTarget);
  };

  const handleShapeMenuClose = () => {
    setShapeAnchorEl(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserAnchorEl(event.currentTarget);
    fetchUserBalance();
  };

  const handleUserMenuClose = () => {
    setUserAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleUserMenuClose();
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
      align: 'left',
    });
    await addElement(newTextElement);
  };

  const addShapeElement = async (
    shapeType: 'rectangle' | 'circle' | 'triangle',
  ) => {
    if (!selectedSlide) return;
    console.log('addShapeElement', selectedSlide.id, shapeType);
    const newShapeElement = ElementFactory.createShape({
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
    const newBarChartElement = ElementFactory.createBarChart({
      position: { x: 100, y: 100 },
      size: { width: 300, height: 200 },
      title: 'Sample Data',
      xAxisLabel: 'Categories',
      yAxisLabel: 'Values',
    });
    await addElement(newBarChartElement);
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
              ml: 2,
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

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            ml: 1,
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

      <Box
        sx={{
          position: 'absolute',
          right: 16,
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
        }}
      >
        <Tooltip title="User Account">
          <IconButton
            size="small"
            onClick={handleUserMenuOpen}
            sx={{ color: 'text.secondary' }}
          >
            <AccountCircleIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={userAnchorEl}
          open={Boolean(userAnchorEl)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {authState.user && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1">
                {authState.user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {authState.user.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Balance: {balanceError ? 'Not available' : balance.toFixed(2)}
              </Typography>
            </Box>
          )}
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Toolbar;
