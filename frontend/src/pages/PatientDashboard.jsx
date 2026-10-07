import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Rating, TextField,
  Chip, CircularProgress, Alert, Divider, Avatar, Step, StepLabel, Stepper
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import RateReviewIcon from '@mui/icons-material/RateReview';
import StarIcon from '@mui/icons-material/Star';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
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

const createDemoAppointments = () => {
  const dateInDays = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return [
    {
      id: 'demo-session-next',
      status: 'upcoming',
      counselorName: 'Dr. Ananya Sen',
      counselorSpecialty: 'CBT Specialist',
      date: dateInDays(3),
      time: '4:00 PM',
      duration: 50,
      appointmentType: 'Online Consultation',
      isDemo: true,
    },
    {
      id: 'demo-session-following',
      status: 'upcoming',
      counselorName: 'Dr. Sameer Joshi',
      counselorSpecialty: 'Clinical Psychologist',
      date: dateInDays(8),
      time: '11:00 AM',
      duration: 50,
      appointmentType: 'In-Person Consultation',
      clinicAddress: 'Counselling Program Wellness Center, Pune',
      isDemo: true,
    },
  ];
};

const createDemoSessionRequests = () => {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  return [{
    id: 'demo-request-pending',
    status: 'submitted',
    patientName: 'You',
    preferredDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    preferredTime: 'Afternoon',
    preferredFormat: 'Online Consultation',
    intakeNotes: 'Support with stress and sleep.',
    assignedCounselorName: '',
    rejectedReason: '',
    isDemo: true,
  }];
};

export default function PatientDashboard({ currentUser, onUserUpdated }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [sessionRequests, setSessionRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab control
  const [activeTab, setActiveTab] = useState(0);

  // Review Dialog State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

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
    setRating(5);
    setReviewText('');
    setReviewError('');
    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    setReviewOpen(false);
  };

  const handleReviewSubmit = async () => {
    if (!reviewText) {
      setReviewError('Please write a short comment about your experience.');
      return;
    }

    try {
      setReviewLoading(true);
      setReviewError('');
      await api.submitReview(selectedApt.id, rating, reviewText);

      // Reload dashboard appointments
      const updated = await api.getAppointments();
      setAppointments(updated);

      setReviewOpen(false);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
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
  const upcomingApts = appointments.filter(a => a.status === 'upcoming');
  const pastApts = appointments.filter(a => ['completed', 'cancelled', 'rejected'].includes(a.status));
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
          <Tab label="Care plan & notes" sx={{ fontWeight: 600 }} />
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
              {upcomingApts.length === 0 ? (
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
                        <Chip label={apt.status} color={apt.status === 'completed' ? 'success' : 'error'} variant="outlined" size="small" />
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{apt.date} · {apt.time}</Typography>
                        {apt.status === 'completed' && apt.appointmentKind !== 'discovery' && (apt.review ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{apt.review.rating}/5</Typography>
                          </Box>
                        ) : (
                          <Button variant="outlined" size="small" startIcon={<RateReviewIcon />} onClick={() => handleOpenReview(apt)}>Share feedback</Button>
                        ))}
                      </Box>
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
          Write Session Review
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your feedback helps our community. Rate your therapy experience with <strong>{selectedApt?.counselorName}</strong>.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, my: 2 }}>
            <Typography variant="subtitle2">Rating</Typography>
            <Rating
              value={rating}
              onChange={(e, val) => setRating(val || 5)}
              size="large"
            />
          </Box>

          <TextField
            label="Review Comments"
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
            disabled={reviewLoading}
          >
            {reviewLoading ? <CircularProgress size={24} /> : 'Submit Review'}
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
