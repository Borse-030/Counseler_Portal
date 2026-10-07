import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, MenuItem, Paper, Radio, RadioGroup, Skeleton, Stack, Tab, Tabs, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import { api } from '../api';
import { slotSupportsMode } from '../utils/sessionMode';
import { isOnlineMeetingLink } from '../utils/sessionAttendance';
import { counselorLanguages, getCounselorMatch, sortCounselorMatches } from '../utils/counselorMatching';

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const initials = name => (name || '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('');

export default function AdminScheduleSession({ request, patient, counselors, onClose, onScheduled, onAssigned }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const preference = request.preferredFormat || request.appointmentType || patient?.preferredCounselingMode || request.supportType;
  const requestedMode = ['Online Consultation', 'Video Consultation', 'online', 'Online'].includes(preference) ? 'online'
    : ['In-Person Consultation', 'offline', 'Offline'].includes(preference) ? 'offline' : null;
  const requestedType = requestedMode === 'offline' ? 'In-Person Consultation' : requestedMode === 'online' ? 'Video Consultation' : '';
  const preferredLanguage = request.preferredLanguage || patient?.preferredLanguage || '';
  const modeLabel = requestedMode === 'offline' ? 'Offline · HO' : requestedMode === 'online' ? 'Online' : 'Mode not specified';
  const [date, setDate] = useState(todayIST);
  const [duration, setDuration] = useState(60);
  const [counselorId, setCounselorId] = useState(request.finalCounselorId || '');
  const [time, setTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [query, setQuery] = useState('');
  const [listView, setListView] = useState('all');
  const [details, setDetails] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [availability, setAvailability] = useState(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const assignedId = useRef(request.finalCounselorId || '');
  const saving = useRef(false);
  const listRef = useRef(null);
  const counselorKey = counselors.map(c => c.id).join(',');

  useEffect(() => {
    let active = true;
    api.getCounselors().then(data => {
      if (active) setProfiles(Object.fromEntries(data.map(c => [c.id, c])));
    }).catch(() => { /* Use account details already loaded by the dashboard. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const ids = counselorKey ? counselorKey.split(',') : [];
    Promise.all(ids.map(async id => {
      try { return [id, { availability: await api.getCounselorAvailability(id) }]; }
      catch (err) { return [id, { error: err.message || 'Unable to load session modes.' }]; }
    })).then(entries => { if (active) setDetails({ key: counselorKey, data: Object.fromEntries(entries) }); });
    return () => { active = false; };
  }, [counselorKey]);

  const validDate = Boolean(/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayIST());
  const availabilityKey = `${counselorId}/${date}/${duration}/${requestedType}/${slotRefresh}`;
  useEffect(() => {
    let active = true;
    if (!counselorId || !validDate || !requestedType) return;
    api.getCounselorSlots(counselorId, date, duration, requestedType)
      .then(data => { if (active) setAvailability({ key: availabilityKey, data }); })
      .catch(err => { if (active) setAvailability({ key: availabilityKey, data: { slots: [], error: true, message: err.message || 'Unable to load available times.' } }); });
    return () => { active = false; };
  }, [counselorId, date, duration, requestedType, validDate, availabilityKey]);

  const detailsReady = details?.key === counselorKey;
  const allCounselors = sortCounselorMatches(counselors.map(c => {
    const profile = profiles[c.id];
    const counselor = { ...profile, ...c,
      languages: counselorLanguages(c.languages).length ? c.languages : profile?.languages,
      experience: c.experience ?? profile?.experience,
    };
    const info = detailsReady ? details.data[c.id] : null;
    return { ...counselor, info, match: getCounselorMatch(counselor, info?.availability, requestedMode, preferredLanguage) };
  }));
  const selected = allCounselors.find(c => c.id === counselorId);
  const matchingCount = allCounselors.filter(c => c.match.recommended).length;
  const visible = allCounselors.filter(c => (listView === 'all' || c.match.recommended)
    && [c.name, c.specialty, ...c.match.languages].some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())));
  const ready = availability?.key === availabilityKey;
  const day = ready ? availability.data : null;
  const slots = (day?.slots || []).filter(slot => slot.available && slotSupportsMode(slot, requestedType));
  const validTime = slots.some(slot => slot.time === time);
  const validLink = requestedMode === 'offline' || isOnlineMeetingLink(meetingLink);
  const canSubmit = Boolean(selected && requestedType && validDate && validTime && validLink && !busy);
  const chooseCounselor = id => { setCounselorId(id); setTime(''); setError(''); };

  const submit = async () => {
    if (!canSubmit || saving.current) return;
    saving.current = true;
    setBusy(true); setError('');
    let sessionSaved = false;
    try {
      if (assignedId.current !== counselorId) {
        const result = await api.assignFinalCounselor(request.id, { counselorId });
        assignedId.current = counselorId;
        onAssigned?.(result.request);
      }
      const result = await api.scheduleRequestSession(request.id, {
        sessions: [{ date, time, duration, appointmentType: requestedType, kind: 'session', meetingLink: requestedMode === 'online' ? meetingLink.trim() : '' }],
      });
      sessionSaved = true;
      await onScheduled(result);
    } catch (err) {
      setError(`${sessionSaved ? 'The session was saved, but the dashboard could not refresh. ' : assignedId.current === counselorId ? 'Counselor assignment is saved. The session was not scheduled. ' : ''}${err.message || 'Unable to schedule the session.'}`);
      setTime('');
      if (!sessionSaved) setSlotRefresh(value => value + 1);
    } finally { saving.current = false; setBusy(false); }
  };

  const rowColumns = { xs: '28px minmax(0, 1fr) 104px', md: '28px minmax(0, 1fr) 84px 112px', lg: '28px minmax(180px, 1.4fr) minmax(120px, 0.9fr) 92px 112px' };
  const resetListScroll = () => { if (listRef.current) listRef.current.scrollTop = 0; };

  return <Dialog open maxWidth={false} fullScreen={compact} onClose={() => !busy && onClose()}
    aria-labelledby="schedule-session-title" aria-describedby="schedule-session-description"
    slotProps={{ paper: { sx: { width: { xs: '100%', md: 'min(1440px, calc(100vw - 32px))' }, height: { xs: '100%', md: 'min(900px, calc(100dvh - 32px))' }, maxHeight: { xs: '100%', md: 'calc(100dvh - 32px)' }, m: { xs: 0, md: 2 }, borderRadius: { xs: 0, md: 2.5 }, overflow: 'hidden' } } }}>
    <DialogTitle component="div" sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
      <Box><Typography id="schedule-session-title" variant="h6" fontWeight={750}>Assign counselor and schedule session</Typography>
        <Typography id="schedule-session-description" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Choose a counselor, then confirm a time and meeting details.</Typography></Box>
      <IconButton aria-label="Close scheduling" disabled={busy} onClick={onClose} size="small"><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: { xs: 'auto', md: 'hidden' } }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}><Typography variant="body2" color="text.secondary">Scheduling for</Typography><Typography fontWeight={700}>{patient?.name || request.patientName}</Typography></Stack>
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" icon={requestedMode === 'offline' ? <PlaceOutlinedIcon /> : <VideocamOutlinedIcon />} label={modeLabel} color="primary" variant="outlined" />
            <Chip size="small" icon={<TranslateOutlinedIcon />} label={preferredLanguage || 'No language preference'} variant="outlined" />
          </Stack>
        </Stack>
        <Box component="details" sx={{ mt: 0.75 }}>
          <Typography component="summary" variant="body2" color="primary" sx={{ cursor: 'pointer', width: 'fit-content' }}>User concern and discovery notes</Typography>
          <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, maxHeight: 140, overflow: 'auto' }}>
            <Typography variant="caption" color="text.secondary">User concern</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{patient?.counselingRequirements || request.intakeNotes || 'Not provided'}</Typography>
            <Typography variant="caption" color="text.secondary">Discovery notes</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{request.discoveryNotes || 'Not provided'}</Typography>
          </Box>
        </Box>
      </Box>
      {error && <Alert severity="error" sx={{ mx: 2.5, mt: 2 }}>{error}</Alert>}
      {!requestedMode && <Alert severity="warning" sx={{ mx: 2.5, mt: 2 }}>Confirm the user's online or offline preference before scheduling.</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 330px' }, gridTemplateRows: { md: 'minmax(0, 1fr)' }, flex: { xs: '0 0 auto', md: 1 }, minHeight: 0 }}>
        <Stack spacing={1} sx={{ p: 2, minHeight: 0, minWidth: 0, overflow: { md: 'hidden' }, '& > :not(:last-child)': { flexShrink: 0 } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}><Typography variant="subtitle1" fontWeight={700}>1. Choose a counselor</Typography>
            <Typography variant="caption" color="text.secondary">Best mode & language matches first</Typography></Stack>
          <Tabs value={listView} onChange={(_, value) => { setListView(value); resetListScroll(); }} aria-label="Filter counselors" sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, px: 1.5, textTransform: 'none', fontSize: 13 } }}>
            <Tab value="all" label={`All counselors (${allCounselors.length})`} />
            <Tab value="matching" label={`Matching preferences (${detailsReady ? matchingCount : '…'})`} />
          </Tabs>
          <TextField size="small" fullWidth label="Search counselors" placeholder="Name, specialty or language" value={query} disabled={busy}
            onChange={e => { setQuery(e.target.value); resetListScroll(); }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <Box ref={listRef} aria-label="Counselor directory" sx={{ flex: { xs: '0 0 auto', md: 1 }, minHeight: { xs: 160, md: 0 }, overflowY: 'auto', overflowX: 'hidden', maxHeight: { xs: 420, md: 'none' }, border: 1, borderColor: 'divider', borderRadius: 1.5, scrollbarGutter: 'stable' }}>
            <Box aria-hidden="true" sx={{ display: 'grid', gridTemplateColumns: rowColumns, alignItems: 'center', gap: 1, px: 1.5, py: 1, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }}>
              <Box /><Typography variant="caption" fontWeight={700}>COUNSELOR</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ display: { xs: 'none', lg: 'block' } }}>LANGUAGES</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ display: { xs: 'none', md: 'block' } }}>MODE</Typography>
              <Typography variant="caption" fontWeight={700}>PREFERENCE FIT</Typography>
            </Box>
            {listView === 'matching' && !detailsReady ? <Stack spacing={0.5} sx={{ p: 1 }} aria-label="Loading counselor matches">{[1, 2, 3, 4].map(value => <Skeleton key={value} variant="rounded" height={64} />)}</Stack> : <RadioGroup name="assigned-counselor" value={counselorId} onChange={e => chooseCounselor(e.target.value)} aria-label="Choose a counselor">
              {visible.map(c => {
                const fit = !c.info ? 'Checking…' : c.info.error ? 'Not verified' : c.match.recommended ? 'Matches' : c.match.modeMatch === false ? 'Mode differs' : c.match.languageMatch === false ? 'Language differs' : 'Not specified';
                return <Box component="label" key={c.id} sx={{ px: 1.5, py: 0.75, minHeight: 56, display: 'grid', gridTemplateColumns: rowColumns, gap: 1, alignItems: 'center', cursor: busy ? 'default' : 'pointer', borderBottom: 1, borderColor: 'divider',
                  boxShadow: counselorId === c.id ? 'inset 3px 0 0' : 'none', color: counselorId === c.id ? 'primary.main' : 'text.primary', bgcolor: counselorId === c.id ? 'action.selected' : 'background.paper',
                  '&:last-child': { borderBottom: 0 }, '&:hover': { bgcolor: 'action.hover' }, '&:focus-within': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}>
                  <Radio value={c.id} disabled={busy} size="small" sx={{ p: 0.25 }} slotProps={{ input: { 'aria-label': `Select ${c.name}` } }} />
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Avatar src={c.avatar} sx={{ display: { xs: 'none', sm: 'flex' }, width: 30, height: 30, fontSize: 11, bgcolor: 'primary.light', color: 'primary.dark' }}>{initials(c.name)}</Avatar>
                    <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={650} noWrap title={c.name}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div" title={`${c.specialty || 'Counselor'}${c.experience != null ? ` · ${c.experience} years` : ''}`}>{c.specialty || 'Counselor'}{c.experience != null ? ` · ${c.experience} years` : ''}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ display: { xs: 'block', lg: 'none' } }} title={c.match.languages.join(', ')}>{c.match.languages.join(', ') || 'Languages not listed'}</Typography>
                      {request.finalCounselorId === c.id && <Typography variant="caption" color="primary">Currently assigned</Typography>}
                    </Box>
                  </Stack>
                  <Typography variant="caption" color={c.match.languageMatch ? 'success.main' : 'text.secondary'} sx={{ display: { xs: 'none', lg: 'block' } }} title={c.match.languages.join(', ')}>{c.match.languages.join(', ') || 'Not listed'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>{c.match.supportedModes.length ? c.match.supportedModes.map(value => value === 'online' ? 'Online' : 'Offline').join(' / ') : c.info ? 'Not set' : 'Checking…'}</Typography>
                  {c.match.recommended ? <Chip size="small" icon={<CheckCircleOutlineIcon />} label={fit} color="success" variant="outlined" sx={{ height: 24, fontSize: 11, justifySelf: 'start' }} />
                    : <Typography variant="caption" color={c.match.modeMatch === false || c.info?.error ? 'warning.main' : 'text.secondary'}>{fit}</Typography>}
                </Box>;
              })}
              {!visible.length && <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" fontWeight={600}>{!allCounselors.length ? 'No approved counselors available' : query.trim() ? 'No counselors match this search' : 'No counselors match both preferences'}</Typography>
                <Typography variant="caption" color="text.secondary">{listView === 'matching' ? 'Review all counselors or adjust your search.' : 'Try another name or language.'}</Typography>
                {(listView !== 'all' || query) && <Button size="small" sx={{ mt: 1 }} onClick={() => { setListView('all'); setQuery(''); }}>Show all counselors</Button>}</Box>}
            </RadioGroup>}
          </Box>
        </Stack>
        <Stack spacing={1.75} sx={{ p: 2, bgcolor: 'action.hover', borderLeft: { md: 1 }, borderTop: { xs: 1, md: 0 }, borderColor: 'divider', overflowY: { md: 'auto' }, minHeight: 0, '& > *': { flexShrink: 0 } }}>
          <Box><Typography variant="subtitle1" fontWeight={700}>2. Schedule the session</Typography><Typography variant="caption" color="text.secondary">Times are shown in India Standard Time (IST).</Typography></Box>
          {!selected ? <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', borderRadius: 1.5 }}><Typography variant="body2" color="text.secondary">Select a counselor to check available times and complete the booking.</Typography></Paper> : <>
            <Box><Typography variant="caption" color="text.secondary">Selected counselor</Typography><Typography variant="body2" fontWeight={700}>{selected.name}</Typography></Box>
            {selected.match.languageMatch === false && <Alert severity="warning" sx={{ fontSize: 12 }}>This counselor does not list {preferredLanguage}. Confirm language suitability before scheduling.</Alert>}
          </>}
          <TextField fullWidth size="small" type="date" label="Session date" value={date} disabled={busy}
            error={Boolean(date) && !validDate} helperText={date && !validDate ? 'Choose today or a future date.' : ''}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={e => { setDate(e.target.value); setTime(''); }} />
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth size="small" label="Session mode" value={modeLabel} slotProps={{ input: { readOnly: true } }} helperText="User's preference" />
            <TextField fullWidth select size="small" label="Duration" value={duration} disabled={busy} onChange={e => { setDuration(Number(e.target.value)); setTime(''); }}>
              {[30, 45, 60, 90].map(value => <MenuItem key={value} value={value}>{value} minutes</MenuItem>)}
            </TextField>
          </Stack>
          <Box><Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Available times</Typography>
            {!selected ? <Typography variant="caption" color="text.secondary">Choose a counselor first.</Typography>
              : !validDate ? <Typography variant="caption" color="text.secondary">Choose a valid session date.</Typography>
                : !requestedType ? <Typography variant="caption" color="text.secondary">The user's session mode is required.</Typography>
                  : !ready ? <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><CircularProgress size={16} /><Typography variant="caption">Checking availability…</Typography></Stack>
                    : !slots.length ? <Alert severity={day?.error ? 'error' : 'info'} sx={{ fontSize: 12 }} action={day?.error ? <Button size="small" disabled={busy} onClick={() => setSlotRefresh(value => value + 1)}>Retry</Button> : undefined}>{day?.message || 'No available times. Choose another date or counselor.'}</Alert>
                      : <Box role="group" aria-label="Available session times in IST" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>{slots.map(slot => <Button key={slot.time} size="small" disabled={busy} variant={validTime && time === slot.time ? 'contained' : 'outlined'} aria-pressed={validTime && time === slot.time} onClick={() => setTime(slot.time)} sx={{ minWidth: 0, bgcolor: time === slot.time ? undefined : 'background.paper' }}>{slot.time}</Button>)}</Box>}
          </Box>
          <Divider />
          {requestedMode === 'online' ? <TextField fullWidth required size="small" type="url" label="Zoom or Google Meet link" value={meetingLink} disabled={busy || !selected}
            error={Boolean(meetingLink) && !isOnlineMeetingLink(meetingLink)} placeholder="https://meet.google.com/…"
            helperText={meetingLink && !isOnlineMeetingLink(meetingLink) ? 'Enter a valid HTTPS Zoom or Google Meet link.' : 'Required for the counselor and user to attend.'}
            onChange={e => setMeetingLink(e.target.value)} /> : requestedMode === 'offline' && <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', gap: 1 }}><PlaceOutlinedIcon color="primary" fontSize="small" /><Box><Typography variant="body2" fontWeight={600}>HO</Typography><Typography variant="caption" color="text.secondary">The counselor and user attend in person.</Typography></Box></Paper>}
        </Stack>
      </Box>
    </DialogContent>
    <DialogActions sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, flexShrink: 0, justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
      <Box sx={{ flex: '1 1 200px' }}><Typography variant="body2" fontWeight={600}>{selected?.name || 'No counselor selected'}</Typography>
        <Typography variant="caption" color="text.secondary">{validTime ? `${date} · ${time} IST · ${duration} min · ${modeLabel}` : 'Choose a counselor and an available time to continue.'}</Typography></Box>
      <Stack direction="row" spacing={1}><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!canSubmit} onClick={submit}
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>{busy ? 'Saving…' : 'Assign and schedule'}</Button></Stack>
    </DialogActions>
  </Dialog>;
}
