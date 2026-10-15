import { Box, Button, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AttendSessionButton from './AttendSessionButton';
import { modeLabel } from '../utils/sessionMode';

const panel = { borderRadius: 2.5, borderColor: '#e5e9f0', overflow: 'hidden', boxShadow: 'none', minWidth: 0 };
const header = { px: 2.5, py: 2, borderBottom: '1px solid #eef1f6' };

export default function CounselorOverview({ todaySessions, upcoming, awaitingOutcome, pendingNotes, activeCases, onSelect, onNotes }) {
  const schedule = (todaySessions.length ? todaySessions : upcoming).slice(0, 5);
  const tasks = [
    { count: awaitingOutcome.length, title: 'Sessions awaiting an outcome', detail: 'Confirm attendance for ended sessions.', action: () => onSelect(4) },
    { count: pendingNotes.length, title: 'Session notes to complete', detail: 'Add notes to completed sessions.', action: () => onSelect(2, 'pending') },
    { count: activeCases.filter(item => item.status === 'matched').length, title: 'Newly assigned cases', detail: 'Review discovery notes before the first session.', action: () => onSelect(0) },
  ].filter(item => item.count > 0);
  const actions = [
    { title: 'View assigned cases', detail: 'Review your patients and care plans', action: () => onSelect(0) },
    { title: 'View calendar', detail: 'Prepare for upcoming sessions', action: () => onSelect(1) },
    { title: 'Log session notes', detail: 'Complete pending documentation', action: () => onSelect(2, 'pending') },
    { title: 'Update availability', detail: 'Manage your weekly time slots', action: () => onSelect(3) },
  ];
  return <Stack spacing={2}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
      <Paper variant="outlined" sx={panel}>
        <Typography fontWeight={750} sx={header}>Needs attention</Typography>
        {tasks.length ? tasks.map(task => <ButtonBase key={task.title} onClick={task.action} sx={{ width: '100%', p: 2.5, gap: 1.5, textAlign: 'left', justifyContent: 'flex-start', borderBottom: '1px solid #eef1f6', '&:hover': { bgcolor: '#f8f9ff' } }}>
          <Box sx={{ minWidth: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: '#eef0ff', color: '#4f46e5', fontWeight: 700 }}>{task.count}</Box>
          <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={650}>{task.title}</Typography><Typography variant="caption" color="text.secondary">{task.detail}</Typography></Box><ArrowForwardIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
        </ButtonBase>) : <Box sx={{ p: 3 }}><Typography variant="body2" fontWeight={650}>You're all caught up</Typography><Typography variant="caption" color="text.secondary">New assignments and follow-ups will appear here.</Typography></Box>}
      </Paper>
      <Paper variant="outlined" sx={panel}>
        <Box sx={{ ...header, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography fontWeight={750}>{todaySessions.length ? 'Today’s schedule' : 'Next sessions'}</Typography><Button size="small" onClick={() => onSelect(1, todaySessions.length ? 'today' : undefined)}>View all</Button></Box>
        {schedule.length ? schedule.map(apt => <Box key={apt.id} sx={{ p: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid #eef1f6' }}>
          <Box sx={{ minWidth: 65 }}><Typography variant="body2" fontWeight={700}>{apt.time}</Typography><Typography variant="caption" color="text.secondary">{todaySessions.length ? 'IST' : new Date(`${apt.date}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</Typography></Box>
          <Box sx={{ flex: 1, minWidth: 120 }}><Typography variant="body2" fontWeight={650}>{apt.patientName}</Typography><Typography variant="caption" color="text.secondary">{modeLabel(apt.appointmentType)} · {apt.duration || 60} min</Typography></Box>
          <Box sx={{ display: 'flex', gap: .5 }}><AttendSessionButton size="small" variant="outlined" appointment={apt} /><Button size="small" onClick={() => onNotes(apt)}>Notes</Button></Box>
        </Box>) : <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>Your next session will appear here once it is scheduled.</Typography>}
      </Paper>
    </Box>
    <Paper variant="outlined" sx={panel}>
      <Typography fontWeight={750} sx={header}>Quick actions</Typography>
      <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
        {actions.map(action => <ButtonBase key={action.title} onClick={action.action} sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'left', justifyContent: 'flex-start', gap: 1, '&:hover': { bgcolor: '#f8f9ff' } }}><Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={650}>{action.title}</Typography><Typography variant="caption" color="text.secondary">{action.detail}</Typography></Box><ArrowForwardIcon sx={{ fontSize: 17, color: '#6366f1' }} /></ButtonBase>)}
      </Box>
    </Paper>
  </Stack>;
}
