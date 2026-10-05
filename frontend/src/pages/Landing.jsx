import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Typography, Grid, Card, CardContent, CardMedia, Button, 
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Rating, Chip, Slider, Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Divider, CircularProgress, Alert, Avatar, Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { api } from '../api';

const SPECIALTIES = [
  'All Specialties',
  'Anxiety & OCD',
  'Relationship Counseling & Marriage',
  'Career Transition & Burnout',
  'LGBTQ+ Affirmative Therapy & Trauma',
  'Child & Adolescent Counseling'
];

export default function Landing({ onAuthRedirect, currentUser }) {
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [specialty, setSpecialty] = useState('All Specialties');
  const [maxPrice, setMaxPrice] = useState(150);
  const [minRating, setMinRating] = useState(0);

  // Booking Modal State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  
  // Date and slots State
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Intake & Payment details state
  const [intakeNotes, setIntakeNotes] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Snackbar Alert state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Tomorrow's date representation (calculated once on mount for render purity)
  const [minTomorrowDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Fetch Counselors
  const fetchCounselors = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const filters = {};
      if (searchQuery) filters.search = searchQuery;
      if (specialty !== 'All Specialties') filters.specialty = specialty;
      if (maxPrice < 150) filters.maxPrice = maxPrice;
      if (minRating > 0) filters.minRating = minRating;

      const data = await api.getCounselors(filters);
      setCounselors(data);
    } catch (err) {
      setError(err.message || 'Failed to load counselors.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, specialty, maxPrice, minRating]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchCounselors();
    });
  }, [fetchCounselors]);

  // Fetch Available Slots when Date changes
  useEffect(() => {
    if (selectedCounselor && selectedDate) {
      const loadSlots = async () => {
        try {
          setSlotsLoading(true);
          setSelectedSlot('');
          const data = await api.getCounselorSlots(selectedCounselor.id, selectedDate);
          setAvailableSlots(data.slots || []);
        } catch (err) {
          console.error('Error loading slots', err);
          setAvailableSlots([]);
        } finally {
          setSlotsLoading(false);
        }
      };
      loadSlots();
    }
  }, [selectedDate, selectedCounselor]);

  // Handle Book Dialog Trigger
  const handleOpenBooking = async (counselor) => {
    if (!currentUser) {
      onAuthRedirect(); // Open login modal if not logged in
      return;
    }
    if (currentUser.role !== 'patient') {
      setSnackbarMsg('Only patients can book appointments. Please log in as a patient.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    
    // Set default date to today or tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    setSelectedCounselor(counselor);
    setSelectedDate(dateString);
    setBookingOpen(true);
    setBookingStep(0);
    setIntakeNotes('');
    setPaymentDetails({ cardNumber: '', expiry: '', cvv: '', name: currentUser.name || '' });
    setBookingError('');
    setBookingSuccess(null);
    setSelectedType('');
    setAppointmentTypes([]);

    try {
      const types = await api.getCounselorAppointmentTypes(counselor.id);
      setAppointmentTypes(types || []);
      if (types && types.length > 0) {
        setSelectedType(types[0].name);
      } else {
        setSelectedType('Video Consultation');
      }
    } catch (err) {
      console.error('Error fetching appointment types:', err);
      setSelectedType('Video Consultation');
    }
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
  };

  const handleNextStep = () => {
    if (bookingStep === 0 && !selectedSlot) {
      setBookingError('Please select a time slot.');
      return;
    }
    setBookingError('');
    setBookingStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setBookingStep((prev) => prev - 1);
  };

  const handleBookingSubmit = async () => {
    // Payment validation
    const { cardNumber, expiry, cvv } = paymentDetails;
    if (!cardNumber || cardNumber.length < 16) {
      setBookingError('Please enter a valid 16-digit card number.');
      return;
    }
    if (!expiry || !expiry.includes('/') || expiry.length < 5) {
      setBookingError('Please enter card expiry in MM/YY format.');
      return;
    }
    if (!cvv || cvv.length < 3) {
      setBookingError('Please enter a 3 or 4 digit CVV code.');
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError('');
      const payload = {
        counselorId: selectedCounselor.id,
        date: selectedDate,
        time: selectedSlot,
        intakeNotes,
        paymentDetails,
        appointmentType: selectedType
      };

      const result = await api.bookAppointment(payload);
      setBookingSuccess(result.appointment);
      setBookingStep(3); // Go to success step
    } catch (err) {
      setBookingError(err.message || 'Failed to complete appointment booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Hero Banner Section */}
      <Box sx={{ 
        background: (theme) => theme.palette.mode === 'light'
          ? 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)'
          : 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)',
        py: 10, 
        mb: 6,
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" sx={{ 
            fontFamily: 'Outfit', 
            fontWeight: 800, 
            mb: 2,
            background: 'linear-gradient(90deg, #4f46e5, #9333ea)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Find Your Path to Healing & Clarity
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
            Connect with verified mental health counselors. Book virtual appointments instantly, manage schedule configurations, and experience seamless therapy in our secure virtual room.
          </Typography>
          {!currentUser && (
            <Button 
              variant="contained" 
              size="large" 
              className="glow-button"
              onClick={onAuthRedirect}
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
            >
              Get Started Now
            </Button>
          )}
        </Container>
      </Box>

      {/* Discovery Catalog Container */}
      <Container maxWidth="md">
        {/* Search Input Bar */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by counselor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 4 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" sx={{ mr: 1 }} />
              </InputAdornment>
            ),
            style: { borderRadius: 16 }
          }}
        />

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        {/* Load Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={50} />
          </Box>
        ) : counselors.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No counselors found matching your search.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {counselors.map((counselor) => (
              <Grid item xs={12} sm={6} md={4} key={counselor.id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.palette.mode === 'light'
                      ? '0 12px 20px -8px rgb(0 0 0 / 0.08)'
                      : '0 12px 20px -8px rgb(0 0 0 / 0.4)',
                    borderColor: 'primary.main'
                  }
                }}>
                  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar 
                      src={counselor.avatar} 
                      alt={counselor.name}
                      sx={{ width: 80, height: 80, mb: 2, border: '2px solid', borderColor: 'primary.light' }} 
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', lineHeight: 1.2 }}>
                      {counselor.name}
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600, mt: 0.5, fontSize: '0.85rem' }}>
                      {counselor.specialty}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                      <StarIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {counselor.rating.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({counselor.reviewCount})
                      </Typography>
                    </Box>
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1, pt: 0, px: 3, pb: 1, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '0.85rem',
                      lineHeight: 1.4
                    }}>
                      {counselor.bio}
                    </Typography>
                  </CardContent>

                  <Box sx={{ p: 3, pt: 1 }}>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      onClick={() => handleOpenBooking(counselor)}
                      sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                      Book Session
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Calendly Booking Dialog Wizard */}
      <Dialog 
        open={bookingOpen} 
        onClose={handleCloseBooking} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown={bookingLoading}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {bookingStep < 3 ? `Book with ${selectedCounselor?.name}` : 'Booking Completed!'}
        </DialogTitle>
        <DialogContent dividers>
          {bookingStep < 3 && (
            <Stepper activeStep={bookingStep} sx={{ mb: 4 }}>
              <Step><StepLabel>Date & Time</StepLabel></Step>
              <Step><StepLabel>Intake Notes</StepLabel></Step>
              <Step><StepLabel>Payment</StepLabel></Step>
            </Stepper>
          )}

          {bookingError && (
            <Alert severity="error" sx={{ mb: 3 }}>{bookingError}</Alert>
          )}

          {/* STEP 0: CALENDLY-LIKE SCHEDULER */}
          {bookingStep === 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateRangeIcon color="primary" /> 1. Select Date, Time & Meeting Type
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Meeting Type</InputLabel>
                <Select
                  value={selectedType}
                  label="Meeting Type"
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {appointmentTypes.length > 0 ? (
                    appointmentTypes.map((t) => (
                      <MenuItem key={t.id} value={t.name}>
                        {t.name === 'In-Person Consultation' ? 'Offline (In-Person Consultation)' : t.name} ({t.duration} mins)
                      </MenuItem>
                    ))
                  ) : (
                    <>
                      <MenuItem value="Video Consultation">Video Consultation (60 mins)</MenuItem>
                      <MenuItem value="Audio Consultation">Audio Consultation (45 mins)</MenuItem>
                      <MenuItem value="Chat Consultation">Chat Consultation (30 mins)</MenuItem>
                      <MenuItem value="In-Person Consultation">Offline (In-Person Consultation) (60 mins)</MenuItem>
                    </>
                  )}
                </Select>
              </FormControl>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Choose Date"
                    type="date"
                    fullWidth
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: minTomorrowDate // Min tomorrow
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Selected date represents counselor schedule limits.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Available Time Slots (60 mins)</Typography>
                  {slotsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : availableSlots.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                      No available slots on this day. Please pick another date.
                    </Typography>
                  ) : (
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: 1,
                      maxHeight: '180px',
                      overflowY: 'auto',
                      pr: 1
                    }}>
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedSlot === slot.time ? 'contained' : 'outlined'}
                          color={slot.available ? 'primary' : 'inherit'}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          size="small"
                          sx={{ 
                            fontSize: '0.85rem',
                            py: 1,
                            textDecoration: slot.available ? 'none' : 'line-through'
                          }}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STEP 1: INTAKE INFORMATION */}
          {bookingStep === 1 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" /> 2. Help us prepare for your session
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Please write a short description of what symptoms or challenges you wish to address. This remains confidential.
              </Typography>
              <TextField
                label="Intake & Clinical Notes"
                multiline
                rows={4}
                fullWidth
                placeholder="E.g., I have been feeling high levels of stress and having trouble sleeping..."
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
              />
            </Box>
          )}

          {/* STEP 2: BOOKING VERIFICATION & CONFIRMATION */}
          {bookingStep === 2 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCardIcon color="primary" /> 3. Verification & Booking Confirmation
              </Typography>
              <Box sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? '#f1f5f9' : '#334155', p: 2, borderRadius: 3, mb: 3 }}>
                <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600, color: 'success.main' }}>
                  NGO In-House Service: Free of Charge
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 0.5 }}>
                  Please confirm your session details by entering mock verification credentials below.
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Member Name"
                    fullWidth
                    size="small"
                    value={paymentDetails.name}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Membership / Verification Code (16 digits)"
                    placeholder="4242 4242 4242 4242"
                    fullWidth
                    size="small"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    inputProps={{ maxLength: 16 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Expiry Date (MM/YY)"
                    placeholder="12/28"
                    fullWidth
                    size="small"
                    value={paymentDetails.expiry}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="CVV Verification"
                    placeholder="123"
                    fullWidth
                    size="small"
                    type="password"
                    value={paymentDetails.cvv}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    inputProps={{ maxLength: 4 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STEP 3: BOOKING SUCCESS PAGE */}
          {bookingStep === 3 && bookingSuccess && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 1 }}>
                Session Booked!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your appointment with <strong>{selectedCounselor?.name}</strong> has been secured for <strong>{bookingSuccess.date}</strong> at <strong>{bookingSuccess.time}</strong>.
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, display: 'inline-block', textAlign: 'left' }}>
                <Typography variant="body2"><strong>Receipt Ref:</strong> {bookingSuccess.id}</Typography>
                <Typography variant="body2"><strong>Status:</strong> Confirmed</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {bookingStep < 3 ? (
            <>
              <Button onClick={handleCloseBooking} disabled={bookingLoading}>Cancel</Button>
              {bookingStep > 0 && (
                <Button onClick={handleBackStep} disabled={bookingLoading}>Back</Button>
              )}
              {bookingStep < 2 ? (
                <Button variant="contained" onClick={handleNextStep}>Continue</Button>
              ) : (
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={handleBookingSubmit}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? <CircularProgress size={24} /> : 'Confirm & Book Session'}
                </Button>
              )}
            </>
          ) : (
            <Button variant="contained" onClick={handleCloseBooking}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
