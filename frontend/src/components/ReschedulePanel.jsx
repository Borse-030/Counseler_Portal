import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { canRequestReschedule, missedStatuses, pendingReschedule } from '../utils/rescheduling';
import { outcomeOptions, statusLabel } from '../utils/sessionOutcome';
import { isOnlineMeetingLink } from '../utils/sessionAttendance';

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function RequestDialog({ appointment, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const submit = async () => {
    if (saving.current || !reason.trim() || reason.length > 1000 || (preferredDate && preferredDate < todayIST())) return;
    saving.current = true; setBusy(true); setError('');
    try { const result = await api.requestReschedule(appointment.id, { reason: reason.trim(), preferredDate, preferredTime: preferredTime.trim() }); onSaved(result); }
    catch (err) { setError(err.message || 'Unable to send the request.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Dialog open onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
    <DialogTitle>Request rescheduling</DialogTitle><DialogContent dividers><Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="body2">{appointment.patientName} · {appointment.counselorName}<br />Original session: {appointment.date} · {appointment.time} IST</Typography>
      <Alert severity="info">The admin will review this request and confirm a new available time. Your preferences do not reserve a slot.</Alert>
      <TextField autoFocus fullWidth required multiline minRows={3} label="Reason for rescheduling" helperText="Explain the attendance issue. Keep clinical details in session notes." value={reason} disabled={busy} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} />
      <TextField fullWidth type="date" label="Preferred date (optional, IST)" value={preferredDate} disabled={busy} onChange={e => setPreferredDate(e.target.value)} error={Boolean(preferredDate) && preferredDate < todayIST()} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} />
      <TextField fullWidth label="Preferred time (optional)" placeholder="For example, afternoon after 2 pm IST" value={preferredTime} disabled={busy} onChange={e => setPreferredTime(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !reason.trim() || reason.length > 1000 || (Boolean(preferredDate) && preferredDate < todayIST())} onClick={submit}>{busy ? 'Sending…' : 'Send request to admin'}</Button></DialogActions>
  </Dialog>;
}

function ReviewDialog({ appointment, onClose, onSaved }) {
  const request = appointment.rescheduleRequest;
  const [action, setAction] = useState('approve');
  const [date, setDate] = useState(request.preferredDate >= todayIST() ? request.preferredDate : todayIST());
  const [time, setTime] = useState('');
  const [outcome, setOutcome] = useState(missedStatuses.includes(appointment.status) ? appointment.status : '');
  const [meetingLink, setMeetingLink] = useState('');
  const [response, setResponse] = useState('');
  const [availability, setAvailability] = useState(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const offline = appointment.appointmentType === 'In-Person Consultation';
  const recovering = request.status === 'scheduling';
  const key = `${date}/${retry}`;
  useEffect(() => {
    if (action !== 'approve' || recovering || !date) return;
    let active = true;
    api.getCounselorSlots(appointment.counselorId, date, appointment.duration || 60, appointment.appointmentType)
      .then(data => { if (active) setAvailability({ ...data, key }); })
      .catch(err => { if (active) setAvailability({ key, error: err.message }); });
    return () => { active = false; };
  }, [action, recovering, date, key, appointment.counselorId, appointment.duration, appointment.appointmentType]);
  const ready = availability?.key === key;
  const slots = ready ? availability.slots?.filter(slot => slot.available) || [] : [];
  const valid = action === 'decline' ? Boolean(response.trim()) : recovering || (outcome && slots.some(slot => slot.time === time) && date >= todayIST() && (offline || isOnlineMeetingLink(meetingLink)));
  const submit = async () => {
    if (saving.current || !valid) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await api.reviewReschedule(appointment.id, { action, requestId: request.id, response: response.trim(), date, time, missedOutcome: outcome, meetingLink: offline ? '' : meetingLink.trim() });
      onSaved(result);
    } catch (err) {
      setError(err.message || 'Unable to review this request.');
      if (recovering) {
        // An interrupted claim may have been released or finalized by another admin.
        try {
          const latest = await api.getAppointment(appointment.id);
          if (latest.rescheduleRequest?.status !== 'scheduling') onSaved({ appointment: latest, message: err.message });
        } catch { /* Keep the request open so recovery can be retried. */ }
      } else { setTime(''); setRetry(value => value + 1); }
    }
    finally { saving.current = false; setBusy(false); }
  };
  return <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="sm"><DialogTitle>Review rescheduling request</DialogTitle><DialogContent dividers><Stack spacing={2}>
    {error && <Alert severity="error">{error}</Alert>}
    <Box><Typography fontWeight={650}>{appointment.patientName} · {appointment.counselorName}</Typography><Typography variant="body2" color="text.secondary">Original: {appointment.date} · {appointment.time} IST · {statusLabel(appointment.status)}</Typography></Box>
    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography variant="caption">Requested by {request.requesterName} ({request.requesterRole === 'counselor' ? 'counselor' : 'user'})</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{request.reason}</Typography>{(request.preferredDate || request.preferredTime) && <Typography variant="body2" sx={{ mt: 1 }}>Preference: {request.preferredDate} {request.preferredTime} (IST)</Typography>}</Box>
    {recovering ? <Alert severity="info">Scheduling was started. Retry to recover the saved replacement. If another admin is still scheduling, refresh shortly.</Alert> : <>
      <TextField select label="Decision" value={action} disabled={busy} onChange={e => { setAction(e.target.value); setError(''); }}><MenuItem value="approve">Approve and schedule replacement</MenuItem><MenuItem value="decline">Decline request</MenuItem></TextField>
      {action === 'approve' && <>
        {!missedStatuses.includes(appointment.status) && <TextField required select label="Confirm attendance outcome" value={outcome} disabled={busy} onChange={e => setOutcome(e.target.value)}>{outcomeOptions.filter(option => missedStatuses.includes(option.value)).map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>}
        <Typography variant="body2">Same counselor · {offline ? 'Offline at HO' : 'Online'} · {appointment.duration || 60} minutes. The original missed session stays in history.</Typography>
        <TextField required type="date" label="Replacement date (IST)" value={date} disabled={busy} onChange={e => { setDate(e.target.value); setTime(''); }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} />
        <TextField required select label="Available time (IST)" value={slots.some(slot => slot.time === time) ? time : ''} disabled={busy || !ready || !slots.length} onChange={e => setTime(e.target.value)} helperText={!ready ? 'Checking availability…' : availability.error || (slots.length ? 'The full session must fit the counselor’s availability.' : availability.message || 'No available times. Choose another date.')}>
          {slots.map(slot => <MenuItem key={slot.time} value={slot.time}>{slot.time}</MenuItem>)}
        </TextField>
        {!offline && <TextField required type="url" label="Zoom or Google Meet link" value={meetingLink} disabled={busy} onChange={e => setMeetingLink(e.target.value)} error={Boolean(meetingLink) && !isOnlineMeetingLink(meetingLink)} />}
      </>}
      <TextField required={action === 'decline'} multiline minRows={2} label={action === 'decline' ? 'Reason for declining' : 'Response to both parties (optional)'} value={response} disabled={busy} onChange={e => setResponse(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} />
    </>}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" color={action === 'decline' ? 'error' : 'primary'} disabled={busy || !valid} onClick={submit}>{busy ? 'Saving…' : recovering ? 'Retry scheduling' : action === 'decline' ? 'Decline request' : 'Approve and schedule'}</Button></DialogActions></Dialog>;
}

export default function ReschedulePanel({ appointment, currentUser, onUpdated, compact = false, allowRequest = true }) {
  const [open, setOpen] = useState(false);
  const request = appointment.rescheduleRequest;
  const isAdmin = currentUser.role === 'admin';
  const participant = (currentUser.role === 'counselor' && currentUser.id === appointment.counselorId) || (['patient', 'user'].includes(currentUser.role) && currentUser.id === appointment.patientId);
  const eligible = canRequestReschedule(appointment);
  const pending = pendingReschedule(appointment);
  if (!eligible && !request && !appointment.rescheduledFromId) return null;
  const saved = result => { onUpdated?.(result); setOpen(false); };
  return <Box sx={{ mt: compact ? 0.5 : 1, maxWidth: '100%', overflowWrap: 'anywhere' }}>
    <Stack spacing={0.75} sx={{ alignItems: compact ? 'flex-end' : 'flex-start' }}>
      {appointment.rescheduledFromId && <Button size="small" component={Link} to={`/session/${appointment.rescheduledFromId}`}>View original missed session</Button>}
      {pending && <Chip size="small" color="warning" variant="outlined" label={request.status === 'scheduling' ? 'Scheduling replacement' : 'Rescheduling requested'} />}
      {request?.status === 'declined' && <Typography variant="caption" color="text.secondary">Request declined: {request.response}</Typography>}
      {request?.status === 'scheduled' && <Button size="small" component={Link} to={`/session/${request.replacementId}`}>Replacement · {request.replacementDate} · {request.replacementTime} IST</Button>}
      {allowRequest && participant && eligible && !pending && request?.status !== 'scheduled' && <Button size="small" variant="outlined" onClick={() => setOpen(true)}>{request?.status === 'declined' ? 'Request again' : 'Request rescheduling'}</Button>}
      {isAdmin && pending && <Button size="small" variant="contained" onClick={() => setOpen(true)}>Review rescheduling</Button>}
      {!compact && request && <Box><Typography variant="body2">Requested by {request.requesterName} · {request.reason}</Typography>{request.response && request.status !== 'declined' && <Typography variant="body2">Admin response: {request.response}</Typography>}</Box>}
      {!compact && !!appointment.rescheduleHistory?.length && <Box component="details"><Typography component="summary" variant="caption" sx={{ cursor: 'pointer' }}>Rescheduling history</Typography>{appointment.rescheduleHistory.map((entry, i) => <Typography key={i} variant="body2" sx={{ mt: 0.75, overflowWrap: 'anywhere' }}>{entry.status === 'pending' ? 'Requested' : entry.status === 'scheduled' ? 'Replacement scheduled' : 'Declined'} · {entry.reviewerName || entry.requesterName} · {new Date(entry.reviewedAt || entry.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {entry.response || entry.reason}</Typography>)}</Box>}
    </Stack>
    {open && (isAdmin ? <ReviewDialog appointment={appointment} onClose={() => setOpen(false)} onSaved={saved} /> : <RequestDialog appointment={appointment} onClose={() => setOpen(false)} onSaved={saved} />)}
  </Box>;
}
