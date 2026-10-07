import { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { outcomeOptions, resolvedStatuses, statusLabel } from '../utils/sessionOutcome';

export default function SessionOutcomeDialog({ appointment, isAdmin = false, onClose, onSaved }) {
  const correction = resolvedStatuses.includes(appointment.status);
  const [outcome, setOutcome] = useState(correction ? appointment.status : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const save = async () => {
    if (saving.current || !outcome || (correction && (!reason.trim() || outcome === appointment.status))) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await api.recordSessionOutcome(appointment.id, { outcome, reason: reason.trim(), expectedStatus: appointment.status, expectedRecordedAt: appointment.outcomeRecordedAt || null });
      onSaved(result.appointment);
    } catch (err) { setError(err.message || 'Unable to record session outcome.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
    <DialogTitle>{correction ? 'Correct session outcome' : 'Confirm session outcome'}</DialogTitle>
    <DialogContent dividers><Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="body2">{appointment.patientName} · {appointment.counselorName}<br />{appointment.date} · {appointment.time} IST · {appointment.duration || 60} minutes</Typography>
      <Alert severity="info">Confirm who attended. Only a completed counseling session requests user feedback. Session notes can be added separately.</Alert>
      {correction && <Typography variant="body2">Recorded outcome: {statusLabel(appointment.status)}. This correction will be kept in the outcome history.</Typography>}
      <TextField select required fullWidth label="Session outcome" value={outcome} disabled={busy || (correction && !isAdmin)} onChange={e => setOutcome(e.target.value)}>{outcomeOptions.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>
      <TextField fullWidth multiline minRows={2} required={correction} label={correction ? 'Reason for correction' : 'Attendance note (optional)'} helperText="Keep clinical details in session notes." value={reason} disabled={busy} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} />
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !outcome || (correction && (!isAdmin || !reason.trim() || outcome === appointment.status))} onClick={save}>{busy ? 'Saving…' : correction ? 'Save correction' : 'Confirm outcome'}</Button></DialogActions>
  </Dialog>;
}
