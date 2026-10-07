import { Box, Paper, Stack, Typography } from '@mui/material';

export default function SessionNotesHistory({ appointment, appointments = [] }) {
  const past = appointments.filter(item => item.id !== appointment.id
    && item.patientId === appointment.patientId
    && (item.sessionNotes?.trim() || item.sessionNoteHistory?.length)
    && `${item.date} ${item.time}` <= `${appointment.date} ${appointment.time}`)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const revisions = item => item.sessionNoteHistory?.length > 0 && <Box component="details" sx={{ mt: 1 }}>
    <Typography component="summary" variant="body2" sx={{ cursor: 'pointer' }}>Previous note versions ({item.sessionNoteHistory.length})</Typography>
    {[...item.sessionNoteHistory].reverse().map((entry, index) => <Box key={index} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">{new Date(entry.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {entry.actorName}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{entry.notes || '(No notes)'}</Typography>
    </Box>)}
  </Box>;
  return <Stack spacing={1.5}>
    {revisions(appointment)}
    <Typography variant="subtitle2">Past session notes</Typography>
    {!past.length && <Typography variant="body2" color="text.secondary">No past session notes available.</Typography>}
    {past.map(item => <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{item.date} · {item.time} IST · {item.counselorName}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{item.sessionNotes || 'No current notes.'}</Typography>
      {revisions(item)}
    </Paper>)}
  </Stack>;
}
