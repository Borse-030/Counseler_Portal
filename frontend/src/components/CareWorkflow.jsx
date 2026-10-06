import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const freshSession = () => ({ date: todayIST(), time: '', duration: 60, appointmentType: 'Video Consultation', kind: 'session', purpose: '', meetingLink: '' });
const label = status => ({ assigned: 'Admin review', submitted: 'Pending admin review', accepted: 'Registration approved', rejected: 'Rejected', assignment_pending: 'Counselor assignment pending', matched: 'Counselor assigned', pending_admin: 'Legacy session review' }[status] || status.replaceAll('_', ' '));
const liveStages = ['discovery_scheduled', 'discovery_completed', 'matched', 'active'];

function ScheduleRow({ value, onChange, counselorId, disabled }) {
  const [availability, setAvailability] = useState(null);
  useEffect(() => {
    let active = true;
    if (!counselorId || !value.date) return;
    api.getCounselorSlots(counselorId, value.date, value.duration).then(data => {
      if (active) setAvailability({ ...data, key: `${counselorId}/${value.date}/${value.duration}` });
    }).catch(error => { if (active) setAvailability({ error: error.message }); });
    return () => { active = false; };
  }, [counselorId, value.date, value.duration]);
  const ready = availability?.key === `${counselorId}/${value.date}/${value.duration}`;
  const slots = ready ? availability.slots?.filter(slot => slot.available) || [] : [];
  return <Stack spacing={2} sx={{ py: 1 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField fullWidth type="date" label="Date (IST)" value={value.date} disabled={disabled}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={e => onChange({ ...value, date: e.target.value, time: '' })} />
      <TextField fullWidth type="number" label="Duration (minutes)" value={value.duration} disabled={disabled}
        slotProps={{ htmlInput: { min: 10, max: 180, step: 5 } }} onChange={e => onChange({ ...value, duration: Number(e.target.value), time: '' })} />
    </Stack>
    {availability?.error && <Alert severity="error">{availability.error}</Alert>}
    <TextField select fullWidth label="Available time (IST)" value={slots.some(slot => slot.time === value.time) ? value.time : ''} disabled={disabled || !slots.length}
      helperText={ready ? slots.length ? 'Pending proposals also reserve availability.' : availability.message || 'No available times. Choose another date.' : 'Loading availability…'}
      onChange={e => onChange({ ...value, time: e.target.value })}>
      {slots.map(slot => <MenuItem key={slot.time} value={slot.time}>{slot.time}</MenuItem>)}
    </TextField>
    <TextField select label="Session purpose" value={value.kind} disabled={disabled} onChange={e => onChange({ ...value, kind: e.target.value })}>
      <MenuItem value="session">Counseling session</MenuItem><MenuItem value="follow_up">Follow-up call / session</MenuItem>
    </TextField>
    <TextField select label="Format" value={value.appointmentType} disabled={disabled} onChange={e => onChange({ ...value, appointmentType: e.target.value })}>
      <MenuItem value="Video Consultation">Video meeting</MenuItem><MenuItem value="Audio Consultation">Phone call</MenuItem><MenuItem value="In-Person Consultation">In person</MenuItem>
    </TextField>
    <TextField label="Meeting link (optional)" type="url" value={value.meetingLink} disabled={disabled} placeholder="https://…" helperText="Use the BJS meeting link, or contact the user by phone." onChange={e => onChange({ ...value, meetingLink: e.target.value })} />
    <TextField multiline minRows={2} label="Session goal / follow-up reason" value={value.purpose} disabled={disabled} onChange={e => onChange({ ...value, purpose: e.target.value })} />
  </Stack>;
}

export default function CareWorkflow({ currentUser, filter = 3, requestId, onAppointmentsChange, onRequestsChange }) {
  const [requests, setRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState({});
  const [counselorId, setCounselorId] = useState('');
  const [sessions, setSessions] = useState([freshSession()]);
  const [availabilityDate, setAvailabilityDate] = useState(todayIST());
  const [availability, setAvailability] = useState(null);
  const isAdmin = currentUser.role === 'admin';
  const load = useCallback(async () => {
    const [care, apts, staff] = await Promise.all([api.getSessionRequests(), api.getAppointments(), api.getCounselors()]);
    setRequests(care); setAppointments(apts); setCounselors(staff);
    onAppointmentsChange?.(apts); onRequestsChange?.(care);
  }, [onAppointmentsChange, onRequestsChange]);
  useEffect(() => {
    let active = true;
    const refresh = () => load().catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    refresh();
    const interval = setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [load]);
  useEffect(() => {
    if (dialog?.kind !== 'assignment' || !counselorId) return;
    let active = true;
    api.getCounselorSlots(counselorId, availabilityDate).then(data => { if (active) setAvailability(data); })
      .catch(err => { if (active) setAvailability({ message: err.message, slots: [] }); });
    return () => { active = false; };
  }, [dialog?.kind, counselorId, availabilityDate]);
  const act = async (operation, close = false) => {
    setBusy(true); setError(''); setSuccess('');
    try { const result = await operation(); setSuccess(result.message || 'Saved.'); if (close) setDialog(null); await load(); }
    catch (err) { setError(err.message || 'Unable to save.'); }
    finally { setBusy(false); }
  };
  const open = (kind, request, extra = {}) => {
    setError(''); setReason(''); setAvailability(null);
    setCounselorId(request.finalCounselorId || request.assignedCounselorId || '');
    setSessions([freshSession()]);
    setDialog({ kind, request, ...extra });
  };
  const submit = () => {
    const { kind, request } = dialog;
    if (kind === 'registration') return act(() => api.decideSessionRequest(request.id, { decision: dialog.decision, reason }), true);
    if (kind === 'sessions') return act(() => api.scheduleRequestSession(request.id, { sessions }), true);
    if (kind === 'assignment') return act(() => api.assignFinalCounselor(request.id, { counselorId, reason }), true);
  };
  const filtered = requests.filter(r => (!requestId || requestId === r.id) && (filter === 0 ? ['submitted', 'assigned'].includes(r.status) : filter === 1 ? ['accepted', ...liveStages].includes(r.status) : filter === 2 ? r.status === 'rejected' : true));
  const selectedCounselor = counselors.find(c => c.id === counselorId);
  return <Stack spacing={2}>
    <Box><Typography variant="h5" fontWeight={700}>BJS care workflow</Typography>
      <Typography color="text.secondary" variant="body2">Admin registration review → discovery notes → manual counselor assignment → counseling sessions, notes and patient feedback</Typography></Box>
    {error && !dialog && <Alert severity="error">{error}</Alert>}
    {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
    {loading ? <CircularProgress size={24} /> : !filtered.length && <Alert severity="info">
      {isAdmin
        ? 'No registrations in this view.'
          : filter === 0
          ? `No sessions or care cases are assigned to ${currentUser.name || 'your counselor account'}.`
          : 'No requests in this view are assigned to your counselor account.'}
    </Alert>}
    {filtered.map(request => {
      const ownCare = request.finalCounselorId === currentUser.id;
      const related = appointments.filter(a => a.careRequestId === request.id);
      const discoveryCompletedEvent = [...(request.timeline || [])].reverse().find(event => event.status === 'discovery_completed');
      const editableNotes = isAdmin && ['accepted', 'discovery_scheduled', 'discovery_completed'].includes(request.status);
      const showDiscoveryNotes = ['accepted', 'discovery_scheduled', 'discovery_completed'].includes(request.status) || Boolean(request.discoveryNotes);
      const discoveryNotes = notes[request.id] ?? request.discoveryNotes ?? '';
      return <Card key={request.id} variant="outlined"><CardContent><Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" spacing={2}><Typography variant="h6">{request.patientName}</Typography><Stack direction="row" spacing={0.75}><Chip label={label(request.status)} color={request.status === 'rejected' ? 'error' : 'primary'} size="small" />{isAdmin && request.status === 'accepted' && <Chip label="Discovery pending" color="warning" size="small" />}{isAdmin && request.status === 'discovery_completed' && <Chip label="Ready to assign" color="success" size="small" />}</Stack></Stack>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{request.intakeNotes || 'No additional counseling requirements provided.'}</Typography>
        <Typography variant="body2" color="text.secondary">{request.preferredLanguage || 'Language not specified'} · {request.preferredFormat || 'Format to be confirmed'}</Typography>
        <Typography variant="body2">Registration review: {['submitted', 'assigned'].includes(request.status) ? 'Awaiting admin' : request.status === 'rejected' ? 'Declined' : 'Complete'} · Counselor: {request.finalCounselorName || 'Not assigned yet'}</Typography>
        {request.patientMobile && <Button component="a" href={`tel:${request.patientMobile.replace(/[^+\d]/g, '')}`} sx={{ alignSelf: 'flex-start' }}>Call user: {request.patientMobile}</Button>}
        {request.rejectedReason && <Alert severity="error">{request.rejectedReason}</Alert>}
        {!!request.reviews?.length && <Box><Typography variant="subtitle2">Registration reviews</Typography>{request.reviews.map((review, i) => <Typography variant="body2" key={review._id || i}>{review.actorName} ({review.actorRole}) · {review.decision === 'accepted' ? 'Approved' : 'Rejected'} · {new Date(review.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{review.reason ? ` — ${review.reason}` : ''}</Typography>)}</Box>}
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {isAdmin && ['submitted', 'assigned', 'rejected'].includes(request.status) && <>
            <Button disabled={busy} variant="contained" onClick={() => open('registration', request, { decision: 'accepted' })}>Approve registration</Button>
            <Button disabled={busy} color="error" onClick={() => open('registration', request, { decision: 'rejected' })}>Reject registration</Button>
          </>}
          {isAdmin && request.status === 'discovery_completed' && <Button disabled={busy} variant="outlined" onClick={() => open('assignment', request)}>Assign counselor</Button>}
        </Stack>
        {showDiscoveryNotes && <Box>
          {editableNotes && <Alert severity={request.status === 'accepted' ? 'warning' : 'success'}>{request.status === 'accepted' ? 'Discovery call not done yet. When complete, add the notes and mark it done below.' : `Discovery completed${discoveryCompletedEvent?.at ? ` on ${new Date(discoveryCompletedEvent.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}. You can update the notes below.`}</Alert>}
          <TextField fullWidth multiline minRows={3} label="Discovery call notes (internal)" value={discoveryNotes} disabled={!editableNotes || busy} onChange={e => setNotes(previous => ({ ...previous, [request.id]: e.target.value }))} />
          {editableNotes && <Button disabled={busy || !discoveryNotes.trim()} onClick={() => act(() => api.saveDiscoveryNotes(request.id, discoveryNotes))}>{request.status === 'accepted' ? 'Save notes & mark discovery done' : 'Update discovery notes'}</Button>}
        </Box>}
        {request.finalCounselorId && ['matched', 'active'].includes(request.status) && ownCare && <Button disabled={busy} variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => open('sessions', request)}>Schedule sessions / follow-ups</Button>}
        {!!related.length && <Box><Divider sx={{ mb: 1 }} /><Typography variant="subtitle2">Calls, sessions and feedback</Typography>
        {related.map(appointment => <Box key={appointment.id} sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight={600}>{appointment.appointmentKind === 'discovery' ? 'Discovery' : appointment.appointmentKind === 'follow_up' ? 'Follow-up' : 'Session'} · {appointment.date} {appointment.time} IST · {appointment.duration} min</Typography>
            <Typography variant="body2">{appointment.counselorName} · {label(appointment.status)}</Typography>
            {appointment.purpose && <Typography variant="body2">Goal: {appointment.purpose}</Typography>}
            {appointment.reviewReason && <Typography variant="body2">Admin note: {appointment.reviewReason}</Typography>}
            {appointment.sessionNotes && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>Session notes: {appointment.sessionNotes}</Typography>}
            {!!appointment.sessionNoteHistory?.length && <Box component="details" sx={{ mt: 0.5 }}><Typography component="summary" variant="caption" sx={{ cursor: 'pointer' }}>Previous note versions ({appointment.sessionNoteHistory.length})</Typography>{appointment.sessionNoteHistory.map((entry, i) => <Typography key={`${entry.at}-${i}`} variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{new Date(entry.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {entry.actorName}: {entry.notes || '(empty note)'}</Typography>)}</Box>}
            {appointment.review?.rating && <Typography variant="body2">Feedback: {appointment.review.rating}/5 — {appointment.review.reviewText || 'No written feedback'}</Typography>}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {['upcoming', 'completed'].includes(appointment.status) && <Button component={Link} to={`/session/${appointment.id}`} size="small">Open call / notes</Button>}
            </Stack>
          </Box>)}
        </Box>}
        {isAdmin && request.status === 'active' && <Button disabled={busy} color="success" sx={{ alignSelf: 'flex-start' }} onClick={() => act(() => api.closeSessionRequest(request.id))}>Close completed care case</Button>}
        {!!request.timeline?.length && <Box component="details"><Typography component="summary" variant="body2" sx={{ cursor: 'pointer' }}>Care history ({request.timeline.length})</Typography>{request.timeline.map((event, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{new Date(event.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {event.actorName} · {event.note}</Typography>)}</Box>}
      </Stack></CardContent></Card>;
    })}
    <Dialog open={!!dialog} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>{dialog?.kind === 'registration' ? `${dialog.decision === 'accepted' ? 'Approve' : 'Reject'} registration` : dialog?.kind === 'assignment' ? 'Assign counselor' : 'Schedule counseling sessions'}</DialogTitle>
      <DialogContent dividers><Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography variant="subtitle2">{dialog?.request.patientName}</Typography>
        {dialog?.kind === 'registration' && <>
          <Alert severity="info">Admin decision is recorded in the care history. Approved patients can proceed to discovery.</Alert>
          <TextField multiline minRows={2} label={dialog.decision === 'rejected' ? 'Reason (required)' : 'Review note (optional)'} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
        </>}
        {dialog?.kind === 'assignment' && <>
          <Alert severity="info">Match the user’s needs with the counselor’s skills, language and availability. Save discovery notes before assigning ongoing care.</Alert>
          <TextField select fullWidth label="Counselor" value={counselorId} disabled={busy} onChange={e => { setCounselorId(e.target.value); setAvailability(null); }}>
            {counselors.map(c => <MenuItem key={c.id} value={c.id}>{c.name}{c.id === currentUser.id ? ' (myself)' : ''} · {c.specialty || 'General counseling'}</MenuItem>)}
          </TextField>
          {selectedCounselor && <Box><Typography variant="body2">{selectedCounselor.experience || 0} years · {(selectedCounselor.languages || []).join(', ')}</Typography><Typography variant="body2">{selectedCounselor.credentials}</Typography><Typography variant="body2" color="text.secondary">{selectedCounselor.bio}</Typography></Box>}
          <TextField type="date" label="Check availability (IST)" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} value={availabilityDate} onChange={e => { setAvailabilityDate(e.target.value); setAvailability(null); }} />
          <Typography variant="body2">{availability ? `${availability.slots?.filter(s => s.available).map(s => s.time).join(', ') || availability.message || 'No slots available on this date.'}` : 'Select a counselor to check availability.'}</Typography>
          <TextField multiline minRows={2} label="Skills match / assignment reason" value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
        </>}
        {dialog?.kind === 'sessions' && <>
          {dialog.kind === 'sessions' && <Alert severity="info">Sessions are confirmed when saved. The assigned counselor can add notes and mark each session complete afterward.</Alert>}
          {sessions.map((session, index) => <Box key={index}>
            <Typography variant="subtitle2">Session {index + 1}</Typography>
            <ScheduleRow value={session} disabled={busy} counselorId={dialog.request.finalCounselorId} onChange={value => setSessions(previous => previous.map((item, i) => i === index ? value : item))} />
            {sessions.length > 1 && <Button disabled={busy} color="error" onClick={() => setSessions(previous => previous.filter((_, i) => i !== index))}>Remove session</Button>}
            <Divider sx={{ mt: 2 }} />
          </Box>)}
          {dialog.kind === 'sessions' && <Button disabled={busy || sessions.length >= 12} onClick={() => setSessions(previous => [...previous, freshSession()])}>Add another session</Button>}
        </>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button variant="contained" onClick={submit} disabled={busy || (dialog?.decision === 'rejected' && !reason.trim()) || (dialog?.kind === 'assignment' && !counselorId) || (dialog?.kind === 'sessions' && sessions.some(s => !s.date || !s.time))}>{busy ? 'Saving…' : dialog?.kind === 'sessions' ? 'Confirm schedule' : 'Confirm'}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
