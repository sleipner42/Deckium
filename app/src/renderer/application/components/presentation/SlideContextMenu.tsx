import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SettingsIcon from '@mui/icons-material/Settings';
import {
    Divider,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from '@mui/material';
import React from 'react';

interface SlideContextMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    onPaste?: () => void;
    onProperties?: () => void;
    canPaste: boolean;
}

export const SlideContextMenu: React.FC<SlideContextMenuProps> = ({
    anchorEl,
    open,
    onClose,
    onPaste,
    onProperties,
    canPaste,
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
            {/* Paste option */}
            {onPaste && (
                <MenuItem
                    onClick={() => handleMenuItemClick(onPaste)}
                    disabled={!canPaste}
                >
                    <ListItemIcon>
                        <ContentPasteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Paste</ListItemText>
                </MenuItem>
            )}

            {/* Divider between paste and properties */}
            {onPaste && onProperties && <Divider />}

            {/* Properties option */}
            {onProperties && (
                <MenuItem onClick={() => handleMenuItemClick(onProperties)}>
                    <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Properties</ListItemText>
                </MenuItem>
            )}
        </Menu>
    );
};
