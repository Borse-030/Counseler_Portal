import { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Button,
  Box, IconButton, Dialog, DialogTitle, DialogContent, Alert, TextField,
  CircularProgress, Menu, MenuItem, Avatar,
  Divider, Badge, Popover, Chip
} from '@mui/material';
import SpaIcon from '@mui/icons-material/Spa';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
// import SpaIcon from '@mui/icons-material/Spa';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { ToastContainer, toast } from 'react-toastify';

import { getTheme } from './theme';
import { api } from './api';

// Pages imports
import LandingPage from './pages/LandingPage/LandingPage';
import SessionRequest from './pages/SessionRequest';
import PatientDashboard from './pages/PatientDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SessionRoom from './pages/SessionRoom';
import Register from './pages/Register';

const validateMobile = (num) => {
  const digits = (num || '').replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
};

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
function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(api.getCurrentUser());
  const [notifications, setNotifications] = useState([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);

  // Auth Dialog Mode: 'signin' | 'register'
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'register'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Mobile & OTP Form State
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  // User Dropdown anchor
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const handleInvalidToken = () => {
      setCurrentUser(null);
      setAuthMode('signin');
      setAuthOpen(true);
      setAuthError('Your session has expired or is invalid. Please sign in again.');
    };
    window.addEventListener('auth-invalid-token', handleInvalidToken);
    return () => window.removeEventListener('auth-invalid-token', handleInvalidToken);
  }, []);

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
      Promise.resolve().then(fetchNotifications);
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      Promise.resolve().then(() => setNotifications([]));
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

  // Open Dialog for Sign In
  const handleOpenSignIn = (presetMobile = '') => {
    setAuthMode('signin');
    setAuthError('');
    setMobile(typeof presetMobile === 'string' ? presetMobile : '');
    setOtp('');
    setOtpSent(false);
    setOtpSuccessMsg('');
    setAuthOpen(true);
  };

  // Open Dialog for Register
  const handleOpenRegister = (presetMobile = '') => {
    setAuthMode('register');
    setAuthError('');
    setMobile(typeof presetMobile === 'string' ? presetMobile : '');
    setOtp('');
    setOtpSent(false);
    setOtpSuccessMsg('');
    setAuthOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthOpen(false);
  };

  // Send OTP handler
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      setAuthError('Please enter your 10-digit mobile number.');
      return;
    }
    if (!validateMobile(cleanMobile)) {
      setAuthError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      const isSignUp = authMode === 'register';
      const res = await api.sendOtp(cleanMobile, isSignUp);

      setOtpSent(true);
      setOtp('123456'); // Pre-fill default code for effortless testing
      setOtpSuccessMsg(res.message || 'OTP sent successfully! Default verification code: 123456');
      toast.info(`OTP sent to +91 ${cleanMobile}. Default code is 123456`);
    } catch (err) {
      setAuthError(err.message || 'Failed to send OTP.');
      toast.error(err.message || 'Failed to send OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit OTP Verification
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile || !otp) {
      setAuthError('Please enter both mobile number and OTP code.');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      if (authMode === 'register') {
        // Registration verification flow
        const res = await api.verifyRegistrationOtp(cleanMobile, otp.trim());

        if (res.exists || res.registered) {
          // User already in database -> switch to Sign In
          toast.info('This mobile number is already registered! Redirecting to Sign In...');
          setAuthMode('signin');
          setOtpSent(false);
          setOtp('');
          setAuthError('Account already exists with this number. Please sign in with OTP.');
          return;
        }

        // User is new -> Navigate to register page with pre-verified state
        toast.success('Mobile number verified! Proceeding to registration intake...');
        setAuthOpen(false);
        navigate('/register', {
          state: {
            verifiedMobile: cleanMobile,
            otpVerified: true
          }
        });
      } else {
        // Sign In verification flow
        const data = await api.verifyOtp(cleanMobile, otp.trim());
        setCurrentUser(data.user);
        setAuthOpen(false);
        toast.success(`Welcome back, ${data.user.name || 'User'}!`);

        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setAuthError(err.message || 'OTP verification failed.');
      toast.error(err.message || 'OTP verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setAnchorEl(null);
    navigate('/');
    toast.info('Logged out successfully.');
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
        aria-label="Dashboard"
        sx={{
          fontWeight: 700,
          color: '#1e1b4b',
          fontSize: '0.86rem',
          textTransform: 'none',
          '& .MuiButton-startIcon': { mr: 0.75 },
        }}
      >
        Dashboard
      </Button>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navbar matching attached screenshot */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          color: '#0f172a',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1, px: { xs: 2, sm: 4, md: 6 }, minHeight: '70px' }}>

          {/* Logo Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit' }} component={Link} to="/">
            <SpaIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '-0.5px' }}>
              BJS Counseling
            </Typography>
          </Box>



          {/* Right Navigation Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
            {renderDashboardLink()}

            {/* Status Pill matching screenshot */}
            {/* <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 0.75,
                px: 1.75,
                py: 0.6,
                borderRadius: '99px',
                bgcolor: '#dcfce7',
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#16a34a' }} />
              Available Today
            </Box> */}

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

            {/* Auth options */}
            {currentUser ? (
              <Box>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    p: 0.5,
                    border: '2px solid',
                    borderColor: '#7c3aed',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.05)' }
                  }}
                >
                  <Avatar src={currentUser.avatar} sx={{ width: 36, height: 36 }} />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    elevation: 6,
                    sx: {
                      minWidth: 260,
                      borderRadius: 3,
                      p: 1,
                      mt: 1,
                      overflow: 'visible',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                      border: '1px solid #e2e8f0',
                    }
                  }}
                >
                  <Box sx={{
                    p: 1.75,
                    mb: 1,
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 100%)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.5
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                      <Avatar
                        src={currentUser.avatar}
                        sx={{
                          width: 44,
                          height: 44,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                          border: '2px solid #ffffff'
                        }}
                      />
                      <Box sx={{ overflow: 'hidden', flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'Outfit', lineHeight: 1.2, noWrap: true }}>
                          {currentUser.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {currentUser.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      size="small"
                      icon={
                        currentUser.role === 'counselor'
                          ? <PsychologyIcon sx={{ fontSize: '15px !important' }} />
                          : currentUser.role === 'admin'
                            ? <AdminPanelSettingsIcon sx={{ fontSize: '15px !important' }} />
                            : <PersonIcon sx={{ fontSize: '15px !important' }} />
                      }
                      label={`Role: ${currentUser.role || 'user'}`}
                      sx={{
                        mt: 0.75,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        textTransform: 'capitalize',
                        bgcolor: 'rgba(99,102,241,0.14)',
                        color: '#4f46e5',
                      }}
                    />
                  </Box>

                  <MenuItem
                    component={Link}
                    to={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
                    onClick={handleMenuClose}
                    sx={{ borderRadius: 1.5, py: 1, px: 1.5, fontWeight: 600, gap: 1.25, fontSize: '0.9rem' }}
                  >
                    <DashboardIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    Dashboard View
                  </MenuItem>

                  <Divider sx={{ my: 0.5 }} />

                  <MenuItem
                    onClick={handleLogout}
                    sx={{ borderRadius: 1.5, py: 1, px: 1.5, fontWeight: 600, gap: 1.25, fontSize: '0.9rem', color: 'error.main' }}
                  >
                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                    Log Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Sign In text link */}
                <Button
                  variant="text"
                  onClick={() => handleOpenSignIn('')}
                  sx={{
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    '&:hover': { color: '#1e1b4b', bgcolor: 'transparent' }
                  }}
                >
                  Sign In
                </Button>

                {/* Book a Counselling Session button */}
                <Button
                  onClick={() => handleOpenRegister('')}
                  variant="contained"
                  startIcon={<ShieldOutlinedIcon sx={{ fontSize: '17px !important' }} />}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    borderRadius: '12px',
                    bgcolor: '#4c3b71',
                    color: '#ffffff',
                    px: 2.25,
                    py: 0.9,
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: '#3b2064',
                      boxShadow: 'none',
                    }
                  }}
                >
                  Register
                </Button>

                <Avatar
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  sx={{ width: 34, height: 34, display: { xs: 'none', sm: 'inline-block' } }}
                />
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main View Display Container */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onAuthRedirect={handleOpenSignIn}
                onOpenRegisterAuth={handleOpenRegister}
                currentUser={currentUser}
              />
            }
          />

          <Route
            path="/session-request"
            element={
              <SessionRequest
                onAuthRedirect={handleOpenSignIn}
                currentUser={currentUser}
              />
            }
          />

          <Route
            path="/register"
            element={
              <Register
                onAuthSuccess={setCurrentUser}
                onOpenAuth={handleOpenSignIn}
                currentUser={currentUser}
              />
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={handleOpenSignIn} allowedRoles={['patient', 'user', 'counselor']}>
                {currentUser?.role === 'counselor' ? (
                  <CounselorDashboard currentUser={currentUser} />
                ) : (
                  <PatientDashboard currentUser={currentUser} onUserUpdated={setCurrentUser} />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={handleOpenSignIn} allowedRoles={['admin']}>
                <AdminDashboard currentUser={currentUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/session/:id"
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={handleOpenSignIn}>
                <SessionRoom currentUser={currentUser} />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* Dynamic Unified Verification Dialog (Sign In or Register) */}
      <Dialog open={authOpen} onClose={handleCloseAuth} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.25,
              borderRadius: '50%',
              bgcolor: '#f3e8ff',
              color: '#7c3aed',
              mb: 1
            }}
          >
            {authMode === 'register' ? <HowToRegOutlinedIcon /> : <LockOutlinedIcon />}
          </Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b' }}>
            {authMode === 'register' ? 'Register for Counselling Program' : 'Sign In to Counselling Program'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {authMode === 'register'
              ? 'Enter your mobile number and verify OTP to start registration.'
              : 'Enter your registered mobile number to sign in securely.'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          {authError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{authError}</Alert>}
          {otpSuccessMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{otpSuccessMsg}</Alert>}

          <Box>
            <form onSubmit={otpSent ? handleAuthSubmit : handleSendOtp}>
              <TextField
                label="Mobile Number"
                placeholder="e.g. 9876543210"
                fullWidth
                margin="normal"
                disabled={otpSent}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                autoFocus
              />

              {otpSent && (
                <TextField
                  label="OTP Verification Code"
                  placeholder="Enter 6-digit code"
                  fullWidth
                  margin="normal"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                  helperText="Default testing code: 123456"
                  autoFocus
                />
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{
                  mt: 3,
                  py: 1.25,
                  borderRadius: '12px',
                  fontWeight: 700,
                  bgcolor: '#4c3b71',
                  '&:hover': { bgcolor: '#3b2064' }
                }}
                disabled={authLoading}
              >
                {authLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  otpSent
                    ? (authMode === 'register' ? 'Verify & Continue to Intake' : 'Verify & Sign In')
                    : 'Send OTP Code'
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
                  sx={{ textTransform: 'none', color: '#64748b' }}
                >
                  Change Number
                </Button>
                <Button
                  size="small"
                  onClick={handleSendOtp}
                  disabled={authLoading}
                  sx={{ textTransform: 'none', color: '#7c3aed', fontWeight: 700 }}
                >
                  Resend OTP
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Toggle between Register & Sign In inside modal */}
            <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              {authMode === 'register' ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Already have an account?
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setAuthMode('signin');
                      setOtpSent(false);
                      setOtp('');
                      setAuthError('');
                      setOtpSuccessMsg('');
                    }}
                    sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none', borderColor: '#4c3b71', color: '#4c3b71' }}
                  >
                    Switch to Sign In
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Don&apos;t have an account yet?
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setAuthMode('register');
                      setOtpSent(false);
                      setOtp('');
                      setAuthError('');
                      setOtpSuccessMsg('');
                    }}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none', borderColor: '#4c3b71', color: '#4c3b71' }}
                  >
                    Begin Intake Registration
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Global Toast Container for all feedback */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Box>
  );
}

export default function App() {
  const [themeMode] = useState(() => localStorage.getItem('theme') || 'light');


  const theme = getTheme(themeMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
