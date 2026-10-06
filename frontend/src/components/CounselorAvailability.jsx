import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Divider, IconButton, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { api } from '../api';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const newBlock = () => ({ startHour: '09:00', endHour: '17:00', mode: 'online' });

export default function CounselorAvailability({ counselorId }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.getCounselorAvailability(counselorId), api.getCounselorBookingLimits(counselorId), api.getCounselorExceptions(counselorId)])
      .then(([availability, limits, leave]) => {
        if (!active) return;
        const value = {
          slotDuration: availability.slotDuration || 60,
          daysConfig: days.map((_, dayIndex) => {
            const day = availability.daysConfig?.find(item => item.dayIndex === dayIndex);
            return { dayIndex, active: day ? day.active : (availability.workingDays || [1, 2, 3, 4, 5]).includes(dayIndex), slots: day ? day.slots.map(slot => ({ startHour: slot.startHour, endHour: slot.endHour, mode: slot.mode || 'both' })) : [{ startHour: availability.startHour || '09:00', endHour: availability.endHour || '17:00', mode: 'both' }] };
          }),
          limits: { maxAppointmentsPerDay: limits.maxAppointmentsPerDay ?? 5, minNoticePeriodHours: limits.minNoticePeriodHours ?? 2, maxAdvanceBookingDays: limits.maxAdvanceBookingDays ?? 30 },
        };
        setDraft(value); setSaved(value); setExceptions(leave);
      }).catch(err => { if (active) setError(err.message || 'Unable to load availability.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [counselorId]);

  const changeDay = (index, update) => setDraft(previous => ({ ...previous, daysConfig: previous.daysConfig.map(day => day.dayIndex === index ? { ...day, ...update(day) } : day) }));
  const changeBlock = (index, blockIndex, field, value) => changeDay(index, day => ({ slots: day.slots.map((slot, i) => i === blockIndex ? { ...slot, [field]: value } : slot) }));
  const save = async () => {
    setError(''); setSuccess('');
    const activeDays = draft.daysConfig.filter(day => day.active);
    for (const day of activeDays) {
      if (!day.slots.length) { setError(`Add an availability block for ${days[day.dayIndex]}.`); return; }
      const sorted = [...day.slots].sort((a, b) => a.startHour.localeCompare(b.startHour));
      for (let i = 0; i < sorted.length; i++) {
        const slot = sorted[i];
        if (!slot.startHour || !slot.endHour || slot.startHour >= slot.endHour) { setError(`${days[day.dayIndex]}: choose an end time after the start time.`); return; }
        if (!['online', 'offline', 'both'].includes(slot.mode)) { setError(`${days[day.dayIndex]}: choose a session mode for each block.`); return; }
        if (i && slot.startHour < sorted[i - 1].endHour) { setError(`${days[day.dayIndex]}: availability blocks must not overlap.`); return; }
      }
    }
    if (Object.values(draft.limits).some(value => !Number.isInteger(value) || value < 1)) { setError('Booking rules must be positive whole numbers.'); return; }
    const blocks = activeDays.flatMap(day => day.slots);
    setBusy(true);
    let hoursSaved = false;
    try {
      await api.updateCounselorAvailability({
        daysConfig: draft.daysConfig, workingDays: activeDays.map(day => day.dayIndex), slotDuration: draft.slotDuration,
        startHour: blocks.length ? [...blocks].sort((a, b) => a.startHour.localeCompare(b.startHour))[0].startHour : '09:00',
        endHour: blocks.length ? [...blocks].sort((a, b) => b.endHour.localeCompare(a.endHour))[0].endHour : '17:00',
      });
      hoursSaved = true;
      await api.updateCounselorBookingLimits(draft.limits);
      setSaved(draft);
      setSuccess('Availability, session modes, and booking rules saved.');
    } catch (err) { setError(`${hoursSaved ? 'Availability and modes were saved, but booking rules were not. ' : ''}${err.message || 'Unable to save changes.'}`); }
    finally { setBusy(false); }
  };
  const updateLeave = async (exceptionId) => {
    if (!exceptionId && (!leaveDate || leaveDate < todayIST())) { setError('Choose a leave date today or later.'); return; }
    setLeaveBusy(true); setError(''); setSuccess('');
    try {
      if (exceptionId) {
        await api.deleteCounselorException(exceptionId);
        setExceptions(previous => previous.filter(item => item.id !== exceptionId));
      } else {
        const result = await api.addCounselorException({ date: leaveDate, reason: leaveReason.trim() || 'Personal leave' });
        setExceptions(previous => [...previous, result.exception]); setLeaveDate(''); setLeaveReason('');
      }
      setSuccess(exceptionId ? 'Leave date removed.' : 'Leave date added. Sessions cannot be booked on this date.');
    } catch (err) { setError(err.message || 'Unable to update leave dates.'); }
    finally { setLeaveBusy(false); }
  };

  if (loading) return <CircularProgress size={28} />;
  if (!draft) return <Alert severity="error">{error}</Alert>;
  return <Stack spacing={2}>
    {error && <Alert severity="error">{error}</Alert>}
    {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start' }}>
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
                <MenuItem value="online">Online</MenuItem><MenuItem value="offline">Offline / In person</MenuItem><MenuItem value="both">Online & offline</MenuItem>
              </TextField>
              <IconButton size="small" color="error" aria-label={`Remove ${days[day.dayIndex]} block ${index + 1}`} disabled={busy} onClick={() => changeDay(day.dayIndex, previous => ({ slots: previous.slots.filter((_, i) => i !== index) }))}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Box>)}<Button size="small" startIcon={<AddIcon />} disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={() => changeDay(day.dayIndex, previous => ({ slots: [...previous.slots, newBlock()] }))}>Add time block</Button></Stack>}
          </Paper>)}
        </Stack>
      </Paper>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Session and booking rules</Typography>
          <Stack spacing={2}>
            <TextField select size="small" label="Time between slot starts" value={draft.slotDuration} disabled={busy} onChange={e => setDraft(previous => ({ ...previous, slotDuration: Number(e.target.value) }))} helperText="Sessions must fit completely within a time block.">
              {[...new Set([30, 45, 60, 90, draft.slotDuration])].sort((a, b) => a - b).map(value => <MenuItem key={value} value={value}>{value} minutes</MenuItem>)}
            </TextField>
            {[
              ['maxAppointmentsPerDay', 'Maximum sessions per day'], ['minNoticePeriodHours', 'Minimum booking notice (hours)'], ['maxAdvanceBookingDays', 'Book up to (days ahead)'],
            ].map(([field, label]) => <TextField key={field} size="small" type="number" label={label} value={draft.limits[field]} disabled={busy} slotProps={{ htmlInput: { min: 1, step: 1 } }} onChange={e => setDraft(previous => ({ ...previous, limits: { ...previous.limits, [field]: Number(e.target.value) } }))} />)}
          </Stack>
          <Divider sx={{ my: 2 }} /><Typography variant="caption" color="text.secondary">Mode settings apply to new bookings. Existing sessions keep their confirmed mode.</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Leave and unavailable dates</Typography>
          <Stack spacing={1.5}>
            <TextField size="small" type="date" label="Unavailable date" value={leaveDate} disabled={leaveBusy} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={e => setLeaveDate(e.target.value)} />
            <TextField size="small" label="Reason (optional)" value={leaveReason} disabled={leaveBusy} onChange={e => setLeaveReason(e.target.value)} />
            <Button size="small" variant="outlined" disabled={leaveBusy || !leaveDate} startIcon={<AddIcon />} onClick={() => updateLeave()}>Add leave date</Button>
            {!exceptions.length && <Typography variant="caption" color="text.secondary">No leave dates added.</Typography>}
            {exceptions.map(item => <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Box><Chip size="small" label={item.date} /><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{item.reason}</Typography></Box><IconButton size="small" disabled={leaveBusy} aria-label={`Remove leave ${item.date}`} onClick={() => updateLeave(item.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></Box>)}
          </Stack>
        </Paper>
      </Stack>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button disabled={busy} onClick={() => { setDraft(saved); setError(''); setSuccess(''); }}>Discard changes</Button><Button variant="contained" disabled={busy} startIcon={<SaveOutlinedIcon />} onClick={save}>{busy ? 'Saving…' : 'Save schedule changes'}</Button></Box>
  </Stack>;
}

function AvatarDay({ day }) {
  return <Box sx={{ width: 30, height: 30, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark', fontSize: 11, fontWeight: 700 }}>{day.slice(0, 2).toUpperCase()}</Box>;
}
