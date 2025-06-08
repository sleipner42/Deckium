import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { BarChart } from '../../../../common/domain/entities/types';

interface BarChartPropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  chart: BarChart | null;
  onUpdate: (updates: Partial<BarChart>) => void;
}

export const BarChartPropertiesDialog: React.FC<BarChartPropertiesDialogProps> = ({
  open,
  onClose,
  chart,
  onUpdate,
}) => {
  const [title, setTitle] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('');
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [barColor, setBarColor] = useState('#007bff');
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(200);
  const [dataPoints, setDataPoints] = useState<Array<{ x: string; y: number }>>([]);

  useEffect(() => {
    if (chart) {
      setTitle(chart.title || '');
      setXAxisLabel(chart.xAxisLabel || '');
      setYAxisLabel(chart.yAxisLabel || '');
      setBarColor(chart.barColor || '#007bff');
      setWidth(chart.size?.width || 300);
      setHeight(chart.size?.height || 200);
      
      // Convert chart data to editable format
      if (chart.data?.x && chart.data?.y) {
        const points = chart.data.x.map((x, i) => ({
          x: String(x),
          y: chart.data.y[i] || 0,
        }));
        setDataPoints(points);
      } else {
        setDataPoints([{ x: 'Category 1', y: 10 }]);
      }
    }
  }, [chart]);

  const handleSave = () => {
    if (!chart) return;

    const updates: Partial<BarChart> = {
      title,
      xAxisLabel,
      yAxisLabel,
      barColor,
      size: {
        width,
        height,
      },
      data: {
        x: dataPoints.map(point => point.x),
        y: dataPoints.map(point => point.y),
      },
    };

    onUpdate(updates);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    if (chart) {
      setTitle(chart.title || '');
      setXAxisLabel(chart.xAxisLabel || '');
      setYAxisLabel(chart.yAxisLabel || '');
      setBarColor(chart.barColor || '#007bff');
      setWidth(chart.size?.width || 300);
      setHeight(chart.size?.height || 200);
      
      if (chart.data?.x && chart.data?.y) {
        const points = chart.data.x.map((x, i) => ({
          x: String(x),
          y: chart.data.y[i] || 0,
        }));
        setDataPoints(points);
      }
    }
    onClose();
  };

  const addDataPoint = () => {
    setDataPoints([...dataPoints, { x: `Category ${dataPoints.length + 1}`, y: 0 }]);
  };

  const removeDataPoint = (index: number) => {
    if (dataPoints.length > 1) {
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const updateDataPoint = (index: number, field: 'x' | 'y', value: string | number) => {
    const newDataPoints = [...dataPoints];
    if (field === 'x') {
      newDataPoints[index].x = String(value);
    } else {
      newDataPoints[index].y = Number(value);
    }
    setDataPoints(newDataPoints);
  };

  if (!chart) return null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Bar Chart Properties</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Chart Info Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Chart Information
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chart Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter chart title"
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="X-Axis Label"
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                placeholder="Categories"
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Y-Axis Label"
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                placeholder="Values"
              />
            </Grid>

            {/* Size Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
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
                inputProps={{ min: 200, max: 1000 }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Height"
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                inputProps={{ min: 150, max: 800 }}
              />
            </Grid>

            {/* Appearance Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Appearance
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Bar Color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={barColor}
                    onChange={(e) => setBarColor(e.target.value)}
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
                    value={barColor}
                    onChange={(e) => setBarColor(e.target.value)}
                    placeholder="#007bff"
                  />
                </Box>
              </Box>
            </Grid>

            {/* Data Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                <Typography variant="h6">
                  Chart Data
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addDataPoint}
                  variant="outlined"
                  size="small"
                >
                  Add Data Point
                </Button>
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell width="60px">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataPoints.map((point, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={point.x}
                            onChange={(e) => updateDataPoint(index, 'x', e.target.value)}
                            placeholder="Category name"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            type="number"
                            value={point.y}
                            onChange={(e) => updateDataPoint(index, 'y', e.target.value)}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => removeDataPoint(index)}
                            disabled={dataPoints.length <= 1}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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