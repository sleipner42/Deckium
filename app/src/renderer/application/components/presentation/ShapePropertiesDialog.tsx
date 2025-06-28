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
import { Shape } from '../../../../common/domain/entities/types';

interface ShapePropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  shape: Shape | null;
  onUpdate: (updates: Partial<Shape>) => void;
}

export const ShapePropertiesDialog: React.FC<ShapePropertiesDialogProps> = ({
  open,
  onClose,
  shape,
  onUpdate,
}) => {
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [width, setWidth] = useState(150);
  const [height, setHeight] = useState(150);

  useEffect(() => {
    if (shape) {
      setFillColor(shape.fillColor || '#FFFFFF');
      setStrokeColor(shape.strokeColor || '#000000');
      setStrokeWidth(shape.strokeWidth || 2);
      setWidth(shape.size?.width || 150);
      setHeight(shape.size?.height || 150);
    }
  }, [shape]);

  const handleSave = () => {
    if (!shape) return;

    const updates: Partial<Shape> = {
      fillColor,
      strokeColor,
      strokeWidth,
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
    if (shape) {
      setFillColor(shape.fillColor || '#FFFFFF');
      setStrokeColor(shape.strokeColor || '#000000');
      setStrokeWidth(shape.strokeWidth || 2);
      setWidth(shape.size?.width || 150);
      setHeight(shape.size?.height || 150);
    }
    onClose();
  };

  if (!shape) return null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        Shape Properties -{' '}
        {shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Size Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Size
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Width"
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                inputProps={{ min: 10, max: 1000 }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Height"
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                inputProps={{ min: 10, max: 1000 }}
              />
            </Grid>

            {/* Colors Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Colors
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Fill Color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
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
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    placeholder="#FFFFFF"
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Border Color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
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
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    placeholder="#000000"
                  />
                </Box>
              </Box>
            </Grid>

            {/* Border Width */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Border Width"
                type="number"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                inputProps={{ min: 0, max: 20 }}
                helperText="Border width in pixels (0 for no border)"
              />
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
