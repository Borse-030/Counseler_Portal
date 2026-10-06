import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, LinearProgress, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import VideoCallOutlinedIcon from '@mui/icons-material/VideoCallOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CareWorkflow from '../components/CareWorkflow';
import CounselorAvailability from '../components/CounselorAvailability';
import { modeLabel } from '../utils/sessionMode';
import { api } from '../api';

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const formatDate = value => new Date(`${value}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const initials = name => (name || '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('');
const sessionSort = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
const tableStyles = {
  boxShadow: 'none', borderRadius: 2,
  '& .MuiTableCell-root': { px: 2, py: 2, fontSize: 13, verticalAlign: 'middle' },
  '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'action.hover', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.035em', fontWeight: 700, whiteSpace: 'nowrap', color: 'text.secondary' },
  '& .MuiButton-root': { height: 32, px: 1.25, fontSize: 12, whiteSpace: 'nowrap', borderRadius: 1.25 },
};

export default function CounselorDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState('');
  const [caseFilter, setCaseFilter] = useState('active');
  const [scheduleDate, setScheduleDate] = useState('');
  const [notesFilter, setNotesFilter] = useState('all');
  const [caseId, setCaseId] = useState('');
  const [noteAppointment, setNoteAppointment] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [apts, care] = await Promise.all([api.getAppointments(), api.getSessionRequests()]);
    setAppointments(apts.filter(item => item.counselorId === currentUser.id));
    setRequests(care.filter(item => item.finalCounselorId === currentUser.id));
  }, [currentUser.id]);
  useEffect(() => {
    let active = true;
    const refresh = () => load().catch(err => { if (active) setError(err.message || 'Unable to load your workspace.'); }).finally(() => { if (active) setLoading(false); });
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [load]);

  const upcoming = appointments.filter(a => a.status === 'upcoming').sort(sessionSort);
  const completed = appointments.filter(a => a.status === 'completed').sort((a, b) => sessionSort(b, a));
  const activeCases = requests.filter(r => ['matched', 'active'].includes(r.status));
  const todaySessions = upcoming.filter(a => a.date === todayIST());
  const pendingNotes = completed.filter(a => !a.sessionNotes?.trim());
  const nextSession = upcoming.find(a => new Date(`${a.date}T${a.time}:00+05:30`) >= new Date());
  const matchesQuery = values => values.some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase()));
  const visibleCases = requests.filter(r => caseFilter === 'all' || (caseFilter === 'active' ? ['matched', 'active'].includes(r.status) : r.status === 'closed')).filter(r => matchesQuery([r.patientName, r.intakeNotes, r.discoveryNotes, r.preferredFormat]));
  const visibleUpcoming = upcoming.filter(a => (!scheduleDate || a.date === scheduleDate) && matchesQuery([a.patientName, a.purpose, a.intakeNotes, a.appointmentType]));
  const visibleCompleted = completed.filter(a => (notesFilter !== 'pending' || !a.sessionNotes?.trim()) && matchesQuery([a.patientName, a.sessionNotes, a.purpose]));
  const sections = ['Assigned cases', 'Upcoming sessions & calendar', 'Completed consultations & notes', 'Availability & slot rules'];
  const selectTab = value => { setActiveTab(value); setQuery(''); setScheduleDate(''); setNotesFilter('all'); setCaseFilter('active'); };
  const tiles = [
    { label: 'Completed sessions', count: completed.length, hint: 'Completed consultations and notes', icon: CheckCircleOutlineIcon, tab: 2, color: 'primary.main' },
    { label: 'Active assigned cases', count: activeCases.length, hint: 'Patients in your ongoing care', icon: PeopleOutlineIcon, tab: 0, color: 'primary.main' },
    { label: 'Sessions today', count: todaySessions.length, hint: todaySessions.length ? todaySessions.map(a => a.time).join(' · ') : 'No sessions scheduled today', icon: VideoCallOutlinedIcon, tab: 1, color: 'primary.main' },
    { label: 'Pending documentation', count: pendingNotes.length, hint: 'Completed sessions awaiting notes', icon: AssignmentOutlinedIcon, tab: 2, color: 'error.main', pending: true },
  ];
  const openNotes = apt => { setNoteAppointment(apt); setNotes(apt.sessionNotes || ''); setError(''); };
  const saveNotes = async () => {
    setBusy(true); setError('');
    try { await api.updateAppointment(noteAppointment.id, { sessionNotes: notes }); await load(); setNoteAppointment(null); setSuccess('Session notes saved.'); }
    catch (err) { setError(err.message || 'Unable to save session notes.'); }
    finally { setBusy(false); }
  };
  const updateStatus = async (apt, status) => {
    setBusy(true); setError('');
    try { await api.updateAppointment(apt.id, { status }); await load(); setSuccess(status === 'completed' ? 'Session marked complete. Add your session notes when ready.' : 'Session cancelled.'); }
    catch (err) { setError(err.message || 'Unable to update the session.'); }
    finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={36} /></Box>;
  return <Container maxWidth="xl" sx={{ py: 3, '& .MuiButton-root': { borderRadius: 1.5 } }}>
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, background: 'linear-gradient(110deg, rgba(99,102,241,.04), rgba(16,185,129,.025))' }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Avatar src={currentUser.avatar} sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 2 }}>{initials(currentUser.name)}</Avatar>
        <Box><Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}><Typography variant="h5" sx={{ fontWeight: 750, fontSize: { xs: 21, md: 24 } }}>{currentUser.name}</Typography><Chip size="small" label={currentUser.credentials || 'Counselor'} color="primary" variant="outlined" sx={{ fontSize: 11, height: 24 }} /></Box>
          {currentUser.specialty && <Typography variant="caption" color="primary">{currentUser.specialty}</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage your assigned cases, counseling sessions, and weekly availability.</Typography>
        </Box>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}><Chip size="small" icon={<CalendarMonthOutlinedIcon />} label={formatDate(todayIST())} variant="outlined" /><Button size="small" variant="outlined" onClick={() => selectTab(3)}>Update availability</Button><Button size="small" variant="contained" onClick={() => { selectTab(2); setNotesFilter('pending'); }}>Log session notes</Button></Box>
    </Paper>
    <Paper variant="outlined" sx={{ py: 1.25, px: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Typography variant="caption" color="primary" sx={{ fontWeight: 700, mr: 1 }}>BJS care pathway</Typography>
      {['Admin review', 'Discovery notes', 'Counselor matched', 'Sessions & notes', 'Care complete'].map((stage, i) => <Chip key={stage} size="small" label={`${i + 1}. ${stage}`} variant="outlined" sx={{ height: 22, fontSize: 11 }} />)}
    </Paper>
    {error && !noteAppointment && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        const selected = (i === 0 && activeTab === 2 && notesFilter === 'all') || (i === 1 && activeTab === 0) || (i === 2 && activeTab === 1 && scheduleDate === todayIST()) || (i === 3 && activeTab === 2 && notesFilter === 'pending');
        return <Card variant="outlined" key={tile.label} sx={{ borderRadius: 2, boxShadow: 'none', bgcolor: selected ? 'primary.main' : 'background.paper', color: selected ? 'primary.contrastText' : 'text.primary', borderColor: selected ? 'primary.main' : 'divider' }}>
          <CardActionArea aria-pressed={selected} aria-controls="counselor-panel" onClick={() => { selectTab(tile.tab); if (i === 2) setScheduleDate(todayIST()); if (tile.pending) setNotesFilter('pending'); }}>
            <CardContent sx={{ p: 2, minHeight: 130, '&:last-child': { pb: 2 } }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography sx={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.035em', color: selected ? 'inherit' : 'text.secondary' }}>{tile.label}</Typography><Box sx={{ p: 0.75, display: 'flex', borderRadius: 1, bgcolor: selected ? 'rgba(255,255,255,.15)' : 'action.hover', color: selected ? 'inherit' : tile.color }}><Icon sx={{ fontSize: 20 }} /></Box></Box><Typography sx={{ fontSize: 30, fontWeight: 750, mt: 1 }}>{tile.count}</Typography><Typography variant="caption" sx={{ color: selected ? 'inherit' : 'text.secondary' }}>{tile.hint}</Typography></CardContent>
          </CardActionArea>
        </Card>;
      })}
    </Box>
    <Paper variant="outlined" sx={{ mb: 2.5, px: 1, borderRadius: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Tabs value={activeTab} onChange={(_, value) => selectTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Counselor workspace" sx={{ flex: 1, minWidth: 0, '& .MuiTab-root': { minHeight: 48, fontSize: 12, textTransform: 'none', fontWeight: 650, px: 1.5 } }}>{sections.map((section, i) => <Tab key={section} id={`counselor-tab-${i}`} aria-controls="counselor-panel" label={section} />)}</Tabs>
      {activeTab !== 3 && <TextField size="small" placeholder="Search patient, notes or topic" value={query} onChange={e => setQuery(e.target.value)} slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} /> }, htmlInput: { 'aria-label': 'Search workspace' } }} sx={{ width: { xs: '100%', md: 255 }, m: 1 }} />}
    </Paper>
    <Box id="counselor-panel" role="tabpanel" aria-labelledby={`counselor-tab-${activeTab}`}>
      {activeTab === 0 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, alignItems: 'start', gap: 2.5 }}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}><Box><Typography sx={{ fontWeight: 700 }}>Assigned counseling cases</Typography><Typography variant="caption" color="text.secondary">Review discovery notes and coordinate the next session.</Typography></Box><TextField select size="small" label="Cases" value={caseFilter} onChange={e => setCaseFilter(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="active">Active cases</MenuItem><MenuItem value="closed">Closed cases</MenuItem><MenuItem value="all">All assigned cases</MenuItem></TextField></Paper>
          <TableContainer component={Paper} variant="outlined" sx={tableStyles}><Table sx={{ minWidth: 740 }}><TableHead><TableRow>{['Patient / client', 'Track & preference', 'Progress / stage', 'Next session', 'Actions'].map(label => <TableCell key={label} align={label === 'Actions' ? 'right' : 'left'}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
            {visibleCases.map(request => {
              const sessions = appointments.filter(a => a.careRequestId === request.id);
              const done = sessions.filter(a => a.status === 'completed').length;
              const next = upcoming.find(a => a.careRequestId === request.id);
              return <TableRow key={request.id} hover><TableCell><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 32, height: 32, fontSize: 11, bgcolor: 'primary.light', color: 'primary.dark' }}>{initials(request.patientName)}</Avatar><Box><Typography variant="body2" sx={{ fontWeight: 650 }}>{request.patientName}</Typography><Typography variant="caption" color="text.secondary">{request.patientMobile || request.preferredLanguage || 'Contact in case details'}</Typography></Box></Stack></TableCell><TableCell><Typography variant="body2">{request.supportType || request.preferredFormat || 'Counseling'}</Typography><Typography variant="caption" color="text.secondary">{request.preferredLanguage || 'Language not specified'}</Typography></TableCell><TableCell><Typography variant="caption" sx={{ fontWeight: 650 }}>{done} of {sessions.filter(a => a.status !== 'cancelled').length} sessions completed</Typography><LinearProgress variant="determinate" value={sessions.filter(a => a.status !== 'cancelled').length ? Math.min(100, done / sessions.filter(a => a.status !== 'cancelled').length * 100) : 0} sx={{ my: 0.75, height: 4, borderRadius: 1 }} /><Typography variant="caption" color="text.secondary">{request.status === 'closed' ? 'Care completed' : request.status === 'matched' ? 'Ready for first session' : 'Ongoing care'}</Typography></TableCell><TableCell><Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{next ? `${next.date} · ${next.time}` : 'Not scheduled'}</Typography>{next && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{modeLabel(next.appointmentType)} · {next.duration || 60} min</Typography>}</TableCell><TableCell align="right"><Button size="small" variant="outlined" onClick={() => setCaseId(request.id)}>View case</Button></TableCell></TableRow>;
            })}
            {!visibleCases.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>No assigned cases match this view.</TableCell></TableRow>}
          </TableBody></Table></TableContainer>
        </Box>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'primary.light' }}><Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>Next scheduled session</Typography>{nextSession ? <><Typography sx={{ fontWeight: 700, mt: 1 }}>{nextSession.patientName}</Typography><Typography variant="body2" color="text.secondary">{formatDate(nextSession.date)} · {nextSession.time} IST</Typography><Chip size="small" label={modeLabel(nextSession.appointmentType)} sx={{ mt: 1 }} /><Divider sx={{ my: 2 }} /><Typography variant="caption" color="text.secondary">Session focus</Typography><Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{nextSession.purpose || nextSession.intakeNotes || 'Review the case notes before the session.'}</Typography><Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={() => navigate(`/session/${nextSession.id}`)}>{nextSession.appointmentType === 'In-Person Consultation' ? 'Open session details' : 'Open session room'}</Button><Button fullWidth size="small" sx={{ mt: 0.5 }} onClick={() => openNotes(nextSession)}>Session notes</Button></> : <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Your next session will appear here once it is scheduled.</Typography>}</Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography sx={{ fontWeight: 700, mb: 1 }}>Documentation checklist</Typography><Typography variant="body2" color="text.secondary">{pendingNotes.length} completed session{pendingNotes.length === 1 ? '' : 's'} awaiting notes.</Typography><Button size="small" sx={{ mt: 1 }} onClick={() => { selectTab(2); setNotesFilter('pending'); }}>Review pending notes</Button></Paper>
        </Stack>
      </Box>}
      {activeTab === 1 && <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}><Typography sx={{ fontWeight: 700 }}>Upcoming sessions</Typography><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><Button size="small" variant={scheduleDate ? 'text' : 'outlined'} onClick={() => setScheduleDate('')}>All upcoming</Button><Button size="small" onClick={() => setScheduleDate(todayIST())}>Today</Button><TextField size="small" type="date" label="Session date (IST)" value={scheduleDate} slotProps={{ inputLabel: { shrink: true } }} onChange={e => setScheduleDate(e.target.value)} /></Box></Paper>
        {!visibleUpcoming.length && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No upcoming sessions match this view.</Typography></Paper>}
        {[...new Set(visibleUpcoming.map(a => a.date))].map(date => <Paper variant="outlined" key={date} sx={{ borderRadius: 2, overflow: 'hidden' }}><Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDate(date)}{date === todayIST() ? ' · Today' : ''}</Typography><Chip size="small" label={`${visibleUpcoming.filter(a => a.date === date).length} sessions`} /></Box>
          {visibleUpcoming.filter(a => a.date === date).map(apt => <Box key={apt.id} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><Box sx={{ minWidth: 64, p: 1, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{apt.time}</Typography><Typography variant="caption">IST</Typography></Box><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{apt.patientName}</Typography><Typography variant="body2" color="text.secondary">{apt.purpose || apt.appointmentKind?.replaceAll('_', ' ') || 'Counseling session'}</Typography><Typography variant="caption" color="text.secondary">{modeLabel(apt.appointmentType)} · {apt.duration || 60} min{apt.clinicAddress ? ` · ${apt.clinicAddress}` : ''}</Typography></Box></Stack><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}><Button size="small" variant="contained" onClick={() => navigate(`/session/${apt.id}`)}>{apt.appointmentType === 'In-Person Consultation' ? 'Session details' : 'Open room'}</Button><Button size="small" variant="outlined" onClick={() => openNotes(apt)}>Notes</Button><Button size="small" disabled={busy} onClick={() => updateStatus(apt, 'completed')}>Complete</Button><Button size="small" color="error" disabled={busy} onClick={() => updateStatus(apt, 'cancelled')}>Cancel</Button></Box></Box>)}
        </Paper>)}
      </Stack>}
      {activeTab === 2 && <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography sx={{ fontWeight: 700 }}>Completed consultations & notes</Typography><TextField select size="small" label="Documentation" value={notesFilter} onChange={e => setNotesFilter(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="all">All completed sessions</MenuItem><MenuItem value="pending">Pending notes</MenuItem></TextField></Paper>
        <TableContainer component={Paper} variant="outlined" sx={tableStyles}><Table sx={{ minWidth: 840 }}><TableHead><TableRow>{['Patient / client', 'Session / topic', 'Date & duration', 'Note status', 'Patient feedback', 'Actions'].map(label => <TableCell key={label} align={label === 'Actions' ? 'right' : 'left'}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{visibleCompleted.map(apt => <TableRow key={apt.id} hover><TableCell><Typography variant="body2" sx={{ fontWeight: 650 }}>{apt.patientName}</Typography></TableCell><TableCell><Typography variant="body2">{apt.purpose || apt.appointmentKind?.replaceAll('_', ' ') || 'Counseling session'}</Typography><Typography variant="caption" color="text.secondary">{modeLabel(apt.appointmentType)}</Typography></TableCell><TableCell><Typography variant="body2">{apt.date} · {apt.time}</Typography><Typography variant="caption" color="text.secondary">{apt.duration || 60} minutes</Typography></TableCell><TableCell><Chip size="small" color={apt.sessionNotes?.trim() ? 'success' : 'warning'} variant="outlined" label={apt.sessionNotes?.trim() ? 'Notes saved' : 'Pending notes'} /></TableCell><TableCell><Typography variant="caption" color="text.secondary">{apt.review?.rating ? `${apt.review.rating}/5 · ${apt.review.reviewText || 'Rating received'}` : 'Not received'}</Typography></TableCell><TableCell align="right"><Button size="small" variant={apt.sessionNotes?.trim() ? 'outlined' : 'contained'} onClick={() => openNotes(apt)}>{apt.sessionNotes?.trim() ? 'View / edit notes' : 'Write notes'}</Button></TableCell></TableRow>)}{!visibleCompleted.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}>No completed sessions match this view.</TableCell></TableRow>}</TableBody></Table></TableContainer>
      </Stack>}
      {activeTab === 3 && <CounselorAvailability counselorId={currentUser.id} />}
    </Box>
    <Dialog open={Boolean(caseId)} onClose={() => setCaseId('')} fullWidth maxWidth="md"><DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>Assigned case<IconButton aria-label="Close case" onClick={() => setCaseId('')}><CloseIcon /></IconButton></DialogTitle><DialogContent dividers>{caseId && <CareWorkflow currentUser={currentUser} requestId={caseId} filter={3} onAppointmentsChange={setAppointments} onRequestsChange={setRequests} />}</DialogContent></Dialog>
    <Dialog open={Boolean(noteAppointment)} onClose={() => !busy && setNoteAppointment(null)} fullWidth maxWidth="sm"><DialogTitle>Session notes · {noteAppointment?.patientName}</DialogTitle><DialogContent dividers><Stack spacing={2}>{error && <Alert severity="error">{error}</Alert>}<Typography variant="body2" color="text.secondary">{noteAppointment?.date} · {noteAppointment?.time} IST · {noteAppointment && modeLabel(noteAppointment.appointmentType)}</Typography><Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Intake / session goal</Typography><Typography variant="body2">{noteAppointment?.purpose || noteAppointment?.intakeNotes || 'No additional intake details.'}</Typography></Paper><TextField fullWidth multiline minRows={6} label="Clinical progress notes" value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} /></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setNoteAppointment(null)}>Close</Button><Button variant="contained" disabled={busy || !notes.trim()} onClick={saveNotes}>{busy ? 'Saving…' : 'Save notes'}</Button></DialogActions></Dialog>
  </Container>;
}
