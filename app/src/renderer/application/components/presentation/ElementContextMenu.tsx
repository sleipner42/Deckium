import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SettingsIcon from '@mui/icons-material/Settings';
import {
    Divider,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from '@mui/material';
import React from 'react';

interface ElementContextMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    onCopy?: () => void;
    onMoveForward: () => void;
    onMoveBackward: () => void;
    onMoveToTop: () => void;
    onMoveToBottom: () => void;
    onEditProperties?: () => void;
    elementType?: string;
}

export const ElementContextMenu: React.FC<ElementContextMenuProps> = ({
    anchorEl,
    open,
    onClose,
    onCopy,
    onMoveForward,
    onMoveBackward,
    onMoveToTop,
    onMoveToBottom,
    onEditProperties,
    elementType,
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
            {/* Copy option */}
            {onCopy && (
                <MenuItem onClick={() => handleMenuItemClick(onCopy)}>
                    <ListItemIcon>
                        <ContentCopyIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Copy</ListItemText>
                </MenuItem>
            )}
            {onCopy && <Divider />}

            {/* Show Properties option for shapes and charts */}
            {(elementType === 'rectangle' ||
                elementType === 'circle' ||
                elementType === 'triangle' ||
                elementType === 'barchart') &&
                onEditProperties && (
                    <MenuItem
                        onClick={() =>
                            handleMenuItemClick(onEditProperties)
                        }
                    >
                        <ListItemIcon>
                            <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Properties</ListItemText>
                    </MenuItem>
                )}
            {(elementType === 'rectangle' ||
                elementType === 'circle' ||
                elementType === 'triangle' ||
                elementType === 'barchart') &&
                onEditProperties && <Divider />}

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
