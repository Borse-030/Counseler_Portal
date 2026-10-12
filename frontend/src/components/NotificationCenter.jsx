import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Badge, Box, Button, Chip, CircularProgress, Divider, IconButton, List, ListItemButton, Popover, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { api } from '../api';

function relativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationCenter({ userId }) {
  const [anchor, setAnchor] = useState(null);
  const [filter, setFilter] = useState('all');
  const [cursors, setCursors] = useState([null]);
  const [page, setPage] = useState({ items: [], unreadCount: 0, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('connecting');
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const refreshTimer = useRef(null);
  const streamStatus = useRef('connecting');
  const cursor = cursors.at(-1);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getNotifications({ cursor, filter, signal: controller.signal });
        if (active) { setPage(data); setError(''); }
      } catch (err) {
        if (active && err.name !== 'AbortError') setError(err.message || 'Could not load notifications.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [userId, cursor, filter, refresh]);

  useEffect(() => {
    const unsubscribe = api.subscribeNotifications(() => {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        setRefresh(value => value + 1);
      }, 300);
    }, value => { streamStatus.current = value; setStatus(value); });
    const reconcile = () => { if (!document.hidden) setRefresh(value => value + 1); };
    const fallback = setInterval(() => {
      if (streamStatus.current !== 'live') reconcile();
    }, 30000);
    window.addEventListener('online', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    return () => {
      unsubscribe(); clearTimeout(refreshTimer.current); clearInterval(fallback); refreshTimer.current = null;
      window.removeEventListener('online', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
    };
  }, [userId]);

  const markRead = async (item) => {
    if (item.read || busy || loading) return;
    setBusy(true);
    try { await api.markNotificationRead(item.id); setRefresh(value => value + 1); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const markAll = async () => {
    setBusy(true);
    try {
      await api.markAllNotificationsRead(page.snapshotAt);
      setCursors([null]); setRefresh(value => value + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return <>
    <Tooltip title="Notifications">
      <IconButton color="inherit" aria-label={`Notifications, ${page.unreadCount} unread`} aria-haspopup="dialog" aria-expanded={Boolean(anchor)} onClick={event => { setAnchor(event.currentTarget); setRefresh(value => value + 1); }}>
        <Badge badgeContent={page.unreadCount} max={99} color="error"><NotificationsOutlinedIcon /></Badge>
      </IconButton>
    </Tooltip>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { role: 'dialog', 'aria-label': 'Notifications', sx: { width: { xs: 'calc(100vw - 32px)', sm: 440 }, maxWidth: 440, borderRadius: 3, mt: 1.5, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(30,27,75,.16)', overflow: 'hidden' } } }}>
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Notifications</Typography>
            {page.unreadCount > 0 && <Chip size="small" label={`${page.unreadCount} new`} sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 700 }} />}
          </Box>
          <IconButton size="small" aria-label="Close notifications" onClick={() => setAnchor(null)}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        
      </Box>
      <Box sx={{ px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs value={filter} onChange={(_, value) => { setFilter(value); setCursors([null]); }} aria-label="Filter notifications" sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, minWidth: 64, px: 1.5, fontWeight: 700 } }}>
          <Tab value="all" label="All" /><Tab value="unread" label="Unread" />
        </Tabs>
        <Button size="small" startIcon={<DoneAllIcon />} disabled={busy || loading || !page.unreadCount || !page.snapshotAt} onClick={markAll} sx={{ fontSize: 12 }}>Mark all read</Button>
      </Box>
      <Divider />
      {error && <Alert severity="error" sx={{ m: 1.5 }} action={<Button color="inherit" size="small" onClick={() => setRefresh(value => value + 1)}>Retry</Button>}>{error}</Alert>}
      <Box sx={{ height: 'min(440px, 55vh)', overflowY: 'auto' }} aria-busy={loading}>
        {loading && !page.items.length ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={26} aria-label="Loading notifications" /></Box> : page.items.length ? <List disablePadding aria-label="Notification list">
          {page.items.map(item => {
            const session = /session|appointment|booking|reschedul/i.test(item.message);
            const assignment = /assign|counselor|registration/i.test(item.message);
            const Icon = session ? CalendarMonthOutlinedIcon : assignment ? PersonOutlineIcon : NotificationsOutlinedIcon;
            return <ListItemButton key={item.id} onClick={() => markRead(item)} disabled={busy} sx={{ alignItems: 'flex-start', px: 2.5, py: 2, gap: 1.5, bgcolor: item.read ? 'transparent' : '#f5f5ff', borderBottom: '1px solid #f1f5f9', '&:hover': { bgcolor: '#eef2ff' } }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: item.read ? '#f1f5f9' : '#e0e7ff', color: item.read ? '#64748b' : '#4f46e5' }}><Icon sx={{ fontSize: 20 }} /></Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 700 }}>{session ? 'Session update' : assignment ? 'Care update' : 'Account update'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: item.read ? 400 : 600, lineHeight: 1.6, mt: .25, overflowWrap: 'anywhere' }}>{item.message}</Typography>
                <Typography component="time" dateTime={new Date(item.date).toISOString()} title={new Date(item.date).toLocaleString('en-IN')} variant="caption" color="text.secondary" sx={{ display: 'block', mt: .75 }}>{relativeTime(item.date)}{!item.read && ' · Unread'}</Typography>
              </Box>
              {!item.read && <Box aria-label="Unread" sx={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', bgcolor: '#6366f1', mt: 1 }} />}
            </ListItemButton>;
          })}
        </List> : <Box sx={{ py: 7, px: 3, textAlign: 'center' }}>
          <Avatar sx={{ mx: 'auto', mb: 2, width: 56, height: 56, bgcolor: '#eef2ff', color: '#6366f1' }}><DoneAllIcon /></Avatar>
          <Typography sx={{ fontWeight: 700 }}>{filter === 'unread' ? 'You’re all caught up' : cursors.length > 1 ? 'No updates on this page' : 'No notifications yet'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Session and care updates will appear here.</Typography>
        </Box>}
      </Box>
      <Divider />
      <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">Page {cursors.length}</Typography>
        <Box>
          <IconButton size="small" aria-label="Previous notification page" disabled={loading || cursors.length === 1} onClick={() => setCursors(value => value.slice(0, -1))}><ChevronLeftIcon /></IconButton>
          <IconButton size="small" aria-label="Next notification page" disabled={loading || !page.nextCursor} onClick={() => setCursors(value => [...value, page.nextCursor])}><ChevronRightIcon /></IconButton>
        </Box>
      </Box>
    </Popover>
  </>;
}
