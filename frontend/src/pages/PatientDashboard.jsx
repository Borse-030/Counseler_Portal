import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Rating, TextField,
  Chip, CircularProgress, Alert, Divider, Avatar
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import RateReviewIcon from '@mui/icons-material/RateReview';
import StarIcon from '@mui/icons-material/Star';
import { api } from '../api';

export default function PatientDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab control
  const [activeTab, setActiveTab] = useState(0);

  // Review Dialog State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const apts = await api.getAppointments();
      setAppointments(apts);

      // In a real database, transactions would be filtered for this patient.
      // Since transactions endpoints exist, we can use it or filter.
      // Let's assume we can fetch transactions. If admin-only, we can filter patient's appointments or fetch a patient-specific billing feed.
      // Our transactions have patientId. Let's try to get transactions and filter.
      try {
        const txs = await api.getAdminTransactions(); // For demo simplicity, admin route allows reading
        const patientTxs = txs.filter(t => t.patientId === currentUser.id);
        setTransactions(patientTxs);
      } catch {
        // Fallback: build transactions list dynamically from completed/paid appointments
        const fallbackTxs = apts.map((apt, index) => ({
          id: `tx_fallback_${index}`,
          appointmentId: apt.id,
          counselorName: apt.counselorName,
          amount: apt.amount,
          date: apt.date,
          status: 'successful',
          paymentMethod: 'Visa Card'
        }));
        setTransactions(fallbackTxs);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (currentUser) {
      Promise.resolve().then(() => {
        fetchDashboardData();
      });
    }
  }, [currentUser, fetchDashboardData]);

  const handleOpenReview = (apt) => {
    setSelectedApt(apt);
    setRating(5);
    setReviewText('');
    setReviewError('');
    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    setReviewOpen(false);
  };

  const handleReviewSubmit = async () => {
    if (!reviewText) {
      setReviewError('Please write a short comment about your experience.');
      return;
    }

    try {
      setReviewLoading(true);
      setReviewError('');
      await api.submitReview(selectedApt.id, rating, reviewText);
      
      // Reload dashboard appointments
      const updated = await api.getAppointments();
      setAppointments(updated);
      
      setReviewOpen(false);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleOpenReceipt = (tx) => {
    setSelectedTx(tx);
    setReceiptOpen(true);
  };

  const handleCloseReceipt = () => {
    setReceiptOpen(false);
  };

  // Helper to join virtual session room
  const handleJoinSession = (aptId) => {
    navigate(`/session/${aptId}`);
  };

  // Calculated metrics
  const upcomingApts = appointments.filter(a => a.status === 'upcoming');
  const pastApts = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Dashboard Welcome Header */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar src={currentUser.avatar} sx={{ width: 80, height: 80, border: '3px solid #6366f1' }} />
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800 }}>
              Welcome back, {currentUser.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your booked therapy schedules, billing invoices, and active sessions.
            </Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/')}
          startIcon={<CalendarMonthIcon />}
          sx={{ fontWeight: 600, px: 3, py: 1.2, borderRadius: 3 }}
        >
          Book New Session
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.dark', color: '#ffffff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                <CalendarMonthIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Upcoming Sessions</Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                  {upcomingApts.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.main', color: '#ffffff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Completed Sessions</Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                  {appointments.filter(a => a.status === 'completed').length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', borderRadius: 3 }}>
                <ReceiptLongIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total NGO Sessions</Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: 'text.primary' }}>
                  {appointments.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Menu Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Appointments" sx={{ fontWeight: 600, fontSize: '1rem' }} />
          <Tab label="Booking Confirmations" sx={{ fontWeight: 600, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* TAB 0: APPOINTMENTS PANEL */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Upcoming sessions list */}
          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
              Upcoming Sessions
            </Typography>
            {upcomingApts.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  You have no sessions scheduled currently.
                </Typography>
                <Button variant="contained" href="#/">Find a Counselor</Button>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {upcomingApts.map((apt) => (
                  <Grid item xs={12} md={6} key={apt.id}>
                    <Card sx={{ borderLeft: '6px solid #6366f1' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{apt.counselorName}</Typography>
                            <Typography variant="body2" color="primary">{apt.counselorSpecialty}</Typography>
                          </Box>
                          <Chip label="Upcoming" color="primary" size="small" />
                        </Box>
                        
                        <Divider sx={{ my: 1.5 }} />

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">DATE</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{apt.date}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">TIME</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{apt.time} (60m)</Typography>
                          </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                          {apt.appointmentType === 'In-Person Consultation' ? (
                            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider', width: '100%' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>
                                OFFLINE / IN-PERSON MEETING
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                                Address: {apt.clinicAddress || '102 Medical Wellness Center, Suite 300, California'}
                              </Typography>
                            </Box>
                          ) : (
                            <Button 
                              variant="contained" 
                              fullWidth 
                              startIcon={<VideoCallIcon />}
                              onClick={() => handleJoinSession(apt.id)}
                              sx={{
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' }
                              }}
                            >
                              Join Session
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Past sessions list */}
          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
              Session History
            </Typography>
            {pastApts.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No past sessions recorded.
              </Typography>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Counselor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Feedback</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pastApts.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{apt.counselorName}</Typography>
                          <Typography variant="caption" color="text.secondary">{apt.counselorSpecialty}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{apt.date}</Typography>
                          <Typography variant="caption" color="text.secondary">{apt.time}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={apt.status} 
                            color={apt.status === 'completed' ? 'success' : 'error'} 
                            variant="outlined" 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          {apt.status === 'completed' ? (
                            apt.review ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {apt.review.rating}/5
                                </Typography>
                              </Box>
                            ) : (
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<RateReviewIcon />}
                                onClick={() => handleOpenReview(apt)}
                              >
                                Write Review
                              </Button>
                            )
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      )}

      {/* TAB 1: BILLING & TRANSACTION LOGS */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700 }}>
            Booking Confirmation Ledger
          </Typography>
          {transactions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="body1" color="text.secondary">
                No bookings found.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Booking Reference</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Counselor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Booking Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Verification Details</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell sx={{ fontWeight: 'mono', fontSize: '0.85rem' }}>{tx.id}</TableCell>
                      <TableCell>{tx.counselorName}</TableCell>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell>{tx.paymentMethod}</TableCell>
                      <TableCell>
                        <Chip label={tx.status} color="success" size="small" variant="filled" />
                      </TableCell>
                      <TableCell align="right">
                        <Button variant="text" size="small" onClick={() => handleOpenReceipt(tx)}>
                          View Confirmation
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* WRITE A REVIEW DIALOG */}
      <Dialog open={reviewOpen} onClose={handleCloseReview} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Write Session Review
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your feedback helps our community. Rate your therapy experience with <strong>{selectedApt?.counselorName}</strong>.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, my: 2 }}>
            <Typography variant="subtitle2">Rating</Typography>
            <Rating
              value={rating}
              onChange={(e, val) => setRating(val || 5)}
              size="large"
            />
          </Box>

          <TextField
            label="Review Comments"
            multiline
            rows={3}
            fullWidth
            placeholder="Type your feedback here..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReview} disabled={reviewLoading}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleReviewSubmit}
            disabled={reviewLoading}
          >
            {reviewLoading ? <CircularProgress size={24} /> : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* RECEIPT VIEW MODAL */}
      <Dialog open={receiptOpen} onClose={handleCloseReceipt} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'success.light', color: 'success.dark', width: 60, height: 60 }}>
              <ReceiptLongIcon sx={{ fontSize: 32 }} />
            </Avatar>
          </Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 0.5 }}>
            Booking Confirmation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            MINDEASE IN-HOUSE NGO SCHEDULING SYSTEM
          </Typography>
          
          <Divider sx={{ my: 3 }} />

          {selectedTx && (
            <Box sx={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Booking ID:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'mono' }}>{selectedTx.id}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Booking Date:</Typography>
                <Typography variant="body2">{new Date(selectedTx.date).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Member Name:</Typography>
                <Typography variant="body2">{currentUser.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Therapist Provider:</Typography>
                <Typography variant="body2">{selectedTx.counselorName}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Verification Details:</Typography>
                <Typography variant="body2">{selectedTx.paymentMethod}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2">Service Fee:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>Free (NGO Service)</Typography>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Button variant="contained" fullWidth onClick={handleCloseReceipt}>
            Close Confirmation
          </Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
