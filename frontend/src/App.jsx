import { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { 
  ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Button, 
  Box, IconButton, Dialog, DialogTitle, DialogContent, Alert, TextField, 
  Tabs, Tab, CircularProgress, Tooltip, Menu, MenuItem, Avatar,
  Divider, Grid, FormControl, InputLabel, Select, Badge, Popover, Snackbar
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SpaIcon from '@mui/icons-material/Spa';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { getTheme } from './theme';
import { api } from './api';

const validateMobile = (num) => {
  const digits = num.replace(/\D/g, '');
  return digits.length === 10;
};

// Pages imports
import Landing from './pages/Landing';
import PatientDashboard from './pages/PatientDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SessionRoom from './pages/SessionRoom';

// Custom wrapper to protect routes based on auth status and roles
function ProtectedRoute({ children, allowedRoles, currentUser, onAuthRequired }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      onAuthRequired();
      navigate('/');
    }
  }, [currentUser, navigate, onAuthRequired]);

  if (!currentUser) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">Access Forbidden. You do not have the required permissions for this dashboard view.</Alert>
        <Button component={Link} to="/" sx={{ mt: 2 }} variant="contained">Back to Home</Button>
      </Box>
    );
  }

  return children;
}

// Inner App with routing logic
function AppContent({ themeMode, toggleTheme }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(api.getCurrentUser());
  const [notifications, setNotifications] = useState([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  
  const fetchNotifications = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [currentUser, fetchNotifications]);

  const handleMarkNotifRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState(0); // 0 = Login, 1 = Register
  
  // Auth Form State (User Registration)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [preferredCounselingMode, setPreferredCounselingMode] = useState('Online');
  const [counselingRequirements, setCounselingRequirements] = useState('');
  
  // Counselor Specific Fields
  const [specialty, setSpecialty] = useState('');
  const [price, setPrice] = useState('100');
  const [bio, setBio] = useState('');
  const [credentials, setCredentials] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // OTP Login State
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  // Snackbar Alert state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // User Dropdown anchor
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpenAuth = () => {
    setAuthError('');
    setName('');
    setMobile('');
    setEmail('');
    setDob('');
    setGender('Male');
    setState('');
    setCity('');
    setPreferredLanguage('English');
    setPreferredCounselingMode('Online');
    setCounselingRequirements('');
    setOtp('');
    setOtpSent(false);
    setOtpSuccessMsg('');
    setAuthOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthOpen(false);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!mobile) {
      setAuthError('Please enter your mobile number.');
      return;
    }
    if (!validateMobile(mobile)) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError('');
      const isSignUp = authTab === 1;
      const res = await api.sendOtp(mobile, isSignUp);
      setOtpSent(true);
      setOtpSuccessMsg(res.message || 'OTP sent successfully!');
    } catch (err) {
      setAuthError(err.message || 'Failed to send OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpLoginSubmit = async (e) => {
    e.preventDefault();
    if (!mobile || !otp) {
      setAuthError('Please enter both mobile number and OTP.');
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError('');
      const data = await api.verifyOtp(mobile, otp);
      setCurrentUser(data.user);
      setAuthOpen(false);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setAuthError(err.message || 'OTP verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Standard Register Submit (User Registration)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      setAuthError('Please fill in required fields (Full Name and Mobile Number).');
      return;
    }

    if (!validateMobile(mobile)) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!otpSent) {
      await handleSendOtp(e);
      return;
    }

    if (!otp) {
      setAuthError('Please enter the OTP verification code sent to your mobile.');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');
      const payload = {
        otp,
        name,
        role: 'user',
        mobile,
        email,
        dob,
        gender,
        state,
        city,
        preferredLanguage,
        preferredCounselingMode,
        counselingRequirements
      };
      const data = await api.register(payload);
      setCurrentUser(data.user);
      setAuthOpen(false);

      // Reset form states
      setName('');
      setMobile('');
      setEmail('');
      setDob('');
      setGender('Male');
      setState('');
      setCity('');
      setPreferredLanguage('English');
      setPreferredCounselingMode('Online');
      setCounselingRequirements('');
      setOtp('');
      setOtpSent(false);
      setOtpSuccessMsg('');

      navigate('/dashboard');
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setAnchorEl(null);
    navigate('/');
  };

  const handleMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Dynamic header rendering
  const renderDashboardLink = () => {
    if (!currentUser) return null;
    const path = currentUser.role === 'admin' ? '/admin' : '/dashboard';
    return (
      <Button 
        component={Link} 
        to={path} 
        startIcon={<DashboardIcon />}
        sx={{ fontWeight: 600 }}
      >
        Dashboard
      </Button>
    );
  };

  const renderBookSessionLink = () => {
    if (!currentUser || (currentUser.role !== 'patient' && currentUser.role !== 'user')) return null;
    return (
      <Button 
        component={Link} 
        to="/" 
        sx={{ fontWeight: 600 }}
      >
        Book Counselor
      </Button>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Logo Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit' }} component={Link} to="/">
            <SpaIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '-0.5px' }}>
              MindEase
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {renderDashboardLink()}
            {renderBookSessionLink()}

            {currentUser && (
              <Box>
                <IconButton 
                  color="inherit" 
                  onClick={(e) => setNotifAnchorEl(e.currentTarget)}
                >
                  <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
                <Popover
                  open={Boolean(notifAnchorEl)}
                  anchorEl={notifAnchorEl}
                  onClose={() => setNotifAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{ sx: { width: 320, maxHeight: 400, borderRadius: 3, p: 2 } }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Outfit' }}>
                    Notifications
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  {notifications.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic' }}>
                      No notifications yet.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', maxHeight: 300 }}>
                      {notifications.map((notif) => (
                        <Box 
                          key={notif.id} 
                          onClick={() => handleMarkNotifRead(notif.id)}
                          sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            cursor: 'pointer',
                            bgcolor: notif.read ? 'transparent' : 'action.hover',
                            border: '1px solid',
                            borderColor: notif.read ? 'divider' : 'primary.light',
                            '&:hover': { bgcolor: 'action.selected' }
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: notif.read ? 400 : 600 }}>
                            {notif.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {new Date(notif.date).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Popover>
              </Box>
            )}

            {/* Light/Dark mode toggler */}
            <Tooltip title="Toggle light/dark theme">
              <IconButton onClick={toggleTheme} color="inherit">
                {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Auth options */}
            {currentUser ? (
              <Box>
                <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                  <Avatar src={currentUser.avatar} sx={{ width: 36, height: 36 }} />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled>
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{currentUser.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{currentUser.email}</Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  <MenuItem 
                    component={Link} 
                    to={currentUser.role === 'admin' ? '/admin' : '/dashboard'} 
                    onClick={handleMenuClose}
                  >
                    Dashboard View
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Log Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleOpenAuth}
                startIcon={<AccountCircleIcon />}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main View Display Container */}
      <Box sx={{ flexGrow: 1 }}>
        <Routes>
          <Route 
            path="/" 
            element={
              <Landing 
                onAuthRedirect={handleOpenAuth} 
                currentUser={currentUser} 
              />
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={handleOpenAuth} allowedRoles={['patient', 'user', 'counselor']}>
                {currentUser?.role === 'counselor' ? (
                  <CounselorDashboard currentUser={currentUser} />
                ) : (
                  <PatientDashboard currentUser={currentUser} />
                )}
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin" 
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={handleOpenAuth} allowedRoles={['admin']}>
                <AdminDashboard currentUser={currentUser} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/session/:id" 
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={handleOpenAuth}>
                <SessionRoom currentUser={currentUser} />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* Auth Portal Modal Dialog */}
      <Dialog open={authOpen} onClose={handleCloseAuth} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          <Tabs 
            value={authTab} 
            onChange={(e, val) => { 
              setAuthTab(val); 
              setAuthError(''); 
              setOtpSent(false); 
              setMobile(''); 
              setOtp(''); 
              setOtpSuccessMsg(''); 
            }} 
            centered
          >
            <Tab label="Sign In" />
            <Tab label="Register" />
          </Tabs>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {authError && <Alert severity="error" sx={{ mb: 2 }}>{authError}</Alert>}
          {otpSuccessMsg && <Alert severity="success" sx={{ mb: 2 }}>{otpSuccessMsg}</Alert>}

          {authTab === 0 ? (
            <Box>
              <form onSubmit={otpSent ? handleOtpLoginSubmit : handleSendOtp}>
                <TextField
                  label="Mobile Number"
                  placeholder="e.g. 9876543210"
                  fullWidth
                  margin="normal"
                  disabled={otpSent}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputProps={{ maxLength: 10 }}
                />

                {otpSent && (
                  <TextField
                    label="OTP Verification Code"
                    placeholder="Enter 123456"
                    fullWidth
                    margin="normal"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    autoFocus
                  />
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3, py: 1.25, borderRadius: 2, fontWeight: 600 }}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <CircularProgress size={24} />
                  ) : (
                    otpSent ? 'Verify & Log In' : 'Send OTP Code'
                  )}
                </Button>
              </form>
              {otpSent && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setOtpSuccessMsg('');
                      setAuthError('');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Change Number
                  </Button>
                  <Button
                    size="small"
                    onClick={handleSendOtp}
                    disabled={authLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    Resend OTP
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            // Register Form (User Registration)
            <form onSubmit={handleRegisterSubmit}>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Mobile Number"
                    placeholder="e.g. 9876543210"
                    fullWidth
                    required
                    disabled={otpSent}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputProps={{ maxLength: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    type="email"
                    placeholder="e.g. user@example.com"
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date of Birth (DOB)"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={gender}
                      label="Gender"
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                      <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="State"
                    fullWidth
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="City"
                    fullWidth
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Language</InputLabel>
                    <Select
                      value={preferredLanguage}
                      label="Preferred Language"
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                    >
                      <MenuItem value="English">English</MenuItem>
                      <MenuItem value="Hindi">Hindi</MenuItem>
                      <MenuItem value="Marathi">Marathi</MenuItem>
                      <MenuItem value="Gujarati">Gujarati</MenuItem>
                      <MenuItem value="Bengali">Bengali</MenuItem>
                      <MenuItem value="Tamil">Tamil</MenuItem>
                      <MenuItem value="Telugu">Telugu</MenuItem>
                      <MenuItem value="Kannada">Kannada</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Counseling Mode</InputLabel>
                    <Select
                      value={preferredCounselingMode}
                      label="Preferred Counseling Mode"
                      onChange={(e) => setPreferredCounselingMode(e.target.value)}
                    >
                      <MenuItem value="Online">Online</MenuItem>
                      <MenuItem value="Offline">Offline</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Briefly describe your counseling requirements"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Describe what counseling or support you are looking for..."
                    value={counselingRequirements}
                    onChange={(e) => setCounselingRequirements(e.target.value)}
                  />
                </Grid>
              </Grid>

              {otpSent && (
                <TextField
                  label="OTP Verification Code"
                  placeholder="Enter 123456"
                  fullWidth
                  margin="normal"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoFocus
                  sx={{ mt: 2 }}
                />
              )}

              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                sx={{ mt: 3, py: 1.25, borderRadius: 2, fontWeight: 600 }}
                disabled={authLoading}
              >
                {authLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  otpSent ? 'Submit & Create Account' : 'Send OTP Code'
                )}
              </Button>
            </form>
          )}
          {otpSent && authTab === 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button 
                size="small" 
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setOtpSuccessMsg('');
                  setAuthError('');
                }}
                sx={{ textTransform: 'none' }}
              >
                Change Number
              </Button>
              <Button 
                size="small" 
                onClick={handleSendOtp}
                disabled={authLoading}
                sx={{ textTransform: 'none' }}
              >
                Resend OTP
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function App() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const theme = getTheme(themeMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent themeMode={themeMode} toggleTheme={toggleTheme} />
      </Router>
    </ThemeProvider>
  );
}
