import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { isOnlineMeetingLink } from '../utils/sessionAttendance';
import { slotSupportsMode } from '../utils/sessionMode';
import { todayIST } from '../../../shared/counsellingFramework.mjs';

export default function EditScheduledSession({ appointment, onClose, onSaved }) {
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  const [duration, setDuration] = useState(appointment.duration || 60);
  const [mode, setMode] = useState(appointment.appointmentType === 'In-Person Consultation' ? 'In-Person Consultation' : 'Video Consultation');
  const [meetingLink, setMeetingLink] = useState(appointment.meetingLink || '');
  const [availability, setAvailability] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const key = `${date}/${duration}/${mode}/${refresh}`;
  useEffect(() => {
    let active = true;
    api.getCounselorSlots(appointment.counselorId, date, duration, mode, appointment.id)
      .then(data => { if (active) setAvailability({ key, data }); })
      .catch(err => { if (active) setAvailability({ key, error: err.message }); });
    return () => { active = false; };
  }, [appointment.id, appointment.counselorId, date, duration, mode, key]);
  const ready = availability?.key === key;
  const slots = ready ? (availability.data?.slots || []).filter(slot => slot.available && slotSupportsMode(slot, mode)) : [];
  const valid = ready && slots.some(slot => slot.time === time) && (mode === 'In-Person Consultation' || isOnlineMeetingLink(meetingLink));
  const submit = async event => {
    event.preventDefault();
    if (!valid || saving.current || saved) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await api.editAppointmentSchedule(appointment.id, { date, time, duration, appointmentType: mode, meetingLink: mode === 'In-Person Consultation' ? '' : meetingLink.trim(), expectedUpdatedAt: appointment.updatedAt });
      setSaved(true);
      onSaved(result);
    } catch (err) { setError(err.message || 'Unable to update the session.'); setRefresh(value => value + 1); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !busy && onClose()} aria-labelledby="edit-session-title">
    <Box component="form" onSubmit={submit}>
      <DialogTitle id="edit-session-title">Edit scheduled session</DialogTitle>
      <DialogContent dividers><Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">{appointment.patientName} · {appointment.counselorName}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField required type="date" label="Session date (IST)" value={date} disabled={busy} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={event => { setDate(event.target.value); setTime(''); }} />
          <TextField select label="Duration" value={duration} disabled={busy} onChange={event => { setDuration(Number(event.target.value)); setTime(''); }}>{[...new Set([30, 45, 60, 90, appointment.duration || 60])].sort((a, b) => a - b).map(value => <MenuItem key={value} value={value}>{value} minutes</MenuItem>)}</TextField>
        </Box>
        <TextField select label="Session mode" value={mode} disabled={busy} onChange={event => { setMode(event.target.value); setTime(''); }}><MenuItem value="Video Consultation">Online consultation</MenuItem><MenuItem value="In-Person Consultation">In-person consultation · HO</MenuItem></TextField>
        {!ready ? <Stack direction="row" spacing={1}><CircularProgress size={18} /><Typography variant="body2">Checking available times…</Typography></Stack> : availability.error ? <Alert severity="error" action={<Button onClick={() => setRefresh(value => value + 1)}>Retry</Button>}>{availability.error}</Alert> : <>
          <TextField select required label="Available time (IST)" value={slots.some(slot => slot.time === time) ? time : ''} disabled={busy || !slots.length} onChange={event => setTime(event.target.value)}>{slots.map(slot => <MenuItem key={slot.time} value={slot.time}>{slot.time}</MenuItem>)}</TextField>
          {!slots.length && <Alert severity="info">No available times. Choose another date, duration, or mode.</Alert>}
        </>}
        {mode !== 'In-Person Consultation' && <TextField required type="url" label="Zoom or Google Meet link" value={meetingLink} disabled={busy} onChange={event => setMeetingLink(event.target.value)} error={Boolean(meetingLink) && !isOnlineMeetingLink(meetingLink)} helperText="Use a valid HTTPS Zoom or Google Meet link." />}
        <Typography variant="caption" color="text.secondary">Saving notifies the user and counselor. Previous schedule details remain in history.</Typography>
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || !valid || saved}>{busy ? 'Saving…' : 'Save changes'}</Button></DialogActions>
    </Box>
  </Dialog>;
}
