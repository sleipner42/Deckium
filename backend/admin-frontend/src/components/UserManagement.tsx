import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
} from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import {
  Edit,
  Delete,
  AccountBalance,
  Add,
} from '@mui/icons-material';
import { adminApi } from '../lib/api';
import type { User, UpdateUser } from '../lib/api';

interface AddCreditsDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

function AddCreditsDialog({ open, onClose, user, onSuccess }: AddCreditsDialogProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Admin credit adjustment');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !amount) return;
    
    setLoading(true);
    try {
      await adminApi.addCredits(user.id, parseFloat(amount), description);
      onSuccess();
      onClose();
      setAmount('');
      setDescription('Admin credit adjustment');
    } catch (error) {
      console.error('Failed to add credits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Credits to {user?.full_name || user?.email}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Amount"
          type="number"
          fullWidth
          variant="outlined"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading || !amount}>
          Add Credits
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

function EditUserDialog({ open, onClose, user, onSuccess }: EditUserDialogProps) {
  const [formData, setFormData] = useState<UpdateUser>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        is_active: user.is_active,
        is_superuser: user.is_superuser,
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await adminApi.updateUser(user.id, formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Full Name"
          fullWidth
          variant="outlined"
          value={formData.full_name || ''}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active || false}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          }
          label="Active"
          sx={{ mb: 1 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_superuser || false}
              onChange={(e) => setFormData({ ...formData, is_superuser: e.target.checked })}
            />
          }
          label="Superuser"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userBalances, setUserBalances] = useState<Record<number, number>>({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminApi.getUsers();
      setUsers(usersData);
      
      const balances: Record<number, number> = {};
      for (const user of usersData) {
        try {
          const balance = await adminApi.getUserBalance(user.id);
          balances[user.id] = balance;
        } catch (error) {
          console.error(`Failed to fetch balance for user ${user.id}:`, error);
          balances[user.id] = 0;
        }
      }
      setUserBalances(balances);
      setError(null);
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleAddCredits = (user: User) => {
    setSelectedUser(user);
    setCreditsDialogOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user ${user.email}?`)) {
      try {
        await adminApi.deleteUser(user.id);
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };



  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'full_name', headerName: 'Full Name', width: 200 },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={`$${(userBalances[params.row.id] || 0).toFixed(2)}`}
          color={userBalances[params.row.id] > 0 ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'is_superuser',
      headerName: 'Superuser',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Yes' : 'No'}
          color={params.value ? 'secondary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      valueFormatter: (value: string) => {
        return new Date(value).toLocaleString();
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="Edit"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          key="credits"
          icon={<AccountBalance />}
          label="Add Credits"
          onClick={() => handleAddCredits(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDelete(params.row)}
        />,
      ],
    },
  ];

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
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={fetchUsers}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <DataGrid
        rows={users}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[5, 10, 25]}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
      />

      <EditUserDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <AddCreditsDialog
        open={creditsDialogOpen}
        onClose={() => setCreditsDialogOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </Box>
  );
} 