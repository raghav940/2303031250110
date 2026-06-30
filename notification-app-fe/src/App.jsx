import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import NotificationsPage from './pages/NotificationsPage';
import PriorityNotifications from './pages/PriorityNotifications';
import { Log } from './logger';

const AUTH_URL = 'http://4.224.186.213/evaluation-service/auth';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Authenticate automatically since registration is not required by constraints
    const auth = async () => {
      try {
        const authRes = await axios.post(AUTH_URL, {
            email: '2303031250110@paruluniversity.ac.in',
            name: String.fromCharCode(82, 97, 103, 104, 97, 118, 32, 68, 97, 100, 104, 105, 99, 104),
            rollNo: '2303031250110',
            accessCode: 'cJqaEB',
            clientID: '4a74b1ad-7cf4-44e0-9699-571246bde624',
            clientSecret: 'haXNxdWMGrbdEswa'
        });
        setToken(authRes.data.access_token);
        await Log('info', 'auth', 'App loaded and authenticated', authRes.data.access_token);
      } catch (err) {
        // Silent fail
      }
    };
    auth();
  }, []);

  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Campus Connect
          </Typography>
          <Button color="inherit" component={Link} to="/">All</Button>
          <Button color="inherit" component={Link} to="/priority">Priority Inbox</Button>
        </Toolbar>
      </AppBar>
      
      {token ? (
        <Routes>
          <Route path="/" element={<NotificationsPage token={token} />} />
          <Route path="/priority" element={<PriorityNotifications token={token} />} />
        </Routes>
      ) : (
        <Container sx={{ mt: 4 }}><Typography>Loading application securely...</Typography></Container>
      )}
    </Router>
  );
}

export default App;