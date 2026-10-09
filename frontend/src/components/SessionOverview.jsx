import ReschedulePanel from './ReschedulePanel';
import { pendingReschedule } from '../utils/rescheduling';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import useSessionClock from '../hooks/useSessionClock';
import { feedbackEligible, feedbackLabel, hasFeedback, sessionStatus, statusLabel } from '../utils/sessionOutcome';

export default function SessionOverview({ appointments, currentUser, onUpdated }) {
  const now = useSessionClock();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const sessions = appointments.filter(a => a.appointmentKind !== 'discovery');
  const rescheduleRequests = appointments.filter(pendingReschedule);
  const pending = sessions.filter(a => feedbackEligible(a) && !hasFeedback(a));
  const received = sessions.filter(a => feedbackEligible(a) && hasFeedback(a));
  const awaiting = sessions.filter(a => sessionStatus(a, now) === 'awaiting_outcome');
  const visible = (filter === 'reschedule' ? rescheduleRequests : sessions).filter(a => filter === 'reschedule' || filter === 'all' || (filter === 'feedback_pending' ? pending.includes(a) : filter === 'feedback_received' ? received.includes(a) : filter === 'missed' ? ['user_absent', 'counselor_absent', 'both_absent'].includes(a.status) : sessionStatus(a, now) === filter))
    .filter(a => [a.patientName, a.counselorName, a.review?.reviewText].some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return <Stack spacing={2}>
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Chip label={`${rescheduleRequests.length} rescheduling requests`} color="warning" onClick={() => setFilter('reschedule')} />
      <Chip label={`${awaiting.length} awaiting outcome`} color="warning" variant="outlined" onClick={() => setFilter('awaiting_outcome')} />
      <Chip label={`${pending.length} feedback pending`} variant="outlined" onClick={() => setFilter('feedback_pending')} />
      <Chip label={`${received.length} feedback received`} color="success" variant="outlined" onClick={() => setFilter('feedback_received')} />
    </Stack>
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField size="small" label="Search user, counselor or feedback" value={query} onChange={e => setQuery(e.target.value)} sx={{ flex: 1, minWidth: 230 }} />
      <TextField select size="small" label="Sessions" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 200 }}>{[['all', 'All sessions'], ['reschedule', 'Rescheduling requests'], ['upcoming', 'Scheduled'], ['awaiting_outcome', 'Awaiting outcome'], ['completed', 'Completed'], ['missed', 'Missed sessions'], ['feedback_pending', 'Feedback pending'], ['feedback_received', 'Feedback received']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    </Paper>
    <TableContainer component={Paper} variant="outlined"><Table sx={{ minWidth: 850 }}>
      <TableHead><TableRow>{['User / counselor', 'Session (IST)', 'Outcome', 'Feedback', 'Actions'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{visible.map(a => <TableRow key={a.id} hover>
        <TableCell><Typography variant="body2" fontWeight={650}>{a.patientName}</Typography><Typography variant="caption" color="text.secondary">{a.counselorName}</Typography></TableCell>
        <TableCell>{a.date} · {a.time}<Typography variant="caption" display="block">{a.duration || 60} min · {a.appointmentType === 'In-Person Consultation' ? 'Offline · HO' : 'Online'}</Typography></TableCell>
        <TableCell><Chip size="small" label={statusLabel(sessionStatus(a, now))} color={a.status === 'completed' ? 'success' : sessionStatus(a, now) === 'awaiting_outcome' ? 'warning' : 'default'} variant="outlined" />{a.outcomeRecordedByName && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Recorded by {a.outcomeRecordedByName}</Typography>}</TableCell>
        <TableCell sx={{ maxWidth: 320 }}><Typography variant="body2">{feedbackLabel(a)}</Typography>{feedbackEligible(a) && hasFeedback(a) && <Box><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.review.reviewText || 'No written feedback was provided.'}</Typography><Typography variant="caption" color="text.secondary">{new Date(a.review.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</Typography></Box>}</TableCell>
        <TableCell><Button component={Link} to={`/session/${a.id}`} size="small" variant="outlined">{sessionStatus(a, now) === 'awaiting_outcome' ? 'Review outcome' : 'Session details'}</Button><ReschedulePanel compact appointment={a} currentUser={currentUser} onUpdated={onUpdated} /></TableCell>
      </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No sessions match this view.</TableCell></TableRow>}</TableBody>
    </Table></TableContainer>
  </Stack>;
}
