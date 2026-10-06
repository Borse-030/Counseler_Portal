import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { sessionTypesForAvailability, slotSupportsMode } from '../utils/sessionMode';

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function AdminScheduleSession({ request, patient, counselors, onClose, onScheduled, onAssigned }) {
  const [date, setDate] = useState(todayIST);
  const [duration, setDuration] = useState(60);
  const [counselorId, setCounselorId] = useState(request.finalCounselorId || '');
  const [mode, setMode] = useState('');
  const [time, setTime] = useState('');
  const [query, setQuery] = useState('');
  const [details, setDetails] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [availability, setAvailability] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [assignmentSaved, setAssignmentSaved] = useState(false);
  const counselorKey = counselors.map(c => c.id).join(',');

  useEffect(() => {
    let active = true;
    api.getCounselors().then(data => {
      if (active) setProfiles(Object.fromEntries(data.map(c => [c.id, c])));
    }).catch(() => { /* Account details remain available if profiles cannot be loaded. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const ids = counselorKey ? counselorKey.split(',') : [];
    Promise.all(ids.map(async id => {
      const [weekly, custom] = await Promise.allSettled([
        api.getCounselorAvailability(id), api.getCounselorAppointmentTypes(id),
      ]);
      return [id, {
        availability: weekly.status === 'fulfilled' ? weekly.value : null,
        types: custom.status === 'fulfilled' ? custom.value : [],
        error: weekly.status === 'rejected' ? weekly.reason.message || 'Unable to load session modes.' : '',
      }];
    })).then(entries => { if (active) setDetails(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [counselorKey]);

  const availabilityKey = `${counselorKey}/${date}/${duration}`;
  useEffect(() => {
    let active = true;
    const ids = counselorKey ? counselorKey.split(',') : [];
    if (!date || date < todayIST()) return;
    Promise.all(ids.map(async id => {
      try { return [id, await api.getCounselorSlots(id, date, duration)]; }
      catch (err) { return [id, { slots: [], message: err.message || 'Unable to load availability.' }]; }
    })).then(entries => { if (active) setAvailability({ key: availabilityKey, data: Object.fromEntries(entries) }); });
    return () => { active = false; };
  }, [counselorKey, date, duration, availabilityKey]);

  const ready = availability?.key === availabilityKey;
  const selected = counselors.find(c => c.id === counselorId);
  const counselorTypes = id => sessionTypesForAvailability(details?.[id]?.availability, details?.[id]?.types, ready ? availability.data[id]?.slots : []);
  const types = counselorTypes(counselorId);
  const slots = ready ? (availability.data[counselorId]?.slots || []).filter(s => s.available && slotSupportsMode(s, mode)) : [];
  const validMode = types.some(type => type.name === mode);
  const validTime = slots.some(slot => slot.time === time);
  const canSubmit = selected && validMode && validTime && date >= todayIST() && !busy;
  const chooseCounselor = counselor => {
    setCounselorId(counselor.id);
    setTime('');
    const preference = request.preferredFormat || request.appointmentType || request.supportType;
    const preferred = preference === 'Online Consultation' ? 'Video Consultation' : preference;
    const offered = counselorTypes(counselor.id);
    setMode(offered.find(type => type.name === preferred)?.name || (offered.length === 1 ? offered[0].name : ''));
    setError('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    let assigned = assignmentSaved;
    try {
      if (request.finalCounselorId !== counselorId) {
        const result = await api.assignFinalCounselor(request.id, { counselorId });
        assigned = true;
        setAssignmentSaved(true);
        onAssigned(result.request);
      }
      const result = await api.scheduleRequestSession(request.id, {
        sessions: [{ date, time, duration, appointmentType: mode, kind: 'session' }],
      });
      await onScheduled(result);
    } catch (err) {
      setError(`${assigned ? 'Counselor assignment was saved. The session was not scheduled. ' : ''}${err.message || 'Unable to schedule session.'}`);
      // Reload live slots after a booking conflict before allowing another attempt.
      setTime('');
      try {
        const data = await api.getCounselorSlots(counselorId, date, duration);
        setAvailability(previous => previous?.key === availabilityKey ? { ...previous, data: { ...previous.data, [counselorId]: data } } : previous);
      } catch { setAvailability(null); }
    } finally { setBusy(false); }
  };

  const visible = counselors.map(c => ({ ...profiles[c.id], ...c,
    languages: c.languages || profiles[c.id]?.languages || [],
    experience: c.experience ?? profiles[c.id]?.experience,
  })).filter(c => [c.name, c.specialty, c.credentials, ...c.languages].some(value => String(value || '').toLowerCase().includes(query.toLowerCase())));

  return <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="lg" aria-labelledby="schedule-session-title">
    <DialogTitle id="schedule-session-title">Assign counselor and schedule session</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Typography fontWeight={700}>{patient?.name || request.patientName}</Typography>
          <Typography variant="body2" color="text.secondary">Preferred mode: {request.preferredFormat || request.appointmentType || request.supportType || 'Not specified'} · Language: {request.preferredLanguage || patient?.preferredLanguage || 'Not specified'}</Typography>
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>Issue / requirements: {patient?.counselingRequirements || request.intakeNotes || 'Not provided'}</Typography>
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>Discovery notes: {request.discoveryNotes || 'Not provided'}</Typography>
        </Paper>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth type="date" label="Session date (IST)" value={date} disabled={busy} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={e => { setDate(e.target.value); setTime(''); }} />
          <TextField fullWidth select label="Duration" value={duration} disabled={busy} onChange={e => { setDuration(Number(e.target.value)); setTime(''); }}>
            {[30, 45, 60, 90].map(value => <MenuItem key={value} value={value}>{value} minutes</MenuItem>)}
          </TextField>
        </Stack>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Compare counselors ({counselors.length})</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Review expertise against the patient's issue, then check modes and availability for the selected date.</Typography>
          <TextField fullWidth size="small" label="Search by name, expertise or language" value={query} disabled={busy} onChange={e => setQuery(e.target.value)} />
        </Box>
        {!visible.length && <Alert severity="info">{counselors.length ? 'No counselors match your search.' : 'No active, approved counselors are available for assignment.'}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          {visible.map(c => {
            const info = details?.[c.id];
            const offeredTypes = counselorTypes(c.id);
            const day = ready ? availability.data[c.id] : null;
            const availableSlots = day?.slots?.filter(slot => slot.available) || [];
            return <Paper variant="outlined" key={c.id} sx={{ p: 2, borderColor: counselorId === c.id ? 'primary.main' : 'divider', borderWidth: counselorId === c.id ? 2 : 1 }}>
              <Stack spacing={1}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={700}>{c.name}</Typography>
                  {request.finalCounselorId === c.id && <Chip size="small" label="Currently assigned" />}
                </Stack>
                <Typography variant="body2" fontWeight={600}>{c.specialty || 'Expertise not listed'}</Typography>
                <Typography variant="body2" color="text.secondary">{c.credentials || 'Credentials not listed'} · {c.experience == null ? 'Experience not listed' : `${c.experience} years experience`}</Typography>
                <Typography variant="body2" color="text.secondary">Languages: {(c.languages || []).join(', ') || 'Not listed'}</Typography>
                <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75 }}>{offeredTypes.map(type => <Chip size="small" variant="outlined" label={type.name} key={type.id || type.name} />)}</Stack>
                {!offeredTypes.length && (!info ? <Typography variant="caption">Loading modes…</Typography> : info.error ? <Typography variant="caption" color="error">{info.error}</Typography> : <Typography variant="caption" color="text.secondary">No active availability blocks configured.</Typography>)}
                {!day ? <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}><CircularProgress size={14} /><Typography variant="caption">{date && date >= todayIST() ? 'Checking availability…' : 'Choose a valid session date.'}</Typography></Stack> : <Typography variant="body2" color={availableSlots.length ? 'success.main' : 'text.secondary'}>{availableSlots.length ? `${availableSlots.length} available times (IST): ${availableSlots.slice(0, 5).map(s => `${s.time}${s.modes ? ` (${s.modes.join(' / ')})` : ''}`).join(', ')}${availableSlots.length > 5 ? '…' : ''}` : day.message || 'No available times for this date.'}</Typography>}
                <Button variant={counselorId === c.id ? 'contained' : 'outlined'} disabled={busy} aria-pressed={counselorId === c.id} onClick={() => chooseCounselor(c)}>{counselorId === c.id ? 'Selected counselor' : 'Select counselor'}</Button>
              </Stack>
            </Paper>;
          })}
        </Box>
        {selected && <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 2 }}>Session with {selected.name}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField fullWidth select label="Session mode" value={validMode ? mode : ''} disabled={busy || !types.length} onChange={e => { setMode(e.target.value); setTime(''); }}>
              {types.map(type => <MenuItem key={type.id || type.name} value={type.name}>{type.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth select label="Available time (IST)" value={validTime ? time : ''} disabled={busy || !validMode || !slots.length} helperText={!ready ? 'Checking availability…' : slots.length ? 'Choose an available time.' : availability.data[counselorId]?.message || 'Choose another date or counselor.'} onChange={e => setTime(e.target.value)}>
              {slots.map(slot => <MenuItem key={slot.time} value={slot.time}>{slot.time}</MenuItem>)}
            </TextField>
          </Stack>
        </Paper>}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!canSubmit} onClick={submit}>{busy ? 'Saving…' : 'Assign and schedule session'}</Button></DialogActions>
  </Dialog>;
}
