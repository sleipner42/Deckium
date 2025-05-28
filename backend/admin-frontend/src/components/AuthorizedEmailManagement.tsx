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
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import { adminApi } from '../lib/api';
import type { AuthorizedEmail, CreateAuthorizedEmail, UpdateAuthorizedEmail } from '../lib/api';

interface CreateEmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEmailDialog({ open, onClose, onSuccess }: CreateEmailDialogProps) {
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) return;
    
    setLoading(true);
    setError(null);
    try {
      const emailData: CreateAuthorizedEmail = {
        email,
        is_active: isActive,
      };
      await adminApi.createAuthorizedEmail(emailData);
      onSuccess();
      onClose();
      setEmail('');
      setIsActive(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create authorized email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Authorized Email</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label="Email"
          type="email"
          fullWidth
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          }
          label="Active"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading || !email}>
          Add Email
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface EditEmailDialogProps {
  open: boolean;
  onClose: () => void;
  email: AuthorizedEmail | null;
  onSuccess: () => void;
}

function EditEmailDialog({ open, onClose, email, onSuccess }: EditEmailDialogProps) {
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (email) {
      setIsActive(email.is_active);
    }
  }, [email]);

  const handleSubmit = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      const updateData: UpdateAuthorizedEmail = {
        is_active: isActive,
      };
      await adminApi.updateAuthorizedEmail(email.id, updateData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update authorized email:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Authorized Email</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Email: {email?.email}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          }
          label="Active"
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

export default function AuthorizedEmailManagement() {
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AuthorizedEmail | null>(null);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const emailsData = await adminApi.getAuthorizedEmails();
      setEmails(emailsData);
      setError(null);
    } catch (error) {
      setError('Failed to fetch authorized emails');
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleEdit = (email: AuthorizedEmail) => {
    setSelectedEmail(email);
    setEditDialogOpen(true);
  };

  const handleDelete = async (email: AuthorizedEmail) => {
    const confirmMessage = `Are you sure you want to delete the authorized email ${email.email}?`;
    if (window.confirm(confirmMessage)) {
      try {
        await adminApi.deleteAuthorizedEmail(email.id);
        fetchEmails();
      } catch (error) {
        console.error('Failed to delete authorized email:', error);
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'email', headerName: 'Email', width: 300 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
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
    { field: 'created_by', headerName: 'Created By', width: 120 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="Edit"
          onClick={() => handleEdit(params.row)}
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
          Authorized Email Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Email
        </Button>
      </Box>

      <DataGrid
        rows={emails}
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

      <CreateEmailDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchEmails}
      />

      <EditEmailDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        email={selectedEmail}
        onSuccess={fetchEmails}
      />
    </Box>
  );
} 