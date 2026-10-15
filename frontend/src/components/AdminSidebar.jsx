import { useState } from 'react';
import { Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

export default function AdminSidebar({ sections, activeSection, onSelect, mobileOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('bjs:admin-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('bjs:admin-sidebar-collapsed', String(next)); } catch { /* The sidebar still works without browser storage. */ }
  };
  const content = (compact = false, mobile = false) => <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: compact ? 1 : 1.5, py: 3 }}>
    <Box sx={{ px: compact ? 0 : 1.5, mb: 3, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'space-between', gap: .5 }}>
      {!compact && <Box>
        <Typography sx={{ fontSize: 15, fontWeight: 750, color: '#1e1b4b' }}>Admin workspace</Typography>
        <Typography variant="caption" color="text.secondary">BJS Counselling</Typography>
      </Box>}
      {mobile ? <IconButton size="small" aria-label="Close admin navigation" onClick={onClose}><CloseIcon fontSize="small" /></IconButton> : <Tooltip title={compact ? 'Expand sidebar' : 'Collapse sidebar'} placement="right"><IconButton size="small" aria-label={compact ? 'Expand admin sidebar' : 'Collapse admin sidebar'} aria-expanded={!compact} aria-controls="admin-desktop-navigation" onClick={toggle} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}>{compact ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}</IconButton></Tooltip>}
    </Box>
    <Typography aria-hidden={compact || undefined} sx={{ px: compact ? 0 : 1.5, mb: 1.25, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#94a3b8', visibility: compact ? 'hidden' : 'visible', whiteSpace: 'nowrap', overflow: 'hidden' }}>WORKSPACE</Typography>
    <List id={mobile ? 'admin-mobile-navigation' : 'admin-desktop-navigation'} component="nav" aria-label="Admin sections" disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: .5 }}>
      {sections.map(section => {
        const selected = activeSection === section.id;
        const Icon = section.icon;
        const label = section.navLabel || section.label;
        return <Tooltip key={section.id} title={compact ? `${label}${section.count > 0 ? ` (${section.count})` : ''}` : ''} placement="right" arrow><ListItemButton data-admin-section={section.id} aria-label={label} selected={selected} aria-current={selected ? 'page' : undefined} aria-controls="admin-directory" onClick={() => { onSelect(section.id); onClose(); }} sx={{ px: compact ? 0 : 1.5, py: 1.1, justifyContent: compact ? 'center' : 'flex-start', borderRadius: 1.75, minHeight: 46, color: '#64748b', '&.Mui-selected': { bgcolor: '#eef0ff', color: '#4f46e5', '&:hover': { bgcolor: '#e5e7ff' } }, '&:hover': { bgcolor: '#f8fafc' }, '&:focus-visible': { outline: '2px solid #818cf8', outlineOffset: 2 } }}>
          <ListItemIcon sx={{ minWidth: compact ? 0 : 32, color: 'inherit' }}><Icon sx={{ fontSize: 20 }} /></ListItemIcon>
          {!compact && <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: 13, fontWeight: selected ? 700 : 500, lineHeight: 1.4 } } }} />}
          {!compact && section.count > 0 && <Box component="span" sx={{ ml: .75, minWidth: 23, px: .75, py: .25, borderRadius: 1.25, fontSize: 11, textAlign: 'center', fontWeight: 650, bgcolor: selected ? '#dfe2ff' : '#f1f5f9', color: selected ? '#4f46e5' : '#64748b' }}>{section.count}</Box>}
        </ListItemButton></Tooltip>;
      })}
    </List>
  </Box>;
  return <>
    <Box component="aside" aria-label="Admin workspace navigation" sx={{ display: { xs: 'none', md: 'block' }, width: collapsed ? 72 : 232, transition: 'width 160ms ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' }, flexShrink: 0, position: 'sticky', top: 70, height: 'calc(100dvh - 70px)', bgcolor: '#fff', borderRight: '1px solid #e8ecf3', overflowY: 'auto', overflowX: 'hidden' }}>{content(collapsed)}</Box>
    <Drawer open={mobileOpen} onClose={onClose} sx={{ display: { md: 'none' } }} slotProps={{ paper: { sx: { width: 272, maxWidth: 'calc(100vw - 32px)' } } }}>{content(false, true)}</Drawer>
  </>;
}
