import AdminSidebar from '../components/AdminSidebar';
import CounselorOverview from '../components/CounselorOverview';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import ReschedulePanel from '../components/ReschedulePanel';
import { mergeRescheduleResult } from '../utils/rescheduling';
import SessionOutcomeDialog from '../components/SessionOutcomeDialog';
import { resolvedStatuses, sessionStatus, statusLabel } from '../utils/sessionOutcome';
import useSessionClock from '../hooks/useSessionClock';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
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
import AttendSessionButton from '../components/AttendSessionButton';
import SessionNotesHistory from '../components/SessionNotesHistory';

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
  const now = useSessionClock();
  const [outcomeAppointment, setOutcomeAppointment] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(5);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const upcoming = appointments.filter(a => sessionStatus(a, now) === 'upcoming').sort(sessionSort);
  const awaitingOutcome = appointments.filter(a => sessionStatus(a, now) === 'awaiting_outcome').sort(sessionSort);
  const history = appointments.filter(a => resolvedStatuses.includes(a.status)).sort((a, b) => sessionSort(b, a));
  const completed = appointments.filter(a => a.status === 'completed').sort((a, b) => sessionSort(b, a));
  const activeCases = requests.filter(r => ['matched', 'active'].includes(r.status));
  const todaySessions = upcoming.filter(a => a.date === todayIST());
  const pendingNotes = completed.filter(a => !a.sessionNotes?.trim());
  const matchesQuery = values => values.some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase()));
  const visibleCases = requests.filter(r => caseFilter === 'all' || (caseFilter === 'active' ? ['matched', 'active'].includes(r.status) : r.status === 'closed')).filter(r => matchesQuery([r.patientName, r.intakeNotes, r.discoveryNotes, r.preferredFormat]));
  const visibleUpcoming = upcoming.filter(a => (!scheduleDate || a.date === scheduleDate) && matchesQuery([a.patientName, a.purpose, a.intakeNotes, a.appointmentType]));
  const visibleCompleted = history.filter(a => (notesFilter === 'all' || (notesFilter === 'pending' ? a.status === 'completed' && !a.sessionNotes?.trim() : notesFilter === 'missed' ? a.status !== 'completed' : a.status === 'completed')) && matchesQuery([a.patientName, a.sessionNotes, a.purpose]));
  const sections = [
    { id: 5, label: 'Workspace overview', navLabel: 'Overview', icon: DashboardIcon },
    { id: 0, label: 'Assigned cases', icon: PeopleOutlineIcon, count: activeCases.length },
    { id: 1, label: 'Sessions & calendar', icon: CalendarMonthOutlinedIcon },
    { id: 2, label: 'History & notes', icon: AssignmentOutlinedIcon, count: pendingNotes.length },
    { id: 3, label: 'Availability', icon: CalendarMonthOutlinedIcon },
    { id: 4, label: 'Awaiting outcome', icon: CheckCircleOutlineIcon, count: awaitingOutcome.length },
  ];
  const currentSection = sections.find(section => section.id === activeTab);

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

  if (loading) return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={36} /></Box>;
  return <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: 'calc(100dvh - 70px)', bgcolor: '#f7f9fc', '& .MuiButton-root': { borderRadius: 1.5 } }}>
    <AdminSidebar workspace="Counselor" navigationId="counselor" panelId="counselor-panel" sections={sections} activeSection={activeTab} onSelect={selectTab} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3, lg: 4 }, py: 3, maxWidth: 1664, mx: 'auto' }}>
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <IconButton aria-label="Open counselor navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} sx={{ display: { md: 'none' }, border: '1px solid #e2e8f0', bgcolor: '#fff' }}><MenuIcon fontSize="small" /></IconButton>
          <Box><Typography id="counselor-section-heading" component="h1" sx={{ fontSize: { xs: 23, md: 24 }, fontWeight: 750, letterSpacing: '-.035em', color: '#172033' }}>{currentSection.label}</Typography><Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: .5 }}>{activeTab === 5 ? `Welcome, ${currentUser.name}. Your cases, pending work, and upcoming sessions at a glance.` : 'Manage your assigned cases, sessions, and weekly availability.'}</Typography></Box>
        </Box>
        {activeTab === 5 && <Typography variant="caption" color="text.secondary">{formatDate(todayIST())} · IST</Typography>}
      </Box>
        {!currentUser?.approved && (
      <Alert
        severity="warning"
        sx={{
          mb: 2.5,
          borderRadius: 2,
          bgcolor: '#fffbeb',
          color: '#92400e',
          border: '1px solid #fde68a',
          p: 2
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
          Your profile is under review
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.88rem' }}>
          Your counselor credentials and profile are currently under review by the administrator. Case assignments and booking access will be activated upon approval.
        </Typography>
      </Alert>
    )}
    {error && !noteAppointment && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
    {!!awaitingOutcome.length && ![4, 5].includes(activeTab) && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => selectTab(4)}>Review outcomes</Button>}>{awaitingOutcome.length} session{awaitingOutcome.length === 1 ? '' : 's'} ended and need attendance confirmation.</Alert>}
    {activeTab === 5 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        const selected = (i === 0 && activeTab === 2 && notesFilter === 'all') || (i === 1 && activeTab === 0) || (i === 2 && activeTab === 1 && scheduleDate === todayIST()) || (i === 3 && activeTab === 2 && notesFilter === 'pending');
        return <Card variant="outlined" key={tile.label} sx={{ borderRadius: 2, boxShadow: 'none', bgcolor: selected ? 'primary.main' : 'background.paper', color: selected ? 'primary.contrastText' : 'text.primary', borderColor: selected ? 'primary.main' : 'divider' }}>
          <CardActionArea aria-pressed={selected} aria-controls="counselor-panel" onClick={() => { selectTab(tile.tab); if (i === 2) setScheduleDate(todayIST()); if (tile.pending) setNotesFilter('pending'); }}>
            <CardContent sx={{ p: 2, minHeight: 130, '&:last-child': { pb: 2 } }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography sx={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.035em', color: selected ? 'inherit' : 'text.secondary' }}>{tile.label}</Typography><Box sx={{ p: 0.75, display: 'flex', borderRadius: 1, bgcolor: selected ? 'rgba(255,255,255,.15)' : 'action.hover', color: selected ? 'inherit' : tile.color }}><Icon sx={{ fontSize: 20 }} /></Box></Box><Typography sx={{ fontSize: 30, fontWeight: 750, mt: 1 }}>{tile.count}</Typography><Typography variant="caption" sx={{ color: selected ? 'inherit' : 'text.secondary' }}>{tile.hint}</Typography></CardContent>
          </CardActionArea>
        </Card>;
      })}
    </Box>}
    {![3, 5].includes(activeTab) && <Box sx={{ mb: 2 }}><TextField size="small" placeholder="Search patient, notes or topic" value={query} onChange={e => setQuery(e.target.value)} slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} /> }, htmlInput: { 'aria-label': 'Search workspace' } }} sx={{ width: { xs: '100%', sm: 340 }, bgcolor: '#fff' }} /></Box>}
    <Box id="counselor-panel" role="region" aria-labelledby="counselor-section-heading">
      {activeTab === 5 && <CounselorOverview todaySessions={todaySessions} upcoming={upcoming} awaitingOutcome={awaitingOutcome} pendingNotes={pendingNotes} activeCases={activeCases} onNotes={openNotes} onSelect={(tab, filter) => { selectTab(tab); if (filter === 'pending') setNotesFilter('pending'); if (filter === 'today') setScheduleDate(todayIST()); }} />}
      {activeTab === 0 && <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start', gap: 2.5 }}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}><Box><Typography sx={{ fontWeight: 700 }}>Assigned counseling cases</Typography><Typography variant="caption" color="text.secondary">Review discovery notes, attend assigned sessions, and add session notes.</Typography></Box><TextField select size="small" label="Cases" value={caseFilter} onChange={e => setCaseFilter(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="active">Active cases</MenuItem><MenuItem value="closed">Closed cases</MenuItem><MenuItem value="all">All assigned cases</MenuItem></TextField></Paper>
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

      </Box>}
      {activeTab === 1 && <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}><Typography sx={{ fontWeight: 700 }}>Upcoming sessions</Typography><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><Button size="small" variant={scheduleDate ? 'text' : 'outlined'} onClick={() => setScheduleDate('')}>All upcoming</Button><Button size="small" onClick={() => setScheduleDate(todayIST())}>Today</Button><TextField size="small" type="date" label="Session date (IST)" value={scheduleDate} slotProps={{ inputLabel: { shrink: true } }} onChange={e => setScheduleDate(e.target.value)} /></Box></Paper>
        {!visibleUpcoming.length && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No upcoming sessions match this view.</Typography></Paper>}
        {[...new Set(visibleUpcoming.map(a => a.date))].map(date => <Paper variant="outlined" key={date} sx={{ borderRadius: 2, overflow: 'hidden' }}><Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDate(date)}{date === todayIST() ? ' · Today' : ''}</Typography><Chip size="small" label={`${visibleUpcoming.filter(a => a.date === date).length} sessions`} /></Box>
          {visibleUpcoming.filter(a => a.date === date).map(apt => <Box key={apt.id} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><Box sx={{ minWidth: 64, p: 1, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{apt.time}</Typography><Typography variant="caption">IST</Typography></Box><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{apt.patientName}</Typography><Typography variant="body2" color="text.secondary">{apt.purpose || apt.appointmentKind?.replaceAll('_', ' ') || 'Counseling session'}</Typography><Typography variant="caption" color="text.secondary">{modeLabel(apt.appointmentType)} · {apt.duration || 60} min{apt.appointmentType === 'In-Person Consultation' ? ' - HO' : ''}</Typography></Box></Stack><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}><AttendSessionButton size="small" variant="contained" appointment={apt} /><Button size="small" variant="outlined" onClick={() => openNotes(apt)}>Notes</Button></Box></Box>)}
        </Paper>)}
      </Stack>}
      {activeTab === 2 && <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography sx={{ fontWeight: 700 }}>Session history & notes</Typography><TextField select size="small" label="Documentation" value={notesFilter} onChange={e => setNotesFilter(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="all">All recorded outcomes</MenuItem><MenuItem value="completed">Completed sessions</MenuItem><MenuItem value="missed">Missed sessions</MenuItem><MenuItem value="pending">Pending notes</MenuItem></TextField></Paper>
        <TableContainer component={Paper} variant="outlined" sx={tableStyles}><Table sx={{ minWidth: 840 }}><TableHead><TableRow>{['Patient / client', 'Session / outcome', 'Date & duration', 'Note status', 'Actions'].map(label => <TableCell key={label} align={label === 'Actions' ? 'right' : 'left'}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{visibleCompleted.map(apt => <TableRow key={apt.id} hover><TableCell><Typography variant="body2" sx={{ fontWeight: 650 }}>{apt.patientName}</Typography></TableCell><TableCell><Typography variant="body2">{apt.purpose || apt.appointmentKind?.replaceAll('_', ' ') || 'Counseling session'}</Typography><Typography variant="caption" color="text.secondary">{modeLabel(apt.appointmentType)}</Typography><Chip size="small" sx={{ display: 'flex', width: 'fit-content', mt: 0.5 }} variant="outlined" color={apt.status === 'completed' ? 'success' : 'warning'} label={statusLabel(apt.status)} /></TableCell><TableCell><Typography variant="body2">{apt.date} · {apt.time}</Typography><Typography variant="caption" color="text.secondary">{apt.duration || 60} minutes</Typography></TableCell><TableCell><Chip size="small" color={apt.sessionNotes?.trim() ? 'success' : 'warning'} variant="outlined" label={apt.sessionNotes?.trim() ? 'Notes saved' : 'Pending notes'} /></TableCell><TableCell align="right"><Button size="small" variant={apt.sessionNotes?.trim() ? 'outlined' : 'contained'} onClick={() => openNotes(apt)}>{apt.sessionNotes?.trim() ? 'View / edit notes' : 'Write notes'}</Button><ReschedulePanel compact appointment={apt} currentUser={currentUser} onUpdated={result => setAppointments(previous => mergeRescheduleResult(previous, result))} /></TableCell></TableRow>)}{!visibleCompleted.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>No recorded sessions match this view.</TableCell></TableRow>}</TableBody></Table></TableContainer>
      </Stack>}
      {activeTab === 3 && <CounselorAvailability counselorId={currentUser.id} />}
      {activeTab === 4 && <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}><Typography fontWeight={700}>Awaiting session outcome</Typography><Typography variant="body2" color="text.secondary">The scheduled end time has passed. Confirm attendance to complete the session or record who was absent.</Typography></Paper>
        {awaitingOutcome.filter(a => matchesQuery([a.patientName, a.purpose])).map(apt => <Paper variant="outlined" key={apt.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box><Typography fontWeight={650}>{apt.patientName}</Typography><Typography variant="body2" color="text.secondary">{formatDate(apt.date)} · {apt.time} IST · {apt.duration || 60} min · {modeLabel(apt.appointmentType)}</Typography><Chip size="small" color="warning" variant="outlined" sx={{ mt: 1 }} label="Awaiting outcome" /></Box>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}><ReschedulePanel compact allowRequest={false} appointment={apt} currentUser={currentUser} onUpdated={result => setAppointments(previous => mergeRescheduleResult(previous, result))} /><Button variant="outlined" onClick={() => openNotes(apt)}>Notes</Button><Button variant="contained" onClick={() => setOutcomeAppointment({ ...apt, status: sessionStatus(apt, now) })}>Confirm outcome</Button></Stack>
        </Paper>)}
        {!awaitingOutcome.length && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No sessions are awaiting an outcome.</Typography>}
      </Stack>}
    </Box>
    {outcomeAppointment && <SessionOutcomeDialog appointment={outcomeAppointment} onClose={() => setOutcomeAppointment(null)} onSaved={(updated, message) => { setAppointments(previous => previous.map(a => a.id === updated.id ? updated : a)); setOutcomeAppointment(null); selectTab(2); setNotesFilter(updated.status === 'completed' ? 'completed' : 'missed'); setSuccess(message); }} />}
    <Dialog open={Boolean(caseId)} onClose={() => setCaseId('')} fullWidth maxWidth="md"><DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>Assigned case<IconButton aria-label="Close case" onClick={() => setCaseId('')}><CloseIcon /></IconButton></DialogTitle><DialogContent dividers>{caseId && <CareWorkflow currentUser={currentUser} requestId={caseId} filter={3} onAppointmentsChange={setAppointments} onRequestsChange={setRequests} />}</DialogContent></Dialog>
    <Dialog open={Boolean(noteAppointment)} onClose={() => !busy && setNoteAppointment(null)} fullWidth maxWidth="sm"><DialogTitle>Session notes · {noteAppointment?.patientName}</DialogTitle><DialogContent dividers><Stack spacing={2}>{error && <Alert severity="error">{error}</Alert>}<Typography variant="body2" color="text.secondary">{noteAppointment?.date} · {noteAppointment?.time} IST · {noteAppointment && modeLabel(noteAppointment.appointmentType)}</Typography><Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Intake / session goal</Typography><Typography variant="body2">{noteAppointment?.purpose || noteAppointment?.intakeNotes || 'No additional intake details.'}</Typography></Paper><TextField fullWidth multiline minRows={6} label="Clinical progress notes" value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} />{noteAppointment && <SessionNotesHistory appointment={noteAppointment} appointments={appointments} />}</Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setNoteAppointment(null)}>Close</Button><Button variant="contained" disabled={busy || !notes.trim() || notes === (noteAppointment?.sessionNotes || '')} onClick={saveNotes}>{busy ? 'Saving…' : 'Save notes'}</Button></DialogActions></Dialog>
    </Box>
  </Box>;
}
