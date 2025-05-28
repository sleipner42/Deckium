import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  DataGrid,
} from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Refresh } from '@mui/icons-material';
import { adminApi } from '../lib/api';
import type { User, Transaction } from '../lib/api';

export default function TransactionManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminApi.getUsers();
      setUsers(usersData);
      setError(null);
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactions = async (userId: number) => {
    try {
      setLoadingTransactions(true);
      const [transactionsData, balance] = await Promise.all([
        adminApi.getUserTransactions(userId),
        adminApi.getUserBalance(userId),
      ]);
      setTransactions(transactionsData);
      setUserBalance(balance);
      setError(null);
    } catch (error) {
      setError('Failed to fetch user transactions');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId && typeof selectedUserId === 'number') {
      fetchUserTransactions(selectedUserId);
    } else {
      setTransactions([]);
      setUserBalance(null);
    }
  }, [selectedUserId]);

  const handleRefresh = () => {
    if (selectedUserId && typeof selectedUserId === 'number') {
      fetchUserTransactions(selectedUserId);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={`$${params.value.toFixed(2)}`}
          color={params.value > 0 ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    { field: 'description', headerName: 'Description', width: 300 },
    {
      field: 'created_at',
      headerName: 'Date',
      width: 180,
      valueFormatter: (value: string) => {
        return new Date(value).toLocaleString();
      },
    },
  ];

  const selectedUser = users.find(user => user.id === selectedUserId);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Transaction Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={!selectedUserId}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="user-select-label">Select User</InputLabel>
          <Select
            labelId="user-select-label"
            value={selectedUserId}
            label="Select User"
            onChange={(e) => setSelectedUserId(e.target.value as number)}
            disabled={loading}
          >
            <MenuItem value="">
              <em>Select a user...</em>
            </MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.full_name || user.email} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedUser && userBalance !== null && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            User: {selectedUser.full_name || selectedUser.email}
          </Typography>
          <Typography variant="body1">
            Current Balance: 
            <Chip
              label={`$${userBalance.toFixed(2)}`}
              color={userBalance > 0 ? 'success' : 'default'}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>
      )}

      {selectedUserId && (
        <DataGrid
          rows={transactions}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25]}
          loading={loadingTransactions}
          autoHeight
          disableRowSelectionOnClick
        />
      )}

      {!selectedUserId && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Please select a user to view their transactions.
          </Typography>
        </Box>
      )}
    </Box>
  );
} 