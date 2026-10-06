import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Container,
  Grid, MenuItem, TextField, Typography
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import { api } from '../api';

const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
};

const reviewSteps = [
  { title: 'Request received', detail: 'We record your preferred date, time, and format.' },
  { title: 'Admin review', detail: 'Our care team reviews your request and needs.' },
  { title: 'Counselor assigned', detail: 'We confirm a suitable counselor and session.' },
];

export default function SessionRequest({ currentUser, onAuthRedirect }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    date: getTomorrow(),
    preferredTime: 'Afternoon',
    appointmentType: 'Online Consultation',
    intakeNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requestReference, setRequestReference] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.date) {
      setError('Choose a preferred date to continue.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const result = await api.requestAppointment({
        preferredDate: form.date,
        preferredTime: form.preferredTime,
        preferredFormat: form.appointmentType,
        intakeNotes: form.intakeNotes.trim(),
      });
      const careRequest = result?.request || result;
      setRequestReference(careRequest?.id || careRequest?._id || 'Request received');
    } catch (requestError) {
      setError(requestError.message || 'We could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 9 } }}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <CalendarMonthIcon color="primary" sx={{ fontSize: 40, mb: 1.5 }} />
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1 }}>Request a session</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Sign in to tell our care team when and how you would like to meet.</Typography>
            <Button variant="contained" onClick={onAuthRedirect} endIcon={<ArrowForwardIcon />}>Sign in to continue</Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!['patient', 'user'].includes(currentUser.role)) {
    return <Container maxWidth="sm" sx={{ py: 6 }}><Alert severity="info">Session requests are available to patients.</Alert></Container>;
  }

  if (requestReference) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 52, mb: 1.5 }} />
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1 }}>Request received</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 540, mx: 'auto', mb: 3 }}>
              Our admin team will review your preferences and assign a counselor. We will confirm the session details with you.
            </Typography>
            <Grid container spacing={2} sx={{ maxWidth: 680, mx: 'auto', mb: 3, py: 2, borderTop: 1, borderBottom: 1, borderColor: 'divider', textAlign: 'left' }}>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">REQUEST REFERENCE</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{requestReference}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">PREFERRED DATE</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{form.date}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">PREFERRED TIME</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{form.preferredTime}</Typography></Grid>
            </Grid>
            <Button variant="contained" onClick={() => navigate('/dashboard')}>Return to dashboard</Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ mb: 3.5, maxWidth: 760 }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1 }}>CARE TEAM REQUEST</Typography>
        <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1 }}>Request a session</Typography>
        <Typography variant="body1" color="text.secondary">Share your schedule and session preferences. Our admin team will match you with a counselor.</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      <Grid container spacing={{ xs: 2.5, md: 4 }} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Your preferences</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>These are preferences only; our team will confirm the final schedule.</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth required type="date" label="Preferred date" value={form.date}
                      onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: getTomorrow() } }}
                      helperText="Our team will confirm availability"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth select label="Preferred time" value={form.preferredTime} onChange={(event) => setForm((previous) => ({ ...previous, preferredTime: event.target.value }))}>
                      {['Morning', 'Afternoon', 'Evening'].map((time) => <MenuItem key={time} value={time}>{time}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth select label="Session format" value={form.appointmentType} onChange={(event) => setForm((previous) => ({ ...previous, appointmentType: event.target.value }))}>
                      <MenuItem value="Online Consultation">Online</MenuItem>
                      <MenuItem value="In-Person Consultation">In person</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth multiline minRows={4} label="What would you like support with?"
                      placeholder="Share anything that would help our care team understand your request."
                      value={form.intakeNotes}
                      onChange={(event) => setForm((previous) => ({ ...previous, intakeNotes: event.target.value }))}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 3 }}>
                  <Typography variant="caption" color="text.secondary">No counselor is selected in this request.</Typography>
                  <Button type="submit" variant="contained" endIcon={<ArrowForwardIcon />} disabled={submitting}>
                    {submitting ? <CircularProgress size={22} color="inherit" /> : 'Send session request'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ pt: { md: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Groups2OutlinedIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>What happens next</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {reviewSteps.map((step, index) => (
                <Box key={step.title} sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: index === 0 ? 'primary.main' : 'action.hover', color: index === 0 ? '#ffffff' : 'text.secondary', fontWeight: 700, fontSize: 14 }}>{index + 1}</Box>
                  <Box><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{step.title}</Typography><Typography variant="body2" color="text.secondary">{step.detail}</Typography></Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Your care team makes the match</Typography>
              <Typography variant="body2" color="text.secondary">Counselor assignment is handled by our admin team after reviewing your request.</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}