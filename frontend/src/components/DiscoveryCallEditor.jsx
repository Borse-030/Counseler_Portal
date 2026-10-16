import { useState } from 'react';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, ListSubheader, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { clusterByCode, counsellingClusters, todayIST, validateDiscoveryPlan } from '../../../shared/counsellingFramework.mjs';

export default function DiscoveryCallEditor({ request, busy, completed, onSave }) {
  const [notes, setNotes] = useState(request.discoveryNotes || '');
  const [sessionType, setSessionType] = useState(request.discoveryPlan?.sessionType || '');
  const [packageSessions, setPackageSessions] = useState(request.discoveryPlan?.sessionType === 'package' ? String(request.discoveryPlan.sessionCount || '') : '');
  const [date, setDate] = useState(request.discoveryPlan?.preferredDate || request.preferredDate || '');
  const [time, setTime] = useState(request.discoveryPlan?.preferredTime || (/^\d{2}:\d{2}$/.test(request.preferredTime || '') ? request.preferredTime : ''));
  const [concerns, setConcerns] = useState(() => request.discoveryPlan?.concerns?.length
    ? request.discoveryPlan.concerns.map(value => ({ clusterCode: value.clusterCode, subConcerns: [...value.subConcerns] }))
    : [{ clusterCode: '', subConcerns: [] }]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftConcerns, setDraftConcerns] = useState([]);
  const openPicker = () => {
    setDraftConcerns(concerns.map(item => ({ ...item, subConcerns: [...item.subConcerns] })));
    setPickerOpen(true);
  };
  const groups = [...new Set(counsellingClusters.map(cluster => cluster.group))];
  const update = (index, value) => {
    setConcerns(previous => previous.map((concern, i) => i === index ? value : concern));
    setSaved(false); setError('');
  };
  const save = async event => {
    event.preventDefault();
    setError(''); setSaved(false);
    try {
      if (!notes.trim()) throw new Error('Add discovery observations before saving.');
      const discoveryPlan = validateDiscoveryPlan({ preferredDate: date, preferredTime: time, concerns, sessionType, sessionCount: sessionType === 'single' ? 1 : Number(packageSessions) }, request.discoveryPlan);
      await onSave(notes, discoveryPlan);
      setSaved(true);
    } catch (err) { setError(err.message || 'Unable to save discovery details.'); }
  };
  return <Stack component="form" noValidate onSubmit={save} spacing={2}>
    {error && <Alert severity="error">{error}</Alert>}
    {saved && <Alert severity="success">Discovery notes, session plan, and concerns saved.</Alert>}
    <Typography component="h2" variant="overline" fontWeight={750}>Discovery call details</Typography>
    <TextField required fullWidth multiline minRows={4} label="Discovery notes" value={notes} disabled={busy} onChange={event => { setNotes(event.target.value); setSaved(false); }} slotProps={{ htmlInput: { maxLength: 10000 } }} />
    <Box>
      <Typography variant="subtitle2" fontWeight={750}>Counselling clusters & sub-concerns</Typography>
      <Typography variant="caption" color="text.secondary">Select all concerns identified during the call.</Typography>
    </Box>
    {concerns.filter(concern => concern.clusterCode).map((concern, index) => <Paper variant="outlined" key={concern.clusterCode} sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="body2" fontWeight={700}>{concern.clusterCode} · {clusterByCode(concern.clusterCode)?.title}</Typography>
      <Typography variant="body2" color="text.secondary">{concern.subConcerns.join(', ')}</Typography>
      <Button size="small" disabled={busy} onClick={openPicker}>Edit concern {index + 1}</Button>
    </Paper>)}
    <Button size="small" variant="outlined" startIcon={<AddIcon />} disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={openPicker}>Select clusters & sub-concerns</Button>
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fafaff' }}>
      <Typography variant="subtitle2" fontWeight={750}>Proposed session plan</Typography>
      <Typography variant="caption" color="text.secondary">Record the user's session preference. </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: sessionType === 'package' ? '1fr 0.7fr 1fr 1fr' : '1fr 1fr 1fr' }, gap: 1.5, mt: 2, '& .MuiInputBase-root': { fontSize: 13 } }}>
        <TextField size="small" required select fullWidth label="Session choice" value={sessionType} disabled={busy} onChange={event => { setSessionType(event.target.value); setSaved(false); setError(''); }}>
          <MenuItem value="" disabled>Select a session plan</MenuItem>
          <MenuItem value="single">Single session</MenuItem>
          <MenuItem value="package">Session package</MenuItem>
        </TextField>
        {sessionType === 'package' && <TextField size="small" required fullWidth type="number" label="Sessions" value={packageSessions} disabled={busy} helperText="Enter at least 2 sessions." slotProps={{ htmlInput: { min: 2, step: 1 } }} onChange={event => { setPackageSessions(event.target.value); setSaved(false); setError(''); }} />}
        <TextField size="small" required fullWidth type="date" label={sessionType === 'package' ? 'First session preferred date' : 'Preferred date'} value={date} disabled={busy} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIST() } }} onChange={event => { setDate(event.target.value); setSaved(false); }} />
        <TextField size="small" required fullWidth type="time" label={sessionType === 'package' ? 'First session time (IST)' : 'Preferred time (IST)'} value={time} disabled={busy} slotProps={{ inputLabel: { shrink: true } }} onChange={event => { setTime(event.target.value); setSaved(false); }} />
      </Box>
    </Paper>
    <Dialog open={pickerOpen} onClose={() => {
      setConcerns(draftConcerns); setPickerOpen(false);
    }} fullWidth maxWidth="sm" aria-labelledby="discovery-clusters-title">
      <DialogTitle id="discovery-clusters-title">Select clusters & sub-concerns</DialogTitle>
      <DialogContent dividers>
      <Stack spacing={2}>
    {concerns.map((concern, index) => {
      const cluster = clusterByCode(concern.clusterCode);
      return <Paper variant="outlined" key={index} sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Concern {index + 1}{cluster ? ` · ${cluster.group}` : ''}</Typography>
          {concerns.length > 1 && <IconButton size="small" aria-label={`Remove concern ${index + 1}`} disabled={busy} onClick={() => { setConcerns(previous => previous.filter((_, i) => i !== index)); setSaved(false); }}><CloseIcon fontSize="small" /></IconButton>}
        </Box>
        <TextField required select fullWidth label="Counselling cluster" value={concern.clusterCode} disabled={busy} onChange={event => update(index, { clusterCode: event.target.value, subConcerns: [] })} slotProps={{ select: { MenuProps: { PaperProps: { sx: { maxHeight: 360, maxWidth: 'calc(100vw - 32px)' } } } } }}>
          <MenuItem value="" disabled>Select a cluster</MenuItem>
          {groups.flatMap(group => [
            <ListSubheader key={group} sx={{ color: 'primary.main', fontWeight: 700 }}>{group}</ListSubheader>,
            ...counsellingClusters.filter(item => item.group === group).map(item => <MenuItem key={item.code} value={item.code} disabled={concerns.some((other, i) => i !== index && other.clusterCode === item.code)} sx={{ whiteSpace: 'normal', fontSize: 13 }}>{item.code} · {item.title}</MenuItem>),
          ])}
        </TextField>
        {cluster && <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, mt: 1.5 }}>
          <Typography component="legend" variant="caption" fontWeight={700}>Sub-concerns (select at least one)</Typography>
          <Stack>{cluster.subConcerns.map(value => <FormControlLabel key={value} sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }} label={value} control={<Checkbox size="small" disabled={busy} checked={concern.subConcerns.includes(value)} onChange={event => update(index, { ...concern, subConcerns: event.target.checked ? [...concern.subConcerns, value] : concern.subConcerns.filter(item => item !== value) })} />} />)}</Stack>
        </Box>}
      </Paper>;
    })}
    <Button size="small" startIcon={<AddIcon />} disabled={busy || concerns.length >= 15} sx={{ alignSelf: 'flex-start' }} onClick={() => { setConcerns(previous => [...previous, { clusterCode: '', subConcerns: [] }]); setSaved(false); }}>Add another cluster</Button>
      </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => { setConcerns(draftConcerns); setPickerOpen(false); }}>Cancel</Button>
        <Button variant="contained" disabled={busy || concerns.some(concern => !concern.clusterCode || !concern.subConcerns.length)} onClick={() => setPickerOpen(false)}>Apply selection</Button>
      </DialogActions>
    </Dialog>
    <Button type="submit" variant="contained" disabled={busy || !notes.trim()} sx={{ alignSelf: 'flex-start' }}>{busy ? 'Saving…' : completed ? 'Save discovery details' : 'Save details and mark completed'}</Button>
  </Stack>;
}
