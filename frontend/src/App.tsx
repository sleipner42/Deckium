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
} from '@mui/material';
import {
  People,
  Email,
  AccountBalance,
} from '@mui/icons-material';
import { theme } from './theme';
import UserManagement from './components/UserManagement';
import AuthorizedEmailManagement from './components/AuthorizedEmailManagement';
import TransactionManagement from './components/TransactionManagement';

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
        <Box sx={{ p: 3 }}>
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

function App() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          User Management Dashboard
        </Typography>
        
        <Paper elevation={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={value} onChange={handleChange} aria-label="dashboard tabs">
              <Tab
                icon={<People />}
                label="Users"
                {...a11yProps(0)}
                iconPosition="start"
              />
              <Tab
                icon={<Email />}
                label="Authorized Emails"
                {...a11yProps(1)}
                iconPosition="start"
              />
              <Tab
                icon={<AccountBalance />}
                label="Transactions"
                {...a11yProps(2)}
                iconPosition="start"
              />
            </Tabs>
          </Box>
          
          <CustomTabPanel value={value} index={0}>
            <UserManagement />
          </CustomTabPanel>
          
          <CustomTabPanel value={value} index={1}>
            <AuthorizedEmailManagement />
          </CustomTabPanel>
          
          <CustomTabPanel value={value} index={2}>
            <TransactionManagement />
          </CustomTabPanel>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App; 