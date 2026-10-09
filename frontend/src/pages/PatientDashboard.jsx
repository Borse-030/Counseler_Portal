import ReschedulePanel from '../components/ReschedulePanel';
import { mergeRescheduleResult } from '../utils/rescheduling';
import { feedbackEligible, hasFeedback, resolvedStatuses, sessionStatus, statusLabel } from '../utils/sessionOutcome';
import useSessionClock from '../hooks/useSessionClock';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, CircularProgress, Alert, Divider, Avatar, Step, StepLabel, Stepper, Stack
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { api } from '../api';
import AttendSessionButton from '../components/AttendSessionButton';

const getAppointmentDateParts = (dateValue) => {
  const parsedDate = dateValue ? new Date(dateValue) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return { month: 'SESSION', day: '--', weekday: dateValue || 'Date to be confirmed' };
  }

  return {
    month: parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: parsedDate.toLocaleDateString('en-US', { day: '2-digit' }),
    weekday: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
  };
};

export default function PatientDashboard({ currentUser, onUserUpdated }) {
  const now = useSessionClock();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  useEffect(() => {
    let active = true;
    const refresh = () => api.getAppointments().then(data => { if (active) setAppointments(data); }).catch(() => { });
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, []);
  const [sessionRequests, setSessionRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab control
  const [activeTab, setActiveTab] = useState(0);

  // Review Dialog State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const savingReview = useRef(false);

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({});

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [apts, requests] = await Promise.all([api.getAppointments(), api.getSessionRequests()]);
      setAppointments(apts);
      setSessionRequests(requests);
      setTransactions(apts.filter(apt => ['upcoming', 'completed'].includes(apt.status)).map(apt => ({
        id: apt.id, appointmentId: apt.id, counselorName: apt.counselorName, date: apt.date,
        status: apt.status, paymentMethod: 'BJS internal care', amount: 0,
      })));
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      Promise.resolve().then(() => {
        fetchDashboardData();
      });
    }
  }, [currentUser, fetchDashboardData]);

  const handleOpenReview = (apt) => {
    setSelectedApt(apt);
    setReviewText('');
    setReviewError('');
    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    if (!savingReview.current) setReviewOpen(false);
  };

  const handleReviewSubmit = async () => {
    if (savingReview.current) return;
    if (!reviewText.trim()) {
      setReviewError('Please write your feedback about the session.');
      return;
    }
    if (reviewText.length > 2000) {
      setReviewError('Please keep your comment under 2,000 characters.');
      return;
    }

    try {
      savingReview.current = true;
      setReviewLoading(true);
      setReviewError('');
      const result = await api.submitReview(selectedApt.id, reviewText.trim());
      setAppointments(previous => previous.map(apt => apt.id === selectedApt.id ? { ...apt, review: result.review } : apt));

      setReviewOpen(false);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      savingReview.current = false;
      setReviewLoading(false);
    }
  };

  const handleOpenReceipt = (tx) => {
    setSelectedTx(tx);
    setReceiptOpen(true);
  };

  const handleCloseReceipt = () => {
    setReceiptOpen(false);
  };


  const handleOpenProfile = () => {
    setProfileDraft({
      name: currentUser.name || '',
      email: currentUser.email || '',
      mobile: currentUser.mobile || '',
      dob: currentUser.dob || '',
      gender: currentUser.gender || '',
      city: currentUser.city || '',
      state: currentUser.state || '',
      preferredLanguage: currentUser.preferredLanguage || '',
      preferredCounselingMode: currentUser.preferredCounselingMode || '',
      counselingRequirements: currentUser.counselingRequirements || '',
    });
    setProfileOpen(true);
  };

  const handleProfileSave = () => {
    const updatedUser = { ...currentUser, ...profileDraft };
    api.setCurrentUser(updatedUser);
    onUserUpdated?.(updatedUser);
    setProfileOpen(false);
  };

  // Calculated metrics
  const activeRequestStatuses = ['submitted', 'assigned', 'accepted', 'rejected', 'discovery_scheduled', 'discovery_completed', 'active'];
  const requestedApts = sessionRequests.filter((request) => activeRequestStatuses.includes(request.status));
  const upcomingApts = appointments.filter(a => sessionStatus(a, now) === 'upcoming');
  const awaitingOutcome = appointments.filter(a => sessionStatus(a, now) === 'awaiting_outcome');
  const feedbackPending = appointments.filter(a => feedbackEligible(a) && !hasFeedback(a));
  const pastApts = appointments.filter(a => [...resolvedStatuses, 'awaiting_outcome', 'cancelled', 'rejected'].includes(sessionStatus(a, now)));
  const profileGroups = [
    {
      title: 'About you',
      fields: [
        ['Date of birth', currentUser.dob],
        ['Gender', currentUser.gender],
        ['Location', [currentUser.city, currentUser.state].filter(Boolean).join(', ')],
      ],
    },
    {
      title: 'Contact details',
      fields: [
        ['Email address', currentUser.email],
        ['Mobile number', currentUser.mobile],
      ],
    },

    {
      title: 'Preferences',
      fields: [
        ['Preferred language', currentUser.preferredLanguage],
        ['Counseling mode', currentUser.preferredCounselingMode],
      ],
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {!currentUser?.approved && (
        <Alert
          severity="warning"
          icon={<HourglassEmptyIcon />}
          sx={{
            mb: 3,
            borderRadius: 3,
            bgcolor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            '& .MuiAlert-icon': { color: '#d97706' },
            p: 2.25
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'Outfit', mb: 0.5, fontSize: '0.98rem' }}>
            Your profile is under review
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.88rem', color: '#78350f' }}>
            Your registration details and case file have been submitted and are currently awaiting administrative review. Access to schedule and book new counseling consultations will be enabled once your account is approved.
          </Typography>
        </Alert>
      )}

      {!currentUser?.approved && (
        <Alert
          severity="warning"
          icon={<HourglassEmptyIcon />}
          sx={{
            mb: 3,
            borderRadius: 3,
            bgcolor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            '& .MuiAlert-icon': { color: '#d97706' },
            p: 2.25
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'Outfit', mb: 0.5, fontSize: '0.98rem' }}>
            Your profile is under review
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.88rem', color: '#78350f' }}>
            Your registration details and case file have been submitted and are currently awaiting administrative review. Access to schedule and book new counseling consultations will be enabled once your account is approved.
          </Typography>
        </Alert>
      )}

      {!!feedbackPending.length && <Alert severity="info" sx={{ mb: 2 }} action={<Button size="small" onClick={() => handleOpenReview(feedbackPending[0])}>Add feedback</Button>}>{feedbackPending.length} completed session{feedbackPending.length === 1 ? '' : 's'} awaiting your feedback.</Alert>}
      {!!awaitingOutcome.length && <Alert severity="info" sx={{ mb: 2 }}>{awaitingOutcome.length} session{awaitingOutcome.length === 1 ? '' : 's'} ended. Your counselor will confirm attendance before feedback becomes available. See Past journey for the status.</Alert>}

      {/* {!!feedbackPending.length && <Alert severity="info" sx={{ mb: 2 }} action={<Button size="small" onClick={() => handleOpenReview(feedbackPending[0])}>Add feedback</Button>}>{feedbackPending.length} completed session{feedbackPending.length === 1 ? '' : 's'} awaiting your feedback.</Alert>}
      {!!awaitingOutcome.length && <Alert severity="info" sx={{ mb: 2 }}>{awaitingOutcome.length} session{awaitingOutcome.length === 1 ? '' : 's'} ended. Your counselor will confirm attendance before feedback becomes available. See Past journey for the status.</Alert>} */}
      <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Grid container>
          <Grid size={{ xs: 12, md: 3 }}>
            <Box sx={{
              height: '100%',
              minHeight: '100%',
              p: { xs: 2.5, md: 3 },
              display: 'grid',
              gridTemplateColumns: { xs: '60px minmax(0, 1fr)', md: 'minmax(0, 1fr)' },
              gridTemplateRows: { xs: 'auto auto', md: 'auto minmax(16px, 1fr) auto' },
              alignItems: { xs: 'center', md: 'flex-start' },
              columnGap: 2,
              rowGap: { xs: 2, md: 0 },
              bgcolor: 'primary.dark',
              color: '#ffffff',
            }}>
              <Avatar src={currentUser.avatar} sx={{ width: 60, height: 60, border: '3px solid rgba(255,255,255,0.65)', gridColumn: 1, gridRow: 1, mb: { md: 2 } }} />
              <Box sx={{ minWidth: 0, gridColumn: { xs: 2, md: 1 }, gridRow: { xs: 1, md: 2 } }}>
                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.74)', fontWeight: 700, lineHeight: 1.5 }}>
                  YOUR PROFILE
                </Typography>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, overflowWrap: 'anywhere' }}>
                  {currentUser.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.75 }}>
                  Your personal details and counseling preferences.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={handleOpenProfile}
                sx={{
                  mt: { md: 'auto' },
                  gridColumn: { xs: '1 / -1', md: 1 },
                  gridRow: { xs: 2, md: 3 },
                  justifySelf: 'start',
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.55)',
                  '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Edit profile
              </Button>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Grid container sx={{ height: '100%' }}>
                {profileGroups.map((group, index) => (
                  <Grid size={{ xs: 12, md: 4 }} key={group.title}>
                    <Box sx={{
                      height: '100%',
                      pt: { xs: index === 0 ? 0 : 2.5, md: 0 },
                      mt: { xs: index === 0 ? 0 : 2.5, md: 0 },
                      pl: { md: index === 0 ? 0 : 2.5 },
                      borderTop: { xs: index === 0 ? 0 : 1, md: 0 },
                      borderLeft: { md: index === 0 ? 0 : 1 },
                      borderColor: 'divider',
                    }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{group.title}</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {group.fields.map(([label, value]) => (
                          <Box key={label}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>{label}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value || 'Not provided'}</Typography>
                          </Box>
                        ))}
                        {group.title === 'Preferences' && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>Counseling requirements</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                              {currentUser.counselingRequirements || 'Not provided'}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Card>



      {/* Dashboard Sections */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs value={activeTab} onChange={(event, value) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label={`Upcoming & active ${requestedApts.length + upcomingApts.length}`} sx={{ fontWeight: 600 }} />
          <Tab label={`Past journey ${pastApts.length}`} sx={{ fontWeight: 600 }} />
          {/* <Tab label="Care plan & notes" sx={{ fontWeight: 600 }} /> */}
          <Tab label="Confirmations" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {appointments.some(apt => apt.status === 'pending_admin') && <Alert severity="info" sx={{ mb: 2 }}>
        {appointments.filter(apt => apt.status === 'pending_admin').length} legacy session proposal(s) are awaiting BJS admin review. They are not confirmed yet.
      </Alert>}
      {activeTab === 0 && (
        <Grid container spacing={2.5} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12 }}>
            <Box id="upcoming-session" sx={{ scrollMarginTop: 96, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Next confirmed session</Typography>
                  <Typography variant="body2" color="text.secondary">Your assigned counselor and session details</Typography>
                </Box>
                <Chip label={`${upcomingApts.length} scheduled`} size="small" color={upcomingApts.length ? 'success' : 'default'} />
              </Box>
              {/* {upcomingApts.length === 0 ? (
                <Paper sx={{ p: { xs: 2.5, md: 3 }, display: 'flex', alignItems: 'center', gap: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ width: 54, height: 54, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark' }}>
                    <CalendarMonthIcon />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>No confirmed sessions yet</Typography>
                    <Typography variant="body2" color="text.secondary">Your next session will appear here with its time and joining details.</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => navigate('/')}>Request a session</Button>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {upcomingApts.map((apt, index) => {
                    const sessionDate = getAppointmentDateParts(apt.date);
                    return (
                      <Grid size={{ xs: 12, lg: 6 }} key={apt.id}>
                        <Card sx={{ height: '100%', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                          <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                              <Box sx={{
                                width: 76,
                                minHeight: 82,
                                flex: '0 0 auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 2,
                                bgcolor: index === 0 ? 'primary.light' : 'action.hover',
                                color: index === 0 ? 'primary.dark' : 'text.primary',
                                px: 1,
                              }}>
                                <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{sessionDate.month}</Typography>
                                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.15 }}>{sessionDate.day}</Typography>
                                <Typography variant="caption" sx={{ textAlign: 'center' }}>{sessionDate.weekday}</Typography>
                              </Box>

                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                                  <Chip label={apt.appointmentKind === 'discovery' ? 'Discovery call' : index === 0 ? 'Next session' : 'Confirmed'} size="small" color={apt.appointmentKind === 'discovery' ? 'info' : index === 0 ? 'success' : 'primary'} />
                                  <Chip label="Assigned by care team" size="small" variant="outlined" />
                                  {apt.appointmentType && <Chip label={apt.appointmentType.replace(' Consultation', '')} size="small" variant="outlined" />}
                                  {apt.isDemo && <Chip label="Sample" size="small" variant="outlined" />}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light', color: 'primary.dark' }}>
                                    {apt.counselorName?.charAt(0) || <SelfImprovementIcon />}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{apt.counselorName}</Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>{apt.counselorSpecialty || 'Counselor'}</Typography>
                                  </Box>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                                  {apt.time || 'Time to be confirmed'}{apt.duration ? ` · ${apt.duration} min` : ''}
                                </Typography>
                              </Box>

                              <Box sx={{ width: { xs: '100%', sm: 190 }, flex: '0 0 auto' }}>
                                {apt.isDemo ? (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: { xs: 'left', sm: 'center' } }}>
                                    Sample appointment · no live link
                                  </Typography>
                                ) : apt.appointmentType === 'In-Person Consultation' ? (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">MEETING LOCATION</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>HO</Typography>
                                  </Box>
                                ) : (
                                  <AttendSessionButton variant="contained" fullWidth startIcon={<VideoCallIcon />} appointment={apt} />
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )} */}

              {upcomingApts.length === 0 ? (
                <Paper
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      flex: '0 0 auto',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2,
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                    }}
                  >
                    <CalendarMonthIcon />
                  </Box>

                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      No confirmed sessions yet
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Your next session will appear here with its time and joining details.
                    </Typography>
                  </Box>

                  {/* <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/')}
                  >
                    Request a session
                  </Button> */}
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {upcomingApts.map((apt, index) => {
                    const sessionDate = getAppointmentDateParts(apt.date);

                    const isDiscovery = apt.appointmentKind === 'discovery';
                    const isOnline = apt.appointmentType !== 'In-Person Consultation';

                    const sessionLabel = isDiscovery
                      ? 'Discovery call'
                      : index === 0
                        ? 'Next session'
                        : 'Confirmed';

                    return (
                      <Card
                        key={apt.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <CardContent
                          sx={{
                            p: { xs: 2, md: 2.25 },
                            '&:last-child': {
                              pb: { xs: 2, md: 2.25 },
                            },
                          }}
                        >
                          {/* TOP ROW */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              mb: 1.5,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{
                                flexWrap: 'wrap',
                                rowGap: 0.75,
                              }}
                            >
                              <Chip
                                label={sessionLabel}
                                size="small"
                                color={isDiscovery ? 'info' : 'success'}
                              />

                              <Chip
                                label="Assigned by care team"
                                size="small"
                                variant="outlined"
                              />

                              <Chip
                                label={isOnline ? 'Online' : 'Offline'}
                                size="small"
                                sx={{
                                  bgcolor: isOnline
                                    ? 'primary.50'
                                    : 'action.hover',
                                  color: isOnline
                                    ? 'primary.main'
                                    : 'text.secondary',
                                  border: 'none',
                                }}
                              />
                            </Stack>
                          </Box>

                          {/* MAIN CONTENT */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              flexWrap: { xs: 'wrap', md: 'nowrap' },
                            }}
                          >
                            {/* DATE */}
                            <Box
                              sx={{
                                width: 58,
                                height: 74,
                                flex: '0 0 auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 2,
                                bgcolor: index === 0
                                  ? 'primary.light'
                                  : 'action.hover',
                                color: index === 0
                                  ? 'primary.dark'
                                  : 'text.primary',
                              }}
                            >
                              <Typography
                                variant="overline"
                                sx={{
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {sessionDate.month}
                              </Typography>

                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 800,
                                  lineHeight: 1.2,
                                }}
                              >
                                {sessionDate.day}
                              </Typography>

                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 500,
                                  lineHeight: 1,
                                }}
                              >
                                {sessionDate.weekday}
                              </Typography>
                            </Box>

                            {/* COUNSELLOR + SESSION INFO */}
                            <Box
                              sx={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.25,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: 'primary.light',
                                    color: 'primary.dark',
                                  }}
                                >
                                  {apt.counselorName?.charAt(0) || (
                                    <SelfImprovementIcon />
                                  )}
                                </Avatar>

                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 700,
                                      lineHeight: 1.3,
                                    }}
                                    noWrap
                                  >
                                    {apt.counselorName || 'Counsellor'}
                                  </Typography>

                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                  >
                                    {apt.counselorSpecialty || 'Counselling Specialist'}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* TIME + MODE */}
                              <Stack
                                direction="row"
                                spacing={1.25}
                                sx={{
                                  alignItems: 'center',
                                  mt: 1.25,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                  }}
                                >
                                  <AccessTimeIcon
                                    sx={{
                                      fontSize: 17,
                                      color: 'primary.main',
                                    }}
                                  />

                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {apt.time || 'Time to be confirmed'}
                                  </Typography>
                                </Box>

                                {apt.duration && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    • {apt.duration} min
                                  </Typography>
                                )}

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  • {isOnline ? 'Telehealth' : 'In-person'}
                                </Typography>
                              </Stack>

                              {/* AGENDA */}
                              {apt.agenda && (
                                <Box
                                  sx={{
                                    mt: 1.25,
                                    px: 1.25,
                                    py: 0.75,
                                    bgcolor: 'action.hover',
                                    borderRadius: 1.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    <Box
                                      component="span"
                                      sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                      }}
                                    >
                                      Agenda:
                                    </Box>{' '}
                                    {apt.agenda}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* ACTIONS */}
                            <Box
                              sx={{
                                width: { xs: '100%', md: 190 },
                                flex: '0 0 auto',
                                display: 'flex',
                                gap: 1,
                                flexDirection: { xs: 'row', md: 'column' },
                              }}
                            >
                              <AttendSessionButton appointment={apt} variant="contained" fullWidth />
                              <Button variant="outlined" fullWidth startIcon={<DescriptionOutlinedIcon />} onClick={() => navigate('/session/' + apt.id)}>Session details</Button>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}

            </Box>

            <Box id="pending-requests" sx={{ scrollMarginTop: 96 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon fontSize="small" color="warning" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Pending session requests</Typography>
                </Box>
                <Chip label={`${requestedApts.length} waiting`} size="small" color={requestedApts.length ? 'warning' : 'default'} />
              </Box>
              {requestedApts.length === 0 ? (
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, border: 1, borderColor: 'divider' }}>
                  <CheckCircleIcon color="success" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>No requests waiting for review</Typography>
                    <Typography variant="body2" color="text.secondary">Registration requests are sent to the admin team for approval. A counselor is assigned after the discovery conversation.</Typography>
                  </Box>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {requestedApts.map((careRequest) => {
                    const requestDate = getAppointmentDateParts(careRequest.preferredDate);
                    const requestStage = {
                      submitted: 0,
                      assigned: 2,
                      rejected: 1,
                      accepted: 3,
                      discovery_scheduled: 3,
                      discovery_completed: 4,
                      active: 4,
                    }[careRequest.status] ?? 0;
                    const requestStatusLabel = {
                      submitted: 'Submitted',
                      assigned: 'Waiting for admin review',
                      rejected: 'Registration rejected',
                      accepted: 'Registration approved · discovery conversation can happen anytime',
                      discovery_scheduled: 'Discovery scheduled',
                      discovery_completed: 'Ready to plan sessions',
                      active: 'Care plan active',
                    }[careRequest.status] || 'In progress';
                    return (
                      <Paper key={careRequest.id} sx={{ p: { xs: 2, sm: 2.5 }, border: 1, borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: careRequest.status === 'rejected' ? 'error.main' : 'warning.main', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <Box sx={{
                              width: 48,
                              height: 52,
                              flex: '0 0 auto',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 1.5,
                              bgcolor: 'warning.light',
                              color: 'warning.dark',
                            }}>
                              <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1 }}>{requestDate.month}</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25 }}>{requestDate.day}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                                {careRequest.status === 'rejected'
                                  ? 'Registration was rejected — contact the BJS care team'
                                  : careRequest.finalCounselorName
                                    ? `Ongoing counselor: ${careRequest.finalCounselorName}`
                                    : careRequest.assignedCounselorName
                                      ? `Discovery counselor: ${careRequest.assignedCounselorName}`
                                      : 'Counselor assignment pending'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>{careRequest.preferredFormat}</Typography>
                              <Typography variant="caption" color="text.secondary">Preferred: {requestDate.weekday} · {careRequest.preferredTime}</Typography>
                            </Box>
                          </Box>
                          <Chip label={requestStatusLabel} size="small" color={careRequest.status === 'rejected' ? 'error' : 'warning'} />
                        </Box>
                        {careRequest.rejectedReason && (
                          <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>{careRequest.rejectedReason}</Alert>
                        )}
                        <Stepper
                          activeStep={requestStage}
                          alternativeLabel
                          sx={{
                            pt: 2.5,
                            '& .MuiStepLabel-label': { fontSize: '0.7rem', mt: 0.5 },
                            '& .MuiStepIcon-root.Mui-active': { color: 'warning.main' },
                            '& .MuiStepIcon-root.Mui-completed': { color: 'success.main' },
                          }}
                        >
                          {['Request', 'Assignment', 'Counselor review', 'Discovery call', 'Care plan'].map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                          ))}
                        </Stepper>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Grid>


        </Grid>
      )}

      {activeTab === 1 && (
        <Box id="past-journey" sx={{ scrollMarginTop: 96 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent session history</Typography>
            <Typography variant="body2" color="text.secondary">Your completed, cancelled and rejected sessions</Typography>
          </Box>
          {pastApts.length === 0 ? (
            <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, border: 1, borderColor: 'divider' }}>
              <ReceiptLongIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Your journey starts here</Typography>
                <Typography variant="body2" color="text.secondary">Completed sessions and reflections will appear here.</Typography>
              </Box>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {pastApts.map((apt) => (
                <Grid size={{ xs: 12, md: 6 }} key={apt.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{apt.counselorName}</Typography>
                          <Typography variant="body2" color="text.secondary">{apt.counselorSpecialty}</Typography>
                        </Box>
                        <Chip label={statusLabel(sessionStatus(apt, now))} color={apt.status === 'completed' ? 'success' : 'warning'} variant="outlined" size="small" />
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{apt.date} · {apt.time}</Typography>
                        {feedbackEligible(apt) && (hasFeedback(apt) ? (
                          <Box sx={{ width: '100%' }}><Typography variant="caption" color="text.secondary">Your feedback · {new Date(apt.review.date).toLocaleDateString('en-IN')}</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{apt.review.reviewText || 'No written feedback was provided.'}</Typography></Box>
                        ) : <Button variant="outlined" size="small" startIcon={<RateReviewIcon />} onClick={() => handleOpenReview(apt)}>Share feedback</Button>)}
                      </Box>
                      <ReschedulePanel appointment={apt} currentUser={currentUser} onUpdated={result => setAppointments(previous => mergeRescheduleResult(previous, result))} />
                      <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/session/' + apt.id)}>Session details</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SelfImprovementIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Your current focus</Typography>
                </Box>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2.5 }}>
                  {currentUser.counselingRequirements || 'Add a focus or goal to help your counselor prepare for your sessions.'}
                </Typography>
                <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={handleOpenProfile}>Update care preferences</Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Your preferences</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box><Typography variant="caption" color="text.secondary">SESSION FORMAT</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{currentUser.preferredCounselingMode || 'Not selected'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">PREFERRED LANGUAGE</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{currentUser.preferredLanguage || 'Not selected'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">SESSIONS COMPLETED</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{appointments.filter((apt) => apt.status === 'completed').length}</Typography></Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Box id="booking-confirmations" sx={{ scrollMarginTop: 96 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Booking confirmations</Typography>
          {transactions.length === 0 ? (
            <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, border: 1, borderColor: 'divider' }}>
              <ReceiptLongIcon color="primary" />
              <Typography variant="body2" color="text.secondary">Your booking confirmations will appear here.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Booking reference</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Counselor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Booking date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Verification details</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{tx.id}</TableCell>
                      <TableCell>{tx.counselorName}</TableCell>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell>{tx.paymentMethod}</TableCell>
                      <TableCell><Chip label={tx.status} color="success" size="small" /></TableCell>
                      <TableCell align="right"><Button variant="text" size="small" onClick={() => handleOpenReceipt(tx)}>View confirmation</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* WRITE A REVIEW DIALOG */}
      <Dialog open={reviewOpen} onClose={handleCloseReview} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Share session feedback
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tell us about your session with <strong>{selectedApt?.counselorName}</strong>. Only you and the admin care team can read your feedback.
          </Typography>

          <TextField
            required
            label="Session feedback"
            helperText="Up to 2,000 characters."
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            multiline
            rows={3}
            fullWidth
            placeholder="Type your feedback here..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReview} disabled={reviewLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReviewSubmit}
            disabled={reviewLoading || !reviewText.trim() || reviewText.length > 2000}
          >
            {reviewLoading ? <CircularProgress size={24} /> : 'Submit feedback'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Edit profile details</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {[
              ['name', 'Full name'],
              ['email', 'Email address'],
              ['mobile', 'Mobile number'],
              ['dob', 'Date of birth'],
              ['gender', 'Gender'],
              ['city', 'City'],
              ['state', 'State'],
              ['preferredLanguage', 'Preferred language'],
              ['preferredCounselingMode', 'Preferred counseling mode'],
            ].map(([field, label]) => (
              <Grid size={{ xs: 12, sm: 6 }} key={field}>
                <TextField
                  fullWidth
                  label={label}
                  type={field === 'dob' ? 'date' : 'text'}
                  value={profileDraft[field] || ''}
                  onChange={(event) => setProfileDraft(prev => ({ ...prev, [field]: event.target.value }))}
                  slotProps={field === 'dob' ? { inputLabel: { shrink: true } } : undefined}
                />
              </Grid>
            ))}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Counseling requirements"
                value={profileDraft.counselingRequirements || ''}
                onChange={(event) => setProfileDraft(prev => ({ ...prev, counselingRequirements: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setProfileOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProfileSave}>Save profile</Button>
        </DialogActions>
      </Dialog>

      {/* RECEIPT VIEW MODAL */}
      <Dialog open={receiptOpen} onClose={handleCloseReceipt} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'success.light', color: 'success.dark', width: 60, height: 60 }}>
              <ReceiptLongIcon sx={{ fontSize: 32 }} />
            </Avatar>
          </Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 0.5 }}>
            Booking Confirmation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            MINDEASE IN-HOUSE NGO SCHEDULING SYSTEM
          </Typography>

          <Divider sx={{ my: 3 }} />

          {selectedTx && (
            <Box sx={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Booking ID:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'mono' }}>{selectedTx.id}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Booking Date:</Typography>
                <Typography variant="body2">{new Date(selectedTx.date).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Member Name:</Typography>
                <Typography variant="body2">{currentUser.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Therapist Provider:</Typography>
                <Typography variant="body2">{selectedTx.counselorName}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Verification Details:</Typography>
                <Typography variant="body2">{selectedTx.paymentMethod}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2">Service Fee:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>Free (NGO Service)</Typography>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Button variant="contained" fullWidth onClick={handleCloseReceipt}>
            Close Confirmation
          </Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
