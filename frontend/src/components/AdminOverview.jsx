import { Link } from 'react-router-dom';
import { Box, Button, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import useSessionClock from '../hooks/useSessionClock';
import { buildAdminOverview } from '../utils/adminOverview';
import { sessionStatus, statusLabel } from '../utils/sessionOutcome';

const panel = { borderRadius: 2.5, borderColor: '#e5e9f0', overflow: 'hidden', boxShadow: 'none' };
export function AdminOverviewDate({ onRefresh }) {
  const now = useSessionClock();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary">{new Date(now).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} · IST</Typography>
      <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={onRefresh}>Refresh</Button>
    </Box>
  );
}

export default function AdminOverview({ users, appointments, requests, onNavigate, onCreateUser, onCreateCounselor }) {
  const now = useSessionClock();
  const data = buildAdminOverview({ users, appointments, requests, now });
  const stats = [
    { label: 'Approved users', value: data.approvedUsers, caption: 'Active users in care', icon: PeopleAltIcon, section: 1 },
    { label: 'Active counselors', value: data.activeCounselors, caption: 'Active counseling panel', icon: PsychologyOutlinedIcon, section: 2 },
    { label: 'Sessions today', value: data.sessionsToday, caption: 'Today, in India Standard Time', icon: CalendarMonthOutlinedIcon, section: 5, filter: 'today' },
    { label: 'Completed sessions', value: data.completedSessions, caption: 'Across the program', icon: CheckCircleIcon, section: 5, filter: 'completed' },
  ];
  const actions = [
    { title: 'Create user', detail: 'Start a new user registration', icon: AddIcon, onClick: onCreateUser },
    { title: 'Create counselor', detail: 'Add a counselor to the panel', icon: PsychologyOutlinedIcon, onClick: onCreateCounselor },
    { title: 'Schedule sessions', detail: 'Choose a user and book sessions', icon: CalendarMonthOutlinedIcon, onClick: () => onNavigate(1) },
    { title: 'Discovery & matching', detail: 'Review calls and assign counselors', icon: HeadsetMicOutlinedIcon, onClick: () => onNavigate(3) },
  ];
  return <Stack spacing={2}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1.5, md: 2 } }}>
      {stats.map(item => { const Icon = item.icon; return <Paper key={item.label} variant="outlined" sx={panel}><ButtonBase onClick={() => onNavigate(item.section, item.filter)} sx={{ width: '100%', display: 'block', p: { xs: 2, md: 2.5 }, textAlign: 'left', '&:focus-visible': { outline: '2px solid #818cf8', outlineOffset: -3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography variant="caption" color="text.secondary" fontWeight={650}>{item.label}</Typography><Icon sx={{ color: '#818cf8', fontSize: 19, flexShrink: 0 }} /></Box>
        <Typography sx={{ fontSize: { xs: 27, md: 32 }, lineHeight: 1.2, fontWeight: 750, color: '#1e293b', mt: 1.5 }}>{item.value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: .75, display: 'block', lineHeight: 1.5 }}>{item.caption}</Typography>
      </ButtonBase></Paper>; })}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start' }}>
      <Paper variant="outlined" sx={panel}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef1f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography fontWeight={750}>Needs attention</Typography>{data.tasks.length > 0 && <Chip size="small" label={`${data.tasks.reduce((sum, task) => sum + task.count, 0)} tasks`} sx={{ bgcolor: '#fff7ed', color: '#b45309', fontSize: 11, fontWeight: 650 }} />}</Box>
        {data.tasks.length ? data.tasks.map(task => <ButtonBase key={task.key} onClick={() => onNavigate(task.section, task.filter)} sx={{ width: '100%', px: 2.5, py: 1.75, gap: 1.5, textAlign: 'left', justifyContent: 'flex-start', borderBottom: '1px solid #f1f5f9', '&:hover': { bgcolor: '#fafaff' }, '&:focus-visible': { outline: '2px solid #818cf8', outlineOffset: -2 } }}>
          <Box sx={{ minWidth: 32, height: 32, borderRadius: 1.5, bgcolor: '#eef0ff', color: '#4f46e5', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{task.count}</Box>
          <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={650}>{task.label}</Typography><Typography variant="caption" color="text.secondary">{task.detail}</Typography></Box><ArrowForwardIcon sx={{ fontSize: 17, color: '#94a3b8' }} />
        </ButtonBase>) : <Box sx={{ px: 3, py: 5, textAlign: 'center' }}><CheckCircleIcon sx={{ color: '#10b981', fontSize: 32, mb: 1 }} /><Typography variant="body2" fontWeight={700}>Nothing needs your attention</Typography><Typography variant="caption" color="text.secondary">New requests and follow-ups will appear here.</Typography></Box>}
      </Paper>
    <Paper variant="outlined" sx={panel}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef1f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography fontWeight={750}>{data.showingToday ? 'Today’s schedule' : 'Next sessions'}</Typography><Button size="small" onClick={() => onNavigate(5, data.showingToday ? 'today' : 'upcoming')}>View all</Button></Box>
      {data.schedule.length ? data.schedule.map(item => {
        const status = sessionStatus(item, now);
        return <Box key={item.id} sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ minWidth: 62 }}><Typography variant="body2" fontWeight={750}>{item.time}</Typography><Typography variant="caption" color="text.secondary">{data.showingToday ? 'IST' : new Date(`${item.date}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</Typography></Box>
          <Box sx={{ flex: 1, minWidth: 140 }}><Typography variant="body2" fontWeight={650}>{item.patientName}</Typography><Typography variant="caption" color="text.secondary">{item.counselorName} · {item.duration || 60} min</Typography></Box>
          <Chip size="small" variant="outlined" color={status === 'completed' ? 'success' : ['awaiting_outcome', 'pending_admin'].includes(status) ? 'warning' : 'default'} label={statusLabel(status)} />
          <Button size="small" component={Link} to={`/session/${item.id}`} aria-label={`View session with ${item.patientName}`}>Details</Button>
        </Box>;
      }) : <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 4, textAlign: 'center' }}>No upcoming sessions. Book sessions from a user’s case when they are ready.</Typography>}
    </Paper>
    </Box>
      <Paper variant="outlined" sx={panel}>
        <Typography fontWeight={750} sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef1f6' }}>Quick actions</Typography>
        <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: .5 }}>
          {actions.map(action => { const Icon = action.icon; return <ButtonBase key={action.title} onClick={action.onClick} sx={{ justifyContent: 'flex-start', gap: 1.5, textAlign: 'left', p: 1.5, borderRadius: 1.5, '&:hover': { bgcolor: '#f8f9ff' }, '&:focus-visible': { outline: '2px solid #818cf8' } }}><Icon sx={{ fontSize: 20, color: '#6366f1' }} /><Box><Typography variant="body2" fontWeight={650}>{action.title}</Typography><Typography variant="caption" color="text.secondary">{action.detail}</Typography></Box></ButtonBase>; })}
        </Box>
      </Paper>

  </Stack>;
}
