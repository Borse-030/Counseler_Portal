import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import CareWorkflow from '../components/CareWorkflow';
import SessionNotesHistory from '../components/SessionNotesHistory';
import { attendanceLink, isOnlineMeetingLink } from '../utils/sessionAttendance';

export default function SessionRoom({ currentUser }) {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const staffAccount = ['admin', 'counselor'].includes(currentUser.role);
    Promise.all([api.getAppointment(id), staffAccount ? api.getAppointments().catch(() => []) : Promise.resolve([])]).then(([data, history]) => {
      if (!active) return;
      setAppointment(data); setNotes(data.sessionNotes || ''); setMeetingLink(data.meetingLink || '');
      setAppointments(history);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [id, currentUser.role]);
  const assigned = currentUser.role === 'counselor' && currentUser.id === appointment?.counselorId;
  const isAdmin = currentUser.role === 'admin';
  const staff = assigned || isAdmin;
  const canAddNotes = assigned && ['upcoming', 'completed'].includes(appointment?.status);
  const update = async (changes, message) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.updateAppointment(id, changes);
      const updated = await api.getAppointment(id);
      setAppointment(updated); setSuccess(message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const safeLink = attendanceLink(appointment);
  const offline = appointment?.appointmentType === 'In-Person Consultation';
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
        {offline ? <Alert severity="info">Offline session at HO. Attend in person at the scheduled time.</Alert> : <Stack spacing={1}>
          {safeLink && <Button component="a" href={safeLink} target="_blank" rel="noopener noreferrer" variant="contained">Attend session</Button>}
          {!safeLink && appointment.status === 'upcoming' && <Alert severity="warning">The admin needs to add a Zoom or Google Meet link before you can attend this online session.</Alert>}
        </Stack>}
        {isAdmin && !offline && appointment.status === 'upcoming' && <Box>
          <TextField fullWidth required type="url" label="Zoom or Google Meet link" value={meetingLink} disabled={busy} error={Boolean(meetingLink) && !isOnlineMeetingLink(meetingLink)} onChange={e => setMeetingLink(e.target.value)} />
          <Button disabled={busy || !isOnlineMeetingLink(meetingLink) || meetingLink.trim() === appointment.meetingLink} onClick={() => update({ meetingLink: meetingLink.trim() }, 'Meeting link saved.')}>Save meeting link</Button>
        </Box>}
        {staff && <Box>
          <TextField fullWidth multiline minRows={7} label={appointment.appointmentKind === 'discovery' ? 'Discovery notes (internal)' : 'Session notes (internal)'} value={notes} disabled={!canAddNotes || busy} onChange={e => setNotes(e.target.value)} />
          {canAddNotes && <Button disabled={busy || notes === (appointment.sessionNotes || '')} onClick={() => update({ sessionNotes: notes }, 'Notes saved.')}>Save notes</Button>}
        </Box>}
        {staff && <SessionNotesHistory appointment={appointment} appointments={appointments} />}
        {isAdmin && appointment.status === 'upcoming' && <Stack direction="row" spacing={2}>
          <Button disabled={busy} variant="contained" onClick={() => update({ status: 'completed' }, 'Session completed. Feedback is available after counseling sessions.')}>Mark completed</Button>
          <Button disabled={busy} color="error" onClick={() => update({ status: 'cancelled' }, 'Call / session cancelled.')}>Cancel session</Button>
        </Stack>}
        {!staff && appointment.status === 'completed' && appointment.appointmentKind !== 'discovery' && <Alert severity="success">Please share your feedback from the Past journey tab on your dashboard.</Alert>}
      </>}
    </Stack></CardContent></Card>}
    {staff && appointment?.careRequestId && <CareWorkflow currentUser={currentUser} requestId={appointment.careRequestId} />}
  </Stack></Container>;
}
