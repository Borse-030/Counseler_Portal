import { Box, Button, Paper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';

export default function AdminRegistrationEmptyState({ filtered, onClear, onViewUsers }) {
  const Icon = filtered ? SearchIcon : CheckCircleIcon;
  return <Paper variant="outlined" sx={{ px: 3, py: { xs: 6, md: 9 }, textAlign: 'center', borderRadius: 2.5, borderColor: '#e5e9f0', boxShadow: '0 2px 6px rgba(15,23,42,.02)' }}>
    <Box sx={{ display: 'grid', placeItems: 'center', width: 56, height: 56, mx: 'auto', mb: 2, borderRadius: 3, bgcolor: filtered ? '#f1f5f9' : '#eef0ff', color: filtered ? '#64748b' : '#6366f1' }}><Icon sx={{ fontSize: 28 }} /></Box>
    <Typography sx={{ fontSize: 18, fontWeight: 750, color: '#1e293b' }}>{filtered ? 'No matching registrations' : 'You’re all caught up'}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 340, mx: 'auto', lineHeight: 1.7 }}>{filtered ? 'Try another name, email, or phone number to find the application.' : 'No registrations are waiting for review. New applications will appear here.'}</Typography>
    <Button variant="outlined" sx={{ mt: 3, px: 2, borderColor: '#dfe2ff' }} onClick={filtered ? onClear : onViewUsers}>{filtered ? 'Clear search' : 'View approved users'}</Button>
  </Paper>;
}
