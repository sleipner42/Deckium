import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface ElementContextMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
}

export const ElementContextMenu: React.FC<ElementContextMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onMoveForward,
  onMoveBackward,
  onMoveToTop,
  onMoveToBottom,
}) => {
  const handleMenuItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={() => handleMenuItemClick(onMoveToTop)}>
        <ListItemIcon>
          <FlipToFrontIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Move to Top</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => handleMenuItemClick(onMoveForward)}>
        <ListItemIcon>
          <KeyboardArrowUpIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Move Forward</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => handleMenuItemClick(onMoveBackward)}>
        <ListItemIcon>
          <KeyboardArrowDownIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Move Backward</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => handleMenuItemClick(onMoveToBottom)}>
        <ListItemIcon>
          <FlipToBackIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Move to Bottom</ListItemText>
      </MenuItem>
    </Menu>
  );
};