import { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Button,
  Box, IconButton, Dialog, DialogTitle, DialogContent, Alert, TextField,
  CircularProgress, Menu, MenuItem, Avatar,
  Divider, Chip
} from '@mui/material';
import SpaIcon from '@mui/icons-material/Spa';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationCenter from './components/NotificationCenter';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
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
import LandingPage2 from './pages/LandingPage/LandingPage2';
import Register from './pages/Register';
import Profile from './pages/Profile';

const validateMobile = (num) => {
  const digits = (num || '').replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
};

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

function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(api.getCurrentUser());
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);

  // Unified Auth Modal State
  const [authOpen, setAuthOpen] = useState(false);
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
      setAuthOpen(true);
      setAuthError('Your session has expired or is invalid. Please sign in again.');
    };
    window.addEventListener('auth-invalid-token', handleInvalidToken);
    return () => window.removeEventListener('auth-invalid-token', handleInvalidToken);
  }, []);

  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (!api.getToken()) return;
    if (isInitial) setNotifLoading(true);
    try {
      const data = await api.getNotifications();
      console.log("Debug notification ", data)

      setNotifications(data.items || []);
      setNotifError(null);
    } catch (err) {
      console.error('Failed to load notifications', err);
      setNotifError('Unable to load notifications. Please try again.');
    } finally {
      if (isInitial) setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      Promise.resolve().then(() => fetchNotifications(true));
      const interval = setInterval(() => fetchNotifications(false), 10000);
      return () => clearInterval(interval);
    } else {
      Promise.resolve().then(() => {
        setNotifications([]);
        setNotifError(null);
      });
    }
  }, [currentUser, fetchNotifications]);

  const handleMarkNotifRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Open Unified Auth Modal for both Sign In and Register
  const handleOpenAuth = (presetMobile = '') => {
    setAuthError('');
    setMobile(typeof presetMobile === 'string' ? presetMobile : '');
    setOtp('');
    setOtpSent(false);
    setOtpSuccessMsg('');
    setAuthOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthOpen(false);
    setOtp('');
    setOtpSent(false);
    setAuthError('');
  };

  // Mobile input change: resets OTP state immediately
  const handleMobileChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(clean);
    setOtp('');
    setOtpSent(false);
    setAuthError('');
    setOtpSuccessMsg('');
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

      const res = await api.sendOtp(cleanMobile, false);

      setOtpSent(true);
      setOtp(''); // Field is completely empty by default
      setOtpSuccessMsg(`OTP sent to +91 ${cleanMobile}. Please enter the 6-digit code.`);
      toast.info(`OTP sent to +91 ${cleanMobile}`);
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

      // Verify OTP with backend
      const res = await api.verifyOtp(cleanMobile, otp.trim());

      if (res.user || (res.exists && res.user)) {
        // User already in database -> logged in successfully
        setCurrentUser(res.user);
        setAuthOpen(false);
        toast.success(`Welcome back, ${res.user.name || 'User'}!`);

        if (res.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // User does not exist -> Navigate to registration page with verified mobile
        toast.success('Mobile verified! Please complete your registration.');
        setAuthOpen(false);
        navigate('/register', {
          state: {
            verifiedMobile: cleanMobile,
            otpVerified: true
          }
        });
      }
    } catch (err) {
      setAuthError(err.message || 'OTP verification failed. Please try again.');
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

  // const renderDashboardLink = () => {
  //   if (!currentUser) return null;
  //   const path = currentUser.role === 'admin' ? '/admin' : '/dashboard';
  //   return (
  //     <Button
  //       component={Link}
  //       to={path}
  //       startIcon={<DashboardIcon />}
  //       aria-label="Dashboard"
  //       sx={{
  //         fontWeight: 700,
  //         color: '#1e1b4b',
  //         fontSize: '0.86rem',
  //         textTransform: 'none',
  //         '& .MuiButton-startIcon': { mr: 0.75 },
  //       }}
  //     >
  //       Dashboard123
  //     </Button>
  //   );
  // };

  const isApproved = currentUser?.approved === true;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <AppBar
        position="sticky"
        elevation={0}
        className='glass-navbar'
        sx={{
          background: "rgba(255, 255, 255, 0.52)",
          backdropFilter: "blur(12px) saturate(140%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.55)",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
          // transition:"background 200ms ease, boxShadow 200ms ease",
          // -webkit-backdrop-filter: blur(16px) saturate(140%);
          color: '#0f172a',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1, px: { xs: 2, sm: 4, md: 6 }, minHeight: '70px' }}>
          {/* Logo Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit' }} component={Link} to="/">
            <SpaIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '-0.5px', ...(['admin', 'counselor'].includes(currentUser?.role) ? { whiteSpace: 'nowrap', fontSize: { xs: 20, sm: 24 } } : {}) }}>
              BJS Counselling
            </Typography>
          </Box>

          {/* Right Navigation Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
            {/* <Box sx={{ display: ['admin', 'counselor'].includes(currentUser?.role) ? { xs: 'none', sm: 'block' } : 'block' }}>{renderDashboardLink()}</Box> */}

            {currentUser && notifications.length > 0 && (
              <NotificationCenter
                notifications={notifications}
                unreadCount={notifications.filter(n => !n.read).length}
                onMarkRead={handleMarkNotifRead}
                onMarkAllRead={handleMarkAllNotifsRead}
                loading={notifLoading}
                error={notifError}
                onRefresh={() => fetchNotifications(true)}
                currentUser={currentUser}
              />
            )}

            {/* User Dropdown / Sign In Options */}
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
                  <Avatar src={currentUser.avatar} alt={currentUser.name} sx={{ width: 36, height: 36 }}>
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </Avatar>
                </IconButton>

                {/* IMPROVED USER POPOVER */}
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    elevation: 6,
                    sx: {
                      width: 290,
                      borderRadius: 3.5,
                      p: 1.25,
                      mt: 1.5,
                      boxShadow: '0 12px 35px rgba(15, 23, 42, 0.12)',
                      border: '1px solid #e2e8f0',
                    }
                  }}
                >
                  {/* User Profile Header Card inside Popover */}
                  <Box sx={{
                    p: 2,
                    mb: 1.25,
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, rgba(243, 232, 255, 0.6) 0%, rgba(241, 245, 249, 0.8) 100%)',
                    border: '1px solid #e9d5ff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        sx={{
                          width: 46,
                          height: 46,
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)',
                          border: '2px solid #ffffff',
                          bgcolor: '#ede9fe',
                          color: '#6b21a8',
                          fontWeight: 700
                        }}
                      >
                        {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                      </Avatar>
                      <Box sx={{ overflow: 'hidden', flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'Outfit', lineHeight: 1.2, noWrap: true, color: '#1e1b4b' }}>
                          {currentUser.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          +91 {currentUser.mobile || currentUser.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={
                          currentUser.role === 'counselor'
                            ? <PsychologyIcon sx={{ fontSize: '14px !important' }} />
                            : currentUser.role === 'admin'
                              ? <AdminPanelSettingsIcon sx={{ fontSize: '14px !important' }} />
                              : <PersonIcon sx={{ fontSize: '14px !important' }} />
                        }
                        label={currentUser.role ? currentUser.role.toUpperCase() : 'PATIENT'}
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          bgcolor: '#ede9fe',
                          color: '#6b21a8',
                          height: 22
                        }}
                      />

                      <Chip
                        size="small"
                        icon={isApproved ? <CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} /> : <HourglassEmptyIcon sx={{ fontSize: '13px !important', color: '#d97706 !important' }} />}
                        label={isApproved ? 'Verified' : 'Under Review'}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          bgcolor: isApproved ? '#dcfce7' : '#fef3c7',
                          color: isApproved ? '#15803d' : '#b45309',
                          height: 22,
                          border: '1px solid',
                          borderColor: isApproved ? '#bbf7d0' : '#fde68a'
                        }}
                      />
                    </Box>
                  </Box>

                  <MenuItem
                    component={Link}
                    to={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
                    onClick={handleMenuClose}
                    sx={{ borderRadius: 2, py: 1.1, px: 1.75, fontWeight: 700, gap: 1.5, fontSize: '0.88rem', color: '#1e1b4b' }}
                  >
                    <DashboardIcon fontSize="small" sx={{ color: '#7c3aed' }} />
                    Dashboard
                  </MenuItem>

                  <MenuItem
                    component={Link}
                    to="/profile"
                    onClick={handleMenuClose}
                    sx={{ borderRadius: 2, py: 1.1, px: 1.75, fontWeight: 700, gap: 1.5, fontSize: '0.88rem', color: '#1e1b4b' }}
                  >
                    <PersonOutlinedIcon fontSize="small" sx={{ color: '#0d9488' }} />
                    My Profile
                  </MenuItem>

                  {/* {currentUser.role === 'admin' && (
                    <MenuItem
                      component={Link}
                      to="/admin"
                      onClick={handleMenuClose}
                      sx={{ borderRadius: 2, py: 1.1, px: 1.75, fontWeight: 700, gap: 1.5, fontSize: '0.88rem', color: '#1e1b4b' }}
                    >
                      <AdminPanelSettingsIcon fontSize="small" sx={{ color: '#3b82f6' }} />
                      Admin Console
                    </MenuItem>
                  )} */}

                  <Divider sx={{ my: 0.75 }} />

                  <MenuItem
                    onClick={handleLogout}
                    sx={{ borderRadius: 2, py: 1.1, px: 1.75, fontWeight: 700, gap: 1.5, fontSize: '0.88rem', color: '#ef4444' }}
                  >
                    <LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} />
                    Log Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Unified Auth Button */}
                <Button
                  variant="text"
                  onClick={() => handleOpenAuth('')}
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

                <Button
                  onClick={() => handleOpenAuth('')}
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
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main View Display Container */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<LandingPage onAuthRedirect={() => handleOpenAuth('')} onOpenRegisterAuth={() => handleOpenAuth('')} />} />
          <Route path="/lp2" element={<LandingPage2 />} />
          <Route path="/session-request" element={<SessionRequest onAuthRedirect={() => handleOpenAuth('')} currentUser={currentUser} />} />
          <Route path="/register" element={<Register onAuthSuccess={setCurrentUser} onOpenAuth={() => handleOpenAuth('')} currentUser={currentUser} />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={() => handleOpenAuth('')}>
                <Profile currentUser={currentUser} onUserUpdated={setCurrentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={() => handleOpenAuth('')} allowedRoles={['patient', 'user', 'counselor']}>
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
              <ProtectedRoute currentUser={currentUser} onAuthRequired={() => handleOpenAuth('')} allowedRoles={['admin']}>
                <AdminDashboard currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:id"
            element={
              <ProtectedRoute currentUser={currentUser} onAuthRequired={() => handleOpenAuth('')}>
                <SessionRoom currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* UNIFIED VERIFICATION MODAL FOR SIGN IN & REGISTER */}
      <Dialog open={authOpen} onClose={handleCloseAuth} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pt: 3.5, pb: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: '50%',
              bgcolor: '#f3e8ff',
              color: '#7c3aed',
              mb: 1
            }}
          >
            <LockOutlinedIcon fontSize="medium" />
          </Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b' }}>
            Sign In or Register
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Enter your mobile number. We will verify your number with OTP and guide you to Sign In or Registration.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 1, pb: 3.5 }}>
          {authError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{authError}</Alert>}
          {otpSuccessMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{otpSuccessMsg}</Alert>}

          <Box component="form" onSubmit={otpSent ? handleAuthSubmit : handleSendOtp}>
            <TextField
              label="10-Digit Mobile Number"
              fullWidth
              margin="normal"
              disabled={otpSent}
              value={mobile}
              onChange={handleMobileChange}
              inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pr: 1, borderRight: '1px solid #cbd5e1', mr: 1 }}>
                    <PhoneIphoneIcon sx={{ color: '#64748b', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>+91</Typography>
                  </Box>
                )
              }}
              autoFocus
            />

            {otpSent && (
              <TextField
                label="6-Digit OTP Verification Code"
                fullWidth
                margin="normal"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                helperText="Enter the 6-digit code received"
                autoFocus
              />
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 3,
                py: 1.3,
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.92rem',
                bgcolor: '#4c3b71',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(76, 59, 113, 0.25)',
                '&:hover': { bgcolor: '#3b2064' }
              }}
              disabled={authLoading}
            >
              {authLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                otpSent ? 'Verify & Continue' : 'Send OTP Code'
              )}
            </Button>

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
                  sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
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
          </Box>
        </DialogContent>
      </Dialog>

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
