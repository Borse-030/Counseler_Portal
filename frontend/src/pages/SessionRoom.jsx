import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import CareWorkflow from '../components/CareWorkflow';

export default function SessionRoom({ currentUser }) {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [notes, setNotes] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api.getAppointment(id).then(data => {
      if (!active) return;
      setAppointment(data); setNotes(data.sessionNotes || ''); setMeetingLink(data.meetingLink || '');
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [id]);
  const assigned = currentUser.role === 'counselor' && currentUser.id === appointment?.counselorId;
  const staff = assigned || currentUser.role === 'admin';
  const update = async (changes, message) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.updateAppointment(id, changes);
      const updated = await api.getAppointment(id);
      setAppointment(updated); setSuccess(message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const safeLink = /^https:\/\//i.test(appointment?.meetingLink || '') ? appointment.meetingLink : '';
  return <Container maxWidth="lg" sx={{ py: 4 }}><Stack spacing={3}>
    <Button component={Link} to={currentUser.role === 'admin' ? '/admin' : '/dashboard'} sx={{ alignSelf: 'flex-start' }}>Back to dashboard</Button>
    {error && <Alert severity="error">{error}</Alert>}
    {success && <Alert severity="success">{success}</Alert>}
    {!appointment && !error && <CircularProgress />}
    {appointment && <Card><CardContent><Stack spacing={2}>
      <Typography variant="overline" color="primary">BJS internal counseling</Typography>
      <Typography variant="h4">{appointment.appointmentKind === 'discovery' ? 'Discovery call' : appointment.appointmentKind === 'follow_up' ? 'Follow-up call / session' : 'Counseling session'}</Typography>
      <Typography>{appointment.patientName} · {appointment.counselorName}</Typography>
      <Typography color="text.secondary">{appointment.date} · {appointment.time} IST · {appointment.duration} minutes · {appointment.status.replaceAll('_', ' ')}</Typography>
      {appointment.status === 'pending_admin' || appointment.status === 'rejected' ? <Alert severity="warning">This session is not confirmed. {appointment.reviewReason}</Alert> : <>
        {appointment.appointmentType === 'In-Person Consultation' ? <Alert severity="info">Location: {appointment.clinicAddress || 'The BJS care team will confirm the meeting location.'}</Alert> : <Stack spacing={1}>
          {safeLink && appointment.status === 'upcoming' && <Button component="a" href={safeLink} target="_blank" rel="noopener noreferrer" variant="contained">Open meeting</Button>}
          {staff && appointment.patientMobile && appointment.status === 'upcoming' && <Button component="a" href={`tel:${appointment.patientMobile.replace(/[^+\d]/g, '')}`} variant="outlined">Call user: {appointment.patientMobile}</Button>}
          {!safeLink && <Alert severity="info">The counselor will contact the user by phone or add a BJS meeting link here.</Alert>}
        </Stack>}
        {staff && appointment.status === 'upcoming' && <Box>
          <TextField fullWidth type="url" label="BJS meeting link (HTTPS)" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
          <Button disabled={busy} onClick={() => update({ meetingLink }, 'Meeting link saved.')}>Save meeting link</Button>
        </Box>}
        {staff && <Box>
          <TextField fullWidth multiline minRows={7} label={appointment.appointmentKind === 'discovery' ? 'Discovery notes (internal)' : 'Session notes (internal)'} value={notes} disabled={!assigned || busy} onChange={e => setNotes(e.target.value)} />
          {assigned && <Button disabled={busy} onClick={() => update({ sessionNotes: notes }, 'Notes saved.')}>Save notes</Button>}
        </Box>}
        {staff && appointment.status === 'upcoming' && <Stack direction="row" spacing={2}>
          <Button disabled={busy} variant="contained" onClick={() => update({ ...(assigned ? { sessionNotes: notes } : {}), status: 'completed' }, 'Call / session completed. Feedback is available after counseling sessions.')}>Save and mark completed</Button>
          <Button disabled={busy} color="error" onClick={() => update({ status: 'cancelled' }, 'Call / session cancelled.')}>Cancel session</Button>
        </Stack>}
        {!staff && appointment.status === 'completed' && appointment.appointmentKind !== 'discovery' && <Alert severity="success">Please share your feedback from the Past journey tab on your dashboard.</Alert>}
      </>}
    </Stack></CardContent></Card>}
    {staff && appointment?.careRequestId && <CareWorkflow currentUser={currentUser} requestId={appointment.careRequestId} />}
  </Stack></Container>;
}
