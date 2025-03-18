import React, { useState, useEffect } from 'react';
import { BarChart } from '../../../../../common/domain/entities/types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface BarChartEditorProps {
  element: BarChart;
  onUpdate: (elementId: string, updates: Partial<BarChart>) => void;
  onClose: () => void;
  open: boolean;
}

export const BarChartEditor: React.FC<BarChartEditorProps> = ({
  element,
  onUpdate,
  onClose,
  open
}) => {
  const [title, setTitle] = useState(element.title);
  const [xAxisLabel, setXAxisLabel] = useState(element.xAxisLabel);
  const [yAxisLabel, setYAxisLabel] = useState(element.yAxisLabel);
  const [chartData, setChartData] = useState<{x: (string | number)[]; y: number[]}>({
    x: [...element.data.x],
    y: [...element.data.y]
  });

  // Reset form when element changes
  useEffect(() => {
    setTitle(element.title);
    setXAxisLabel(element.xAxisLabel);
    setYAxisLabel(element.yAxisLabel);
    setChartData({
      x: [...element.data.x],
      y: [...element.data.y]
    });
  }, [element]);

  const handleSave = () => {
    onUpdate(element.id, {
      title,
      xAxisLabel,
      yAxisLabel,
      data: chartData
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setTitle(element.title);
    setXAxisLabel(element.xAxisLabel);
    setYAxisLabel(element.yAxisLabel);
    setChartData({
      x: [...element.data.x],
      y: [...element.data.y]
    });
    onClose();
  };

  const updateDataPoint = (index: number, field: 'x' | 'y', value: string) => {
    const newData = { ...chartData };
    if (field === 'x') {
      newData.x[index] = value;
    } else {
      newData.y[index] = Number(value) || 0;
    }
    setChartData(newData);
  };

  const addDataPoint = () => {
    const newData = { ...chartData };
    newData.x.push('');
    newData.y.push(0);
    setChartData(newData);
  };

  const removeDataPoint = (index: number) => {
    const newData = { ...chartData };
    newData.x = newData.x.filter((_, i) => i !== index);
    newData.y = newData.y.filter((_, i) => i !== index);
    setChartData(newData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          Edit Bar Chart
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Chart Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="X-Axis Label"
              value={xAxisLabel}
              onChange={(e) => setXAxisLabel(e.target.value)}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Y-Axis Label"
              value={yAxisLabel}
              onChange={(e) => setYAxisLabel(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Chart Data
              </Typography>
              <Button 
                startIcon={<AddIcon />} 
                onClick={addDataPoint}
                size="small"
                variant="outlined"
              >
                Add Data Point
              </Button>
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Category (X)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Value (Y)</TableCell>
                    <TableCell align="center" sx={{ width: 70 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chartData.x.map((xValue, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={xValue}
                          onChange={(e) => updateDataPoint(index, 'x', e.target.value)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          type="number"
                          value={chartData.y[index]}
                          onChange={(e) => updateDataPoint(index, 'y', e.target.value)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => removeDataPoint(index)}
                          disabled={chartData.x.length <= 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 