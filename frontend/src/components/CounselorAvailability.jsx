import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, IconButton, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { api } from '../api';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const newBlock = () => ({ startHour: '09:00', endHour: '17:00', mode: 'online' });

export default function CounselorAvailability({ counselorId }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    api.getCounselorAvailability(counselorId)
      .then(availability => {
        if (!active) return;
        const value = {
        daysConfig: days.map((_, dayIndex) => {
            const day = availability.daysConfig?.find(item => item.dayIndex === dayIndex);
            return { dayIndex, active: day ? day.active : (availability.workingDays || [1, 2, 3, 4, 5]).includes(dayIndex), slots: day ? day.slots.map(slot => ({ startHour: slot.startHour, endHour: slot.endHour, mode: ['online', 'offline'].includes(slot.mode) ? slot.mode : '' })) : [{ startHour: availability.startHour || '09:00', endHour: availability.endHour || '17:00', mode: '' }] };
          }),
        };
        setDraft(value); setSaved(value);
      }).catch(err => { if (active) setError(err.message || 'Unable to load availability.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [counselorId]);

  const changeDay = (index, update) => setDraft(previous => ({ ...previous, daysConfig: previous.daysConfig.map(day => day.dayIndex === index ? { ...day, ...update(day) } : day) }));
  const changeBlock = (index, blockIndex, field, value) => changeDay(index, day => ({ slots: day.slots.map((slot, i) => i === blockIndex ? { ...slot, [field]: value } : slot) }));
  const hasChanges = Boolean(draft && saved && JSON.stringify(draft.daysConfig) !== JSON.stringify(saved.daysConfig));
  const save = async () => {
    if (saving.current || busy || !hasChanges) return;
    setError(''); setSuccess('');
    const activeDays = draft.daysConfig.filter(day => day.active);
    for (const day of activeDays) {
      if (!day.slots.length) { setError(`Add an availability block for ${days[day.dayIndex]}.`); return; }
      const sorted = [...day.slots].sort((a, b) => a.startHour.localeCompare(b.startHour));
      for (let i = 0; i < sorted.length; i++) {
        const slot = sorted[i];
        if (!slot.startHour || !slot.endHour || slot.startHour >= slot.endHour) { setError(`${days[day.dayIndex]}: choose an end time after the start time.`); return; }
        if (!['online', 'offline'].includes(slot.mode)) { setError(`${days[day.dayIndex]}: choose online or offline for each block.`); return; }
        if (i && slot.startHour < sorted[i - 1].endHour) { setError(`${days[day.dayIndex]}: availability blocks must not overlap.`); return; }
      }
    }
    const blocks = activeDays.flatMap(day => day.slots);
    saving.current = true;
    setBusy(true);
    try {
      await api.updateCounselorAvailability({
        daysConfig: draft.daysConfig.map(day => ({ ...day, slots: day.active ? day.slots : day.slots.filter(slot => ['online', 'offline'].includes(slot.mode)) })), workingDays: activeDays.map(day => day.dayIndex),
        startHour: blocks.length ? [...blocks].sort((a, b) => a.startHour.localeCompare(b.startHour))[0].startHour : '09:00',
        endHour: blocks.length ? [...blocks].sort((a, b) => b.endHour.localeCompare(a.endHour))[0].endHour : '17:00',
      });
      setSaved(draft);
      setSuccess('Availability and session modes saved.');
    } catch (err) { setError(err.message || 'Unable to save changes.'); }
    finally { saving.current = false; setBusy(false); }
  };

  if (loading) return <CircularProgress size={28} />;
  if (!draft) return <Alert severity="error">{error}</Alert>;
  return <Stack spacing={2}>
    {error && <Alert severity="error">{error}</Alert>}
    {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Weekly recurring availability</Typography>
      <Typography variant="caption" color="text.secondary">Set times in IST and choose online or offline for each block.</Typography>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={1.5}>
        {draft.daysConfig.map(day => <Paper key={day.dayIndex} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: day.active ? 'action.hover' : 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: day.active ? 1.5 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AvatarDay day={days[day.dayIndex]} /><Typography variant="body2" sx={{ fontWeight: 650 }}>{days[day.dayIndex]}</Typography></Box>
              <Switch size="small" checked={day.active} disabled={busy} slotProps={{ input: { 'aria-label': `Available on ${days[day.dayIndex]}` } }} onChange={e => changeDay(day.dayIndex, previous => ({ active: e.target.checked, slots: previous.slots.length ? previous.slots : [newBlock()] }))} />
            </Box>
            {day.active && <Stack spacing={1.5}>{day.slots.map((slot, index) => <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1.15fr auto' }, gap: 1 }}>
              <TextField size="small" type="time" label="Start (IST)" value={slot.startHour} disabled={busy} slotProps={{ inputLabel: { shrink: true } }} onChange={e => changeBlock(day.dayIndex, index, 'startHour', e.target.value)} />
              <TextField size="small" type="time" label="End (IST)" value={slot.endHour} disabled={busy} slotProps={{ inputLabel: { shrink: true } }} onChange={e => changeBlock(day.dayIndex, index, 'endHour', e.target.value)} />
              <TextField select size="small" label="Session mode" value={slot.mode} disabled={busy} onChange={e => changeBlock(day.dayIndex, index, 'mode', e.target.value)}>
                <MenuItem value="online">Online</MenuItem><MenuItem value="offline">Offline</MenuItem>
              </TextField>
              <IconButton size="small" color="error" aria-label={`Remove ${days[day.dayIndex]} block ${index + 1}`} disabled={busy} onClick={() => changeDay(day.dayIndex, previous => ({ slots: previous.slots.filter((_, i) => i !== index) }))}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Box>)}<Button size="small" startIcon={<AddIcon />} disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={() => changeDay(day.dayIndex, previous => ({ slots: [...previous.slots, newBlock()] }))}>Add time block</Button></Stack>}
          </Paper>)}
        </Stack>
      </Paper>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button disabled={busy || !hasChanges} onClick={() => { setDraft(saved); setError(''); setSuccess(''); }}>Discard changes</Button><Button variant="contained" disabled={busy || !hasChanges} startIcon={<SaveOutlinedIcon />} onClick={save}>{busy ? 'Saving…' : 'Save schedule changes'}</Button></Box>
  </Stack>;
}

function AvatarDay({ day }) {
  return <Box sx={{ width: 30, height: 30, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark', fontSize: 11, fontWeight: 700 }}>{day.slice(0, 2).toUpperCase()}</Box>;
}
