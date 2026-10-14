import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { todayIST } from '../../../shared/counsellingFramework.mjs';

export default function CounselorDeactivationDialog({ counselor, onClose, onComplete }) {
  const [review, setReview] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [choices, setChoices] = useState({});
  const [changes, setChanges] = useState({});
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setReview(null); setCheck(null);
      try {
        const data = await api.getCounselorDeactivationReview(counselor.id);
        if (active) { setReview(data); setChoices({}); setChanges({}); setCheck(null); }
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [counselor.id, refresh]);
  const payload = () => ({
    version: review.version,
    assignments: review.groups.map(group => ({ key: group.key, counselorId: choices[group.key] })),
    scheduleChanges: Object.entries(changes).map(([id, value]) => ({ id, ...value })),
  });
  const completeChoices = Boolean(review && !review.blockers.length && review.groups.every(group => choices[group.key]));
  const verify = async () => {
    if (!completeChoices || saving.current) return;
    saving.current = true; setBusy(true); setError(''); setCheck(null);
    try { setCheck(await api.checkCounselorTransfers(counselor.id, payload())); }
    catch (err) { setError(err.message); }
    finally { saving.current = false; setBusy(false); }
  };
  const submit = async () => {
    if (!completeChoices || saving.current || (review.groups.length && !check?.valid)) return;
    saving.current = true; setBusy(true); setError('');
    try { const result = await api.transferAndDeactivateCounselor(counselor.id, payload()); onComplete(result); }
    catch (err) { setError(err.message); setCheck(null); }
    finally { saving.current = false; setBusy(false); }
  };
  const select = (key, value) => { setChoices(previous => ({ ...previous, [key]: value })); setCheck(null); };
  const changeSchedule = (session, field, value) => {
    setChanges(previous => ({ ...previous, [session.id]: { date: session.date, time: session.time, ...previous[session.id], [field]: value } }));
    setCheck(null);
  };
  return <Dialog open fullWidth maxWidth="md" onClose={() => !busy && onClose()} aria-labelledby="deactivate-counselor-title">
    <DialogTitle id="deactivate-counselor-title">Review before deactivating {counselor.name}</DialogTitle>
    <DialogContent dividers><Stack spacing={2}>
      {error && <Alert severity="error" action={<Button color="inherit" disabled={busy} onClick={() => { setError(''); setRefresh(value => value + 1); }}>Refresh review</Button>}>{error}</Alert>}
      {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress aria-label="Checking pending sessions" /></Box> : review && <>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}><Chip label={`${review.sessionCount} pending sessions`} color={review.sessionCount ? 'warning' : 'default'} /><Chip label={`${review.caseCount} active cases`} /></Stack>
        <Typography variant="body2" color="text.secondary">Choose replacement counselors for the pending sessions and ongoing cases. Completed sessions keep their original counselor.</Typography>
        {!!review.blockers.length && <Alert severity="warning">{review.blockers.length} running or past session(s) still need outcomes. Record their outcomes before transferring and deactivating.</Alert>}
        {review.blockers.map(item => <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}><Typography variant="body2" fontWeight={700}>{item.patientName} · {item.date} · {item.time} IST</Typography><Button component={Link} to={`/session/${item.id}`} onClick={onClose} size="small">Review session outcome</Button></Paper>)}
        {!review.groups.length && !review.blockers.length && <Alert severity="success">No pending sessions or active cases. This counselor can be deactivated.</Alert>}
        {!!review.groups.length && !review.replacements.length && <Alert severity="warning">No other active, approved counselors are available. Activate or approve a replacement before continuing.</Alert>}
        {review.groups.length > 1 && <TextField select label="Use one counselor for all cases" value="" disabled={busy || !review.replacements.length} onChange={event => { setChoices(Object.fromEntries(review.groups.map(group => [group.key, event.target.value]))); setCheck(null); }}><MenuItem value="" disabled>Select to apply a replacement to all cases</MenuItem>{review.replacements.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>}
        {review.groups.map(group => <Paper key={group.key} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Box><Typography fontWeight={750}>{group.patientName}</Typography><Typography variant="caption" color="text.secondary">{group.sessions.length} pending session(s){group.hasActiveCase ? ' · Ongoing case will move to the replacement' : ''}{group.preferredLanguage ? ` · ${group.preferredLanguage}` : ''}</Typography></Box>
            <TextField select required fullWidth size="small" label="Replacement counselor" value={choices[group.key] || ''} disabled={busy} onChange={event => select(group.key, event.target.value)}><MenuItem value="" disabled>Select a counselor</MenuItem>{review.replacements.map(item => <MenuItem key={item.id} value={item.id}>{item.name}{item.specialty ? ` · ${item.specialty}` : ''}{item.languages?.length ? ` · ${item.languages.join(', ')}` : ''}</MenuItem>)}</TextField>
            {group.sessions.map(session => <Box key={session.id} sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{session.duration} min · {session.appointmentType} · {session.status === 'pending_admin' ? 'Awaiting admin review' : 'Scheduled'}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1 }}>
                <TextField size="small" type="date" label="Transfer date (IST)" value={changes[session.id]?.date ?? session.date} disabled={busy} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={event => changeSchedule(session, 'date', event.target.value)} />
                <TextField size="small" type="time" label="Transfer time (IST)" value={changes[session.id]?.time ?? session.time} disabled={busy} slotProps={{ inputLabel: { shrink: true } }} onChange={event => changeSchedule(session, 'time', event.target.value)} />
              </Box>
              {session.appointmentType !== 'In-Person Consultation' && <TextField fullWidth size="small" type="url" label="Meeting link for replacement counselor" value={changes[session.id]?.meetingLink ?? session.meetingLink} disabled={busy} sx={{ mt: 1.5 }} helperText="Confirm that the replacement can host this Zoom or Google Meet meeting." onChange={event => changeSchedule(session, 'meetingLink', event.target.value)} />}
            </Box>)}
          </Stack>
        </Paper>)}
        {check && (check.valid ? <Alert severity="success">All proposed transfers passed the availability checks.</Alert> : <Alert severity="error"><Typography variant="body2" fontWeight={700}>Adjust these transfers before continuing:</Typography>{check.conflicts.map((item, index) => <Typography key={`${item.id}-${index}`} variant="body2">{item.patientName}{item.date ? ` · ${item.date} ${item.time} IST` : ''}: {item.message}</Typography>)}</Alert>)}
      </>}
    </Stack></DialogContent>
    <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, py: 2 }}>
      <Button disabled={busy} onClick={onClose}>Cancel</Button>
      {!!review?.groups.length && <Button variant="outlined" disabled={busy || loading || !completeChoices} onClick={verify}>Check transfers</Button>}
      <Button color="error" variant="contained" disabled={busy || loading || !completeChoices || (Boolean(review?.groups.length) && !check?.valid)} onClick={submit}>{busy ? 'Processing…' : review?.groups.length ? 'Transfer work and deactivate' : 'Deactivate counselor'}</Button>
    </DialogActions>
  </Dialog>;
}
