import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  ThemeProvider,
  CssBaseline,
  Button,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
  Card,
  Fade,
  Divider,
} from '@mui/material';
import {
  People,
  Email,
  AccountBalance,
  Login,
  Logout,
  Dashboard as DashboardIcon,
  KeyboardArrowDown,
  AdminPanelSettings,
} from '@mui/icons-material';
import { theme } from './theme';
import UserManagement from './components/UserManagement';
import AuthorizedEmailManagement from './components/AuthorizedEmailManagement';
import TransactionManagement from './components/TransactionManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { AuthUser } from './lib/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function LoginScreen() {
  const { login } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ width: '100%', px: 3 }}>
        <Fade in timeout={800}>
          <Card
            sx={{
              p: 4,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Box sx={{ mb: 4 }}>
              <AdminPanelSettings 
                sx={{ 
                  fontSize: 80, 
                  color: 'primary.main',
                  mb: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }} 
              />
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'grey.800' }}>
                Admin Dashboard
              </Typography>
              <Typography variant="body1" color="grey.600" sx={{ mb: 4 }}>
                Sign in to access the administrative interface and manage your platform.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<Login />}
              onClick={login}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 600,
                minWidth: 200,
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Sign in with Google
            </Button>

            <Typography variant="caption" display="block" sx={{ mt: 3, color: 'grey.500' }}>
              Secure authentication powered by Google OAuth
            </Typography>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
}

function Dashboard({ user }: { user: AuthUser }) {
  const [value, setValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { logout } = useAuth();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const tabData = [
    { icon: <People />, label: 'Users', component: <UserManagement /> },
    { icon: <Email />, label: 'Authorized Emails', component: <AuthorizedEmailManagement /> },
    { icon: <AccountBalance />, label: 'Transactions', component: <TransactionManagement /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', backgroundColor: 'background.default', margin: 0, padding: 0 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 0,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          width: '100%',
        }}
      >
        <Box sx={{ px: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DashboardIcon sx={{ color: 'white', fontSize: 32 }} />
              <Typography variant="h5" component="h1" sx={{ color: 'white', fontWeight: 700 }}>
                Admin Dashboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                onClick={handleMenuOpen}
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <Avatar 
                  src={user.picture} 
                  alt={user.name}
                  sx={{ width: 32, height: 32 }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user.name}
                </Typography>
                <KeyboardArrowDown />
              </Button>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  }
                }}
              >
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography variant="subtitle2" color="grey.600">
                    Signed in as
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ gap: 1, mt: 1 }}>
                  <Logout fontSize="small" />
                  Sign out
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ px: 2, py: 2 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            width: '100%',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'grey.50' }}>
            <Tabs 
              value={value} 
              onChange={handleChange} 
              aria-label="dashboard tabs"
              sx={{
                px: 2,
                '& .MuiTab-root': {
                  py: 2,
                  minHeight: 64,
                  fontSize: '1rem',
                  fontWeight: 500,
                },
              }}
            >
              {tabData.map((tab, index) => (
                <Tab
                  key={index}
                  icon={tab.icon}
                  label={tab.label}
                  {...a11yProps(index)}
                  iconPosition="start"
                  sx={{
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>
          
          {tabData.map((tab, index) => (
            <CustomTabPanel key={index} value={value} index={index}>
              <Box sx={{ p: 3 }}>
                {tab.component}
              </Box>
            </CustomTabPanel>
          ))}
        </Paper>
      </Box>
    </Box>
  );
}

function LoadingScreen() {
  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Box sx={{ textAlign: 'center', color: 'white' }}>
        <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
        <Typography variant="h6">Loading...</Typography>
      </Box>
    </Box>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated && user ? <Dashboard user={user} /> : <LoginScreen />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
