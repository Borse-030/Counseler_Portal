import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
  CircularProgress, Alert, Divider, FormGroup, FormControlLabel, Checkbox,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tabs Control
  const [activeTab, setActiveTab] = useState(0);

  // Availability form state
  const [workingDays, setWorkingDays] = useState([]);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('17:00');
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
      const apts = await api.getAppointments();
      setAppointments(apts);

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
          const [h, m] = lastSlot.endHour.split(':').map(Number);
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
    } catch (err) {
      setSnackbarMsg(err.message || 'Failed to update session status.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Calculations
  const upcomingSessions = appointments.filter(a => a.status === 'upcoming');
  const pastSessions = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');
  const totalEarnings = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, current) => sum + current.amount, 0);

  // SVG Chart Setup (Weekly earnings simulation)
  const renderEarningsChart = () => {
    // Generate simulated weekly segments
    const dataPoints = [0, 120, 240, 110, 360, 480]; // Cumulative points for styling
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

    // Draw SVG coordinates
    const width = 600;
    const height = 150;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxVal = Math.max(...dataPoints, 500);

    const points = dataPoints.map((val, index) => {
      const x = padding + (index / (dataPoints.length - 1)) * chartWidth;
      const y = height - padding - (val / maxVal) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <Box sx={{ width: '100%', overflowX: 'auto', mt: 2 }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: 'transparent' }}>
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />

          {/* Line Path */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            points={points}
          />

          {/* Plot circles */}
          {dataPoints.map((val, index) => {
            const x = padding + (index / (dataPoints.length - 1)) * chartWidth;
            const y = height - padding - (val / maxVal) * chartHeight;
            return (
              <g key={index}>
                <circle cx={x} cy={y} r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                <text x={x} y={y - 8} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#475569">
                  ${val}
                </text>
                <text x={x} y={height - 10} fontSize="10" textAnchor="middle" fill="#94a3b8">
                  {labels[index]}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Avatar src={currentUser.avatar} sx={{ width: 80, height: 80, border: '3px solid #6366f1' }} />
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800 }}>
            Counselor Dashboard: {currentUser.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set availability hours, check clinic appointments, and review clinical intake summaries.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {/* Metrics Section */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.dark', color: '#ffffff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                <PointOfSaleIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Completed Sessions</Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                  {appointments.filter(a => a.status === 'completed').length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.main', color: '#ffffff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                <DateRangeIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Scheduled Patients</Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                  {upcomingSessions.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>


      </Grid>

      {/* Tabs Layout */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Appointments Log" sx={{ fontWeight: 600, fontSize: '1rem' }} />
          <Tab label="Set Availability" sx={{ fontWeight: 600, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* TAB 0: APPOINTMENTS LOG */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Upcoming Appointments */}
          <Box>
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
                                Address: {apt.clinicAddress || '102 Medical Wellness Center, Suite 300, California'}
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
          <Box>
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
          <Grid item xs={12} md={5}>
            <Card sx={{ p: 4, bgcolor: 'action.hover', position: 'sticky', top: 24 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 2 }}>
                Current Cal-Sync Configuration
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Patients booking slots on the platform will only see openings matching this availability matrix.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    SESSION LENGTH
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {slotDuration} Minutes per session
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                    WEEKLY MATRIX
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {DAYS.map(day => {
                      const dayConf = daysConfig.find(d => d.dayIndex === day.value);
                      const isActive = dayConf?.active;
                      return (
                        <Box key={day.value} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: isActive ? 'text.primary' : 'text.disabled' }}>
                            {day.label}
                          </Typography>
                          {isActive ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end', maxWidth: '70%' }}>
                              {dayConf.slots.map((s, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${s.startHour}-${s.endHour}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                              Closed
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: EARNINGS ANALYTICS - HIDDEN FOR NGO */}

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
