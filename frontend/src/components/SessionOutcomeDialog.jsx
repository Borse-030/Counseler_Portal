import { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { outcomeOptions, resolvedStatuses, statusLabel } from '../utils/sessionOutcome';
import { missedStatuses, pendingReschedule } from '../utils/rescheduling';
import { submitSessionOutcome } from '../utils/submitSessionOutcome';

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function SessionOutcomeDialog({ appointment, isAdmin = false, onClose, onSaved }) {
  const correction = resolvedStatuses.includes(appointment.status);
  const [outcome, setOutcome] = useState(correction ? appointment.status : '');
  const [reason, setReason] = useState('');
  const [rescheduleChoice, setRescheduleChoice] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [recordedAppointment, setRecordedAppointment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const current = recordedAppointment || appointment;
  const missed = missedStatuses.includes(outcome);
  const existingRequest = pendingReschedule(current) || current.rescheduleRequest?.status === 'scheduled';
  const askReschedule = missed && !isAdmin && !existingRequest;
  const requestReschedule = askReschedule && rescheduleChoice === 'yes';
  const invalid = !outcome || (correction && (!isAdmin || !reason.trim() || outcome === appointment.status)) ||
    (askReschedule && !rescheduleChoice) || (requestReschedule && (!reason.trim() || (preferredDate && preferredDate < todayIST())));
  const close = () => {
    if (saving.current) return;
    if (recordedAppointment) onSaved(recordedAppointment, 'Session outcome recorded. The rescheduling request was not sent; you can try again from session history.');
    else onClose();
  };
  const save = async () => {
    if (saving.current || invalid) return;
    saving.current = true; setBusy(true); setError('');
    let recorded = recordedAppointment;
    try {
      const updated = await submitSessionOutcome({ appointment, recordedAppointment, outcome, reason, reschedule: requestReschedule, preferredDate, preferredTime }, api,
        saved => { recorded = saved; setRecordedAppointment(saved); });
      onSaved(updated, pendingReschedule(updated) ? 'Session outcome recorded. Rescheduling is awaiting admin review.' : 'Session outcome recorded.');
    } catch (err) { setError(recorded ? `The outcome was saved, but the rescheduling request could not be sent. Retry below or close and try later. ${err.message || ''}` : err.message || 'Unable to record session outcome.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Dialog open onClose={close} fullWidth maxWidth="sm">
    <DialogTitle>{correction ? 'Correct session outcome' : 'Confirm session outcome'}</DialogTitle>
    <DialogContent dividers><Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="body2">{appointment.patientName} · {appointment.counselorName}<br />{appointment.date} · {appointment.time} IST · {appointment.duration || 60} minutes</Typography>
      <Alert severity="info">Confirm who attended. Only a completed counseling session requests user feedback. Session notes can be added separately.</Alert>
      {correction && <Typography variant="body2">Recorded outcome: {statusLabel(appointment.status)}. This correction will be kept in the outcome history.</Typography>}
      <TextField select required fullWidth label="Session outcome" value={outcome} disabled={busy || Boolean(recordedAppointment) || (correction && !isAdmin)} onChange={e => { setOutcome(e.target.value); if (!missedStatuses.includes(e.target.value)) { setRescheduleChoice(''); setPreferredDate(''); setPreferredTime(''); } }}>{outcomeOptions.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>
      {askReschedule && <FormControl required disabled={busy || Boolean(recordedAppointment)}>
        <FormLabel id="outcome-rescheduling-label">Request rescheduling?</FormLabel>
        <RadioGroup aria-labelledby="outcome-rescheduling-label" value={rescheduleChoice} onChange={e => setRescheduleChoice(e.target.value)}>
          <FormControlLabel value="yes" control={<Radio />} label="Yes, ask admin to reschedule" />
          <FormControlLabel value="no" control={<Radio />} label="No, record the outcome only" />
        </RadioGroup>
      </FormControl>}
      {missed && existingRequest && <Alert severity="info">{current.rescheduleRequest.status === 'scheduled' ? 'A replacement session is already scheduled.' : 'A rescheduling request is already awaiting admin review.'}</Alert>}
      <TextField fullWidth multiline minRows={2} required={correction || requestReschedule} label={correction ? 'Reason for correction' : requestReschedule ? 'Reason for rescheduling' : 'Attendance note (optional)'} helperText="Keep clinical details in session notes." value={reason} disabled={busy} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} />
      {requestReschedule && <>
        <Typography variant="body2" color="text.secondary">The admin will review your request and confirm a new available time. Preferences do not reserve a slot.</Typography>
        <TextField fullWidth type="date" label="Preferred date (optional, IST)" value={preferredDate} disabled={busy} error={Boolean(preferredDate) && preferredDate < todayIST()} onChange={e => setPreferredDate(e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} />
        <TextField fullWidth label="Preferred time (optional)" placeholder="For example, afternoon after 2 pm IST" value={preferredTime} disabled={busy} onChange={e => setPreferredTime(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
      </>}
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={close}>{recordedAppointment ? 'Close' : 'Cancel'}</Button><Button variant="contained" disabled={busy || invalid} onClick={save}>{busy ? 'Saving…' : recordedAppointment ? 'Retry rescheduling request' : requestReschedule ? 'Confirm & request rescheduling' : correction ? 'Save correction' : 'Confirm outcome'}</Button></DialogActions>
  </Dialog>;
}
