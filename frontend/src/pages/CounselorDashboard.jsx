import CareWorkflow from '../components/CareWorkflow';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
  CircularProgress, Alert, Divider, FormControlLabel,
  Select, MenuItem, InputLabel, FormControl, Avatar, Switch, IconButton, Snackbar
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DateRangeIcon from '@mui/icons-material/DateRange';
import StarRateIcon from '@mui/icons-material/StarRate';
import SettingsIcon from '@mui/icons-material/Settings';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { api } from '../api';

const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7; // 7 AM to 9 PM
  return `${String(h).padStart(2, '0')}:00`;
});

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];


export default function CounselorDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [careRequests, setCareRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tabs Control
  const [activeTab, setActiveTab] = useState(0);
  const [requestTab, setRequestTab] = useState(0);
  

  // Availability form state
  const [, setWorkingDays] = useState([]);
  const [, setStartHour] = useState('09:00');
  const [, setEndHour] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(60);
  const [daysConfig, setDaysConfig] = useState([
    { dayIndex: 0, active: false, slots: [] },
    { dayIndex: 1, active: true, slots: [{ startHour: '09:00', endHour: '17:00' }] },
    { dayIndex: 2, active: true, slots: [{ startHour: '09:00', endHour: '17:00' }] },
    { dayIndex: 3, active: true, slots: [{ startHour: '09:00', endHour: '17:00' }] },
    { dayIndex: 4, active: true, slots: [{ startHour: '09:00', endHour: '17:00' }] },
    { dayIndex: 5, active: true, slots: [{ startHour: '09:00', endHour: '17:00' }] },
    { dayIndex: 6, active: false, slots: [] }
  ]);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');

  // Snackbar Alert state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Clinical Notes Dialog State
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const fetchCounselorData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setConfigError('');

      // Fetch appointments
      const [apts, requests] = await Promise.all([
        api.getAppointments(),
        api.getSessionRequests(),
      ]);
      setAppointments(apts);
      setCareRequests(requests);

      // Fetch availability configurations
      const avail = await api.getCounselorAvailability(currentUser.id);
      setWorkingDays(avail.workingDays || [1, 2, 3, 4, 5]);
      setStartHour(avail.startHour || '09:00');
      setEndHour(avail.endHour || '17:00');
      setSlotDuration(avail.slotDuration || 60);

      // Load daysConfig with fallback
      const dbDaysConfig = avail.daysConfig || [];
      const loadedDaysConfig = DAYS.map(day => {
        const existing = dbDaysConfig.find(d => d.dayIndex === day.value);
        if (existing) {
          return {
            dayIndex: day.value,
            active: existing.active,
            slots: existing.slots && existing.slots.length > 0 ? existing.slots : [{ startHour: '09:00', endHour: '17:00' }]
          };
        } else {
          const isWorking = (avail.workingDays || [1, 2, 3, 4, 5]).includes(day.value);
          return {
            dayIndex: day.value,
            active: isWorking,
            slots: isWorking
              ? [{ startHour: avail.startHour || '09:00', endHour: avail.endHour || '17:00' }]
              : [{ startHour: '09:00', endHour: '17:00' }]
          };
        }
      });
      setDaysConfig(loadedDaysConfig);

    } catch (err) {
      setError(err.message || 'Failed to load counselor dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (currentUser) {
      Promise.resolve().then(() => {
        fetchCounselorData();
      });
    }
  }, [currentUser, fetchCounselorData]);

  useEffect(() => {
    let active = true;
    const refreshRequests = async () => {
      try {
        const requests = await api.getSessionRequests();
        if (active) setCareRequests(requests);
      } catch (err) {
        if (active) setError(err.message || 'Failed to refresh review requests.');
      }
    };
    const interval = setInterval(refreshRequests, 10000);
    window.addEventListener('focus', refreshRequests);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', refreshRequests);
    };
  }, [currentUser.id]);

  // Handlers for dynamic daily slots
  const handleDayActiveToggle = (dayIndex) => {
    setDaysConfig(prev => prev.map(d => {
      if (d.dayIndex === dayIndex) {
        const nextActive = !d.active;
        const slots = d.slots && d.slots.length > 0 ? d.slots : [{ startHour: '09:00', endHour: '17:00' }];
        return { ...d, active: nextActive, slots };
      }
      return d;
    }));
  };

  const handleAddSlot = (dayIndex) => {
    setDaysConfig(prev => prev.map(d => {
      if (d.dayIndex === dayIndex) {
        let nextStart = '09:00';
        let nextEnd = '17:00';
        if (d.slots && d.slots.length > 0) {
          const lastSlot = d.slots[d.slots.length - 1];
          const [h] = lastSlot.endHour.split(':').map(Number);
          const nextH = Math.min(h + 1, 21);
          const endH = Math.min(nextH + 3, 21);
          nextStart = `${String(nextH).padStart(2, '0')}:00`;
          nextEnd = `${String(endH).padStart(2, '0')}:00`;
        }
        return {
          ...d,
          slots: [...d.slots, { startHour: nextStart, endHour: nextEnd }]
        };
      }
      return d;
    }));
  };

  const handleRemoveSlot = (dayIndex, slotIndex) => {
    setDaysConfig(prev => prev.map(d => {
      if (d.dayIndex === dayIndex) {
        const filteredSlots = d.slots.filter((_, idx) => idx !== slotIndex);
        return {
          ...d,
          slots: filteredSlots
        };
      }
      return d;
    }));
  };

  const handleSlotTimeChange = (dayIndex, slotIndex, field, value) => {
    setDaysConfig(prev => prev.map(d => {
      if (d.dayIndex === dayIndex) {
        const updatedSlots = d.slots.map((s, idx) => {
          if (idx === slotIndex) {
            return { ...s, [field]: value };
          }
          return s;
        });
        return { ...d, slots: updatedSlots };
      }
      return d;
    }));
  };

  // Handle availability update
  const handleSaveAvailability = async () => {
    const activeDays = daysConfig.filter(d => d.active);
    if (activeDays.length === 0) {
      setConfigError('Please activate at least one working day.');
      return;
    }

    // Validation checks for slots
    for (const day of activeDays) {
      const dayLabel = DAYS.find(d => d.value === day.dayIndex)?.label;
      if (!day.slots || day.slots.length === 0) {
        setConfigError(`Please add at least one time slot for ${dayLabel}.`);
        return;
      }

      // Check start/end hours and overlap
      const sortedSlots = [...day.slots].sort((a, b) => a.startHour.localeCompare(b.startHour));
      for (let i = 0; i < sortedSlots.length; i++) {
        const slot = sortedSlots[i];
        if (slot.startHour >= slot.endHour) {
          setConfigError(`In ${dayLabel}, start hour (${slot.startHour}) must be before end hour (${slot.endHour}).`);
          return;
        }
        if (i > 0) {
          const prevSlot = sortedSlots[i - 1];
          if (slot.startHour < prevSlot.endHour) {
            setConfigError(`In ${dayLabel}, time slots overlap: [${prevSlot.startHour} - ${prevSlot.endHour}] and [${slot.startHour} - ${slot.endHour}].`);
            return;
          }
        }
      }
    }

    try {
      setConfigSaving(true);
      setConfigError('');
      setConfigSuccess('');

      // Calculate workingDays from daysConfig for backward compatibility
      const computedWorkingDays = daysConfig.filter(d => d.active).map(d => d.dayIndex);

      // Compute startHour and endHour as the min/max across all active days' slots for backward compatibility
      let minStart = '09:00';
      let maxEnd = '17:00';
      const allActiveSlots = daysConfig.filter(d => d.active).flatMap(d => d.slots);
      if (allActiveSlots.length > 0) {
        let first = true;
        allActiveSlots.forEach(s => {
          if (first) {
            minStart = s.startHour;
            maxEnd = s.endHour;
            first = false;
          } else {
            if (s.startHour < minStart) minStart = s.startHour;
            if (s.endHour > maxEnd) maxEnd = s.endHour;
          }
        });
      }

      await api.updateCounselorAvailability({
        workingDays: computedWorkingDays,
        startHour: minStart,
        endHour: maxEnd,
        slotDuration,
        daysConfig
      });

      // Update local state
      setWorkingDays(computedWorkingDays);
      setStartHour(minStart);
      setEndHour(maxEnd);

      setConfigSuccess('Availability settings saved successfully!');
      setTimeout(() => setConfigSuccess(''), 4000);
    } catch (err) {
      setConfigError(err.message || 'Failed to update availability.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Open clinical notes dialog
  const handleOpenNotes = (apt) => {
    setSelectedApt(apt);
    setSessionNotes(apt.sessionNotes || '');
    setNotesOpen(true);
  };

  // Save clinical notes
  const handleSaveNotes = async () => {
    try {
      setNotesSaving(true);
      await api.updateAppointment(selectedApt.id, { sessionNotes });

      // Update appointments list local state
      setAppointments((prev) =>
        prev.map((a) => a.id === selectedApt.id ? { ...a, sessionNotes } : a)
      );

      setNotesOpen(false);
    } catch (err) {
      setSnackbarMsg(err.message || 'Failed to save notes.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      await api.updateAppointment(aptId, { status: newStatus });
      // Update local state
      setAppointments((prev) =>
        prev.map((a) => a.id === aptId ? { ...a, status: newStatus } : a)
      );
      const updatedAppointment = appointments.find((appointment) => appointment.id === aptId);
      if (newStatus === 'completed' && updatedAppointment?.appointmentKind === 'discovery') {
        setCareRequests(await api.getSessionRequests());
      }
    } catch (err) {
      setSnackbarMsg(err.message || 'Failed to update session status.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Calculations
  const upcomingSessions = appointments.filter(a => a.status === 'upcoming');
  const pastSessions = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');
  const pendingReviewRequests = careRequests.filter((request) => request.finalCounselorId === currentUser.id && ['matched', 'active'].includes(request.status));
  const approvedRequests = pendingReviewRequests;
  const declinedRequests = careRequests.filter((request) => request.finalCounselorId === currentUser.id && request.status === 'closed');
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Sleek Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 50%, rgba(255,255,255,0.8) 100%)',
          border: '1px solid',
          borderColor: 'rgba(99,102,241,0.15)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={currentUser.avatar}
              sx={{
                width: { xs: 54, sm: 64 },
                height: { xs: 54, sm: 64 },
                border: '2.5px solid #6366f1',
                boxShadow: '0 4px 14px rgba(99,102,241,0.25)'
              }}
            />
            <Box sx={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 13,
              height: 13,
              bgcolor: '#10b981',
              border: '2px solid #ffffff',
              borderRadius: '50%'
            }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '-0.3px' }}>
                {currentUser.name}
              </Typography>
              <Chip
                size="small"
                label="Counselor"
                icon={<PsychologyIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  bgcolor: 'rgba(99,102,241,0.12)',
                  color: '#4f46e5',
                  border: '1px solid rgba(99,102,241,0.25)',
                  height: 24
                }}
              />
              {currentUser.specialty && (
                <Chip
                  size="small"
                  label={currentUser.specialty}
                  variant="outlined"
                  sx={{ fontSize: '0.72rem', fontWeight: 600, height: 24 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Set availability hours, manage patient consultations, and review clinical intake cases.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
          <Chip
            size="small"
            label={new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            icon={<DateRangeIcon sx={{ fontSize: '14px !important' }} />}
            sx={{ fontWeight: 600, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
          />
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

      {/* Metrics Section */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 18px rgba(49,46,129,0.25)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2.5, display: 'flex' }}>
                <PointOfSaleIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Completed Sessions
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.1 }}>
                  {appointments.filter(a => a.status === 'completed').length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 18px rgba(5,150,105,0.25)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2.5, display: 'flex' }}>
                <DateRangeIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Scheduled Patients
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.1 }}>
                  {upcomingSessions.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 18px rgba(217,119,6,0.25)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2.5, display: 'flex' }}>
                <AssignmentIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Assigned Care Cases
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.1 }}>
                  {pendingReviewRequests.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Layout */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'none',
              minHeight: 44,
              px: 2.5
            }
          }}
        >
          <Tab label="User workspace" />
          <Tab label="Set Availability" />
        </Tabs>
      </Box>

      {/* TAB 0: APPOINTMENTS LOG */}
      {activeTab === 0 && (
        <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
              <CardContent>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>COUNSELOR WORKSPACE</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>User management</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Button fullWidth variant={requestTab === 0 ? 'contained' : 'text'} sx={{ justifyContent: 'space-between' }} onClick={() => { setRequestTab(0); document.getElementById('care-requests')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    Assigned cases <Chip size="small" label={pendingReviewRequests.length} />
                  </Button>
                  <Button fullWidth variant={requestTab === 1 ? 'contained' : 'text'} sx={{ justifyContent: 'space-between' }} onClick={() => { setRequestTab(1); document.getElementById('care-requests')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    Active care <Chip size="small" label={approvedRequests.length} />
                  </Button>
                  <Button fullWidth variant={requestTab === 2 ? 'contained' : 'text'} sx={{ justifyContent: 'space-between' }} onClick={() => { setRequestTab(2); document.getElementById('care-requests')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    Closed cases <Chip size="small" label={declinedRequests.length} />
                  </Button>
                  <Divider sx={{ my: 1 }} />
                  <Button fullWidth variant="text" sx={{ justifyContent: 'flex-start' }} onClick={() => document.getElementById('upcoming-sessions')?.scrollIntoView({ behavior: 'smooth' })}>
                    Upcoming sessions
                  </Button>
                  <Button fullWidth variant="text" sx={{ justifyContent: 'flex-start' }} onClick={() => document.getElementById('past-consultations')?.scrollIntoView({ behavior: 'smooth' })}>
                    Past consultations
                  </Button>
                  <Button fullWidth variant="text" startIcon={<SettingsIcon />} sx={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab(1)}>
                    Availability
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 9 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Box id="care-requests" sx={{ scrollMarginTop: 96 }}>
                <CareWorkflow currentUser={currentUser} filter={requestTab} onAppointmentsChange={setAppointments} onRequestsChange={setCareRequests} />
              </Box>

              {/* Upcoming Appointments */}
              <Box id="upcoming-sessions" sx={{ scrollMarginTop: 96 }}>
                <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
                  Upcoming Sessions
                </Typography>
                {upcomingSessions.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No upcoming appointments scheduled at this moment.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {upcomingSessions.map((apt) => (
                      <Grid item xs={12} md={6} key={apt.id}>
                        <Card sx={{ borderLeft: '6px solid #10b981' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>{apt.patientName}</Typography>
                              <Chip label="Upcoming" color="success" size="small" />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Schedule: <strong>{apt.date}</strong> at <strong>{apt.time}</strong> (60m)
                            </Typography>

                            <Typography variant="body2" sx={{
                              mb: 2,
                              p: 1.5,
                              bgcolor: 'action.hover',
                              borderRadius: 2,
                              fontStyle: apt.intakeNotes ? 'normal' : 'italic'
                            }}>
                              <strong>Patient Intake notes:</strong> {apt.intakeNotes || 'None provided.'}
                            </Typography>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', width: '100%' }}>
                              {apt.appointmentType === 'In-Person Consultation' ? (
                                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider', width: '100%', mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>
                                    OFFLINE / IN-PERSON MEETING
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                                    Address: {apt.clinicAddress || 'Location to be confirmed by the BJS care team'}
                                  </Typography>
                                </Box>
                              ) : (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<VideoCallIcon />}
                                  onClick={() => navigate(`/session/${apt.id}`)}
                                  sx={{ mb: 1 }}
                                >
                                  Join Room
                                </Button>
                              )}
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AssignmentIcon />}
                                  onClick={() => handleOpenNotes(apt)}
                                  sx={{ flexGrow: 1 }}
                                >
                                  Clinical Notes
                                </Button>
                                <Button
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>

              {/* Past Appointments History */}
              <Box id="past-consultations" sx={{ scrollMarginTop: 96 }}>
                <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
                  Historical Consultations
                </Typography>
                {pastSessions.length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No past consultations recorded.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Consultation Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Notes & Reviews</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pastSessions.map((apt) => (
                          <TableRow key={apt.id}>
                            <TableCell sx={{ fontWeight: 600 }}>{apt.patientName}</TableCell>
                            <TableCell>
                              <Typography variant="body2">{apt.date}</Typography>
                              <Typography variant="caption" color="text.secondary">{apt.time}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={apt.status}
                                color={apt.status === 'completed' ? 'success' : 'error'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                <Button size="small" variant="text" onClick={() => handleOpenNotes(apt)}>
                                  View Clinical Note
                                </Button>
                                {apt.review && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <StarRateIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                      Patient rated {apt.review.rating}/5
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: SET AVAILABILITY */}
      {activeTab === 1 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon color="primary" /> Availability Settings
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 700 }}>1. Daily Working Schedule & Slots</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
                {daysConfig.map((day) => {
                  const dayLabel = DAYS.find(d => d.value === day.dayIndex)?.label;
                  return (
                    <Paper
                      key={day.dayIndex}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        borderColor: day.active ? 'primary.light' : 'divider',
                        bgcolor: day.active ? 'rgba(99, 102, 241, 0.02)' : 'action.hover',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: day.active ? 2 : 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 100 }}>
                            {dayLabel}
                          </Typography>
                          <Chip
                            label={day.active ? 'Active' : 'Closed'}
                            color={day.active ? 'primary' : 'default'}
                            size="small"
                            variant={day.active ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={day.active}
                              onChange={() => handleDayActiveToggle(day.dayIndex)}
                              color="primary"
                            />
                          }
                          label={day.active ? 'Available' : 'Unavailable'}
                          labelPlacement="start"
                          sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 600, mr: 1, color: 'text.secondary' } }}
                        />
                      </Box>

                      {day.active && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {day.slots && day.slots.map((slot, slotIdx) => (
                            <Box
                              key={slotIdx}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                flexWrap: 'wrap',
                                p: 1.5,
                                bgcolor: 'background.paper',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            >
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Slot {slotIdx + 1}:
                              </Typography>

                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Start Time</InputLabel>
                                <Select
                                  value={slot.startHour}
                                  label="Start Time"
                                  onChange={(e) => handleSlotTimeChange(day.dayIndex, slotIdx, 'startHour', e.target.value)}
                                >
                                  {HOURS.map((hr) => (
                                    <MenuItem key={hr} value={hr}>{hr}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                to
                              </Typography>

                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>End Time</InputLabel>
                                <Select
                                  value={slot.endHour}
                                  label="End Time"
                                  onChange={(e) => handleSlotTimeChange(day.dayIndex, slotIdx, 'endHour', e.target.value)}
                                >
                                  {HOURS.map((hr) => (
                                    <MenuItem key={hr} value={hr}>{hr}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <IconButton
                                color="error"
                                onClick={() => handleRemoveSlot(day.dayIndex, slotIdx)}
                                sx={{ ml: 'auto' }}
                                disabled={day.slots.length <= 1}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}

                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddSlot(day.dayIndex)}
                            sx={{ alignSelf: 'flex-start', borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                          >
                            Add Split Shift Interval
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>2. Session Time Duration Slot</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                <InputLabel>Select Slot Interval</InputLabel>
                <Select
                  value={slotDuration}
                  label="Select Slot Interval"
                  onChange={(e) => setSlotDuration(e.target.value)}
                >
                  <MenuItem value={30}>30 Minutes Slot</MenuItem>
                  <MenuItem value={45}>45 Minutes Slot</MenuItem>
                  <MenuItem value={60}>60 Minutes Slot</MenuItem>
                </Select>
              </FormControl>

              {configError && <Alert severity="error" sx={{ mb: 2 }}>{configError}</Alert>}
              {configSuccess && <Alert severity="success" sx={{ mb: 2 }}>{configSuccess}</Alert>}

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAvailability}
                disabled={configSaving}
                fullWidth
              >
                {configSaving ? 'Saving Changes...' : 'Save Availability Config'}
              </Button>
            </Card>
          </Grid>

        </Grid>
      )}

      {/* CLINICAL SESSION NOTES MODAL */}
      <Dialog open={notesOpen} onClose={() => setNotesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Clinical Session & Intake Notes
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Patient Name:</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>{selectedApt?.patientName}</Typography>

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Patient Intake Details:</Typography>
          <Typography variant="body2" sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            {selectedApt?.intakeNotes || 'No intake descriptions provided.'}
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Clinical Progress Log:</Typography>
          {selectedApt?.status === 'completed' || selectedApt?.status === 'upcoming' ? (
            <TextField
              multiline
              rows={5}
              fullWidth
              disabled={currentUser.id !== selectedApt?.counselorId}
              placeholder="Enter therapeutic notes, diagnosis codes, follow-up homework..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
            />
          ) : (
            <Typography variant="body2" color="error">
              Cannot edit logs for cancelled appointments.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesOpen(false)} disabled={notesSaving}>Close</Button>
          {currentUser.id === selectedApt?.counselorId && selectedApt?.status !== 'cancelled' && (
            <Button
              variant="contained"
              onClick={handleSaveNotes}
              disabled={notesSaving}
            >
              {notesSaving ? 'Saving Notes...' : 'Save Progress Log'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
