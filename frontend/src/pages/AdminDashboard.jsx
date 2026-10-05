import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Alert, TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../api';

export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User search/filter
  const [userQuery, setUserQuery] = useState('');

  // User creation dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createMobile, setCreateMobile] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('patient');
  
  // Counselor specific
  const [createSpecialty, setCreateSpecialty] = useState('');
  const [createBio, setCreateBio] = useState('');
  const [createCredentials, setCreateCredentials] = useState('');
  const [createLanguages, setCreateLanguages] = useState('English');
  const [createExperience, setCreateExperience] = useState('5');
  const [createRegNum, setCreateRegNum] = useState('');

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createMobile || !createName) {
      setCreateError('Please fill in Name and Mobile Number.');
      return;
    }
    const digits = createMobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      setCreateError('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError('');
      const payload = {
        mobile: createMobile,
        name: createName,
        role: createRole,
      };
      if (createEmail) {
        payload.email = createEmail;
      }
      if (createRole === 'counselor') {
        payload.specialty = createSpecialty;
        payload.bio = createBio;
        payload.credentials = createCredentials;
        payload.languages = createLanguages;
        payload.experience = createExperience;
        payload.registrationNumber = createRegNum;
      }
      await api.createAdminUser(payload);
      setSuccess(`${createRole.charAt(0).toUpperCase() + createRole.slice(1)} account created successfully.`);
      setCreateOpen(false);
      // Clear forms
      setCreateEmail('');
      setCreateMobile('');
      setCreateName('');
      setCreateRole('patient');
      setCreateSpecialty('');
      setCreateBio('');
      setCreateCredentials('');
      setCreateLanguages('English');
      setCreateExperience('5');
      setCreateRegNum('');
      
      // Refresh user lists and stats
      const u = await api.getAdminUsers();
      setUsers(u);
      const s = await api.getAdminStats();
      setStats(s);
    } catch (err) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setCreateLoading(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const u = await api.getAdminUsers();
      setUsers(u);

      const txs = await api.getAdminTransactions();
      setTransactions(txs);

      const s = await api.getAdminStats();
      setStats(s);

    } catch (err) {
      setError(err.message || 'Failed to load administrator telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      Promise.resolve().then(() => {
        fetchAdminData();
      });
    }
  }, [currentUser, fetchAdminData]);

  // Handle Counselor Credentials approval
  const handleApproveCounselor = async (counselorId) => {
    try {
      setError('');
      setSuccess('');
      await api.updateAdminUserStatus(counselorId, { approved: true });
      setSuccess('Counselor application approved successfully.');
      
      // Refresh
      const u = await api.getAdminUsers();
      setUsers(u);
      const s = await api.getAdminStats();
      setStats(s);
    } catch (err) {
      setError(err.message || 'Failed to approve counselor.');
    }
  };

  // Handle User suspension toggle
  const handleToggleSuspension = async (userId, currentSuspension) => {
    try {
      setError('');
      setSuccess('');
      await api.updateAdminUserStatus(userId, { suspended: !currentSuspension });
      setSuccess(`User status updated: ${!currentSuspension ? 'Suspended' : 'Activated'}`);
      
      // Refresh
      const u = await api.getAdminUsers();
      setUsers(u);
    } catch (err) {
      setError(err.message || 'Failed to update user suspension status.');
    }
  };

  // Reset database back to default seed data
  const handleResetSystem = async () => {
    if (!window.confirm('Are you sure you want to reset all database variables back to seeded defaults? All new appointments and users will be cleared.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await api.resetDatabase();
      setSuccess('Database reset completed successfully.');
      
      // Reload
      const u = await api.getAdminUsers();
      setUsers(u);
      const txs = await api.getAdminTransactions();
      setTransactions(txs);
      const s = await api.getAdminStats();
      setStats(s);
    } catch (err) {
      setError(err.message || 'Failed to reset system database.');
    } finally {
      setLoading(false);
    }
  };

  // Filtering calculations
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(userQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userQuery.toLowerCase())
  );

  const pendingCounselors = users.filter(u => u.role === 'counselor' && !u.approved);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Title */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800 }}>
            System Governance Platform
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Approve credentials, monitor transactions ledger, and suspension logs.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setCreateOpen(true)}
          >
            Create User / Counselor
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            startIcon={<RestartAltIcon />}
            onClick={handleResetSystem}
          >
            Reset Demo Data
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 4 }}>{success}</Alert>}

      {/* Analytics telemetry */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', borderRadius: 3 }}>
                  <PeopleAltIcon />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Patients</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {stats.patientsCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(167, 139, 250, 0.1)', color: 'secondary.main', borderRadius: 3 }}>
                  <SecurityIcon />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Counselors</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {stats.counselorsCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main', borderRadius: 3 }}>
                  <BarChartIcon />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Active Sessions</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {stats.activeBookingsCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'primary.dark', color: '#ffffff' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.15)', borderRadius: 3 }}>
                  <ReceiptIcon />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Completed Sessions</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {stats.completedBookingsCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="User Directory" sx={{ fontWeight: 600, fontSize: '1rem' }} />
          <Tab 
            label={`Pending Approvals (${pendingCounselors.length})`} 
            sx={{ fontWeight: 600, fontSize: '1rem' }} 
          />
          <Tab label="Booking Ledger" sx={{ fontWeight: 600, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* TAB 0: USER DIRECTORY */}
      {activeTab === 0 && (
        <Box>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search directory by username, email address, role classification..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              style: { borderRadius: 12 }
            }}
          />

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>System Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date Registered</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Block Controls</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role.toUpperCase()} 
                        size="small" 
                        color={user.role === 'admin' ? 'secondary' : user.role === 'counselor' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {user.suspended ? (
                        <Chip label="Suspended" color="error" size="small" variant="filled" />
                      ) : (
                        <Chip label="Active" color="success" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      {user.role !== 'admin' ? (
                        <Button 
                          variant="outlined" 
                          size="small"
                          color={user.suspended ? 'success' : 'error'}
                          onClick={() => handleToggleSuspension(user.id, user.suspended)}
                        >
                          {user.suspended ? 'Reactivate' : 'Suspend'}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Immutable</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: PENDING COUNSELORS */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
            Counselor Verification Panel
          </Typography>
          {pendingCounselors.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="body1" color="text.secondary">
                No pending counselor registration applications.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Therapy Specialty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Credentials / Licensure</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Verify Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingCounselors.map((counselor) => (
                    <TableRow key={counselor.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{counselor.name}</TableCell>
                      <TableCell>{counselor.email}</TableCell>
                      <TableCell>{counselor.specialty}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {counselor.credentials}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <IconButton 
                            color="success" 
                            onClick={() => handleApproveCounselor(counselor.id)}
                            sx={{ border: '1px solid', borderColor: 'success.light' }}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* TAB 2: BOOKING LEDGER */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
            Booking Confirmation Ledger
          </Typography>
          {transactions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="body1" color="text.secondary">
                No booking histories logged.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Booking ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Patient Billed</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Therapist Provider</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Booking Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Verification Details</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Ledger Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell sx={{ fontWeight: 'mono', fontSize: '0.85rem' }}>{tx.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{tx.patientName}</TableCell>
                      <TableCell>{tx.counselorName}</TableCell>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell>{tx.paymentMethod}</TableCell>
                      <TableCell align="right">
                        <Chip label={tx.status} color="success" size="small" variant="filled" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      {/* Create User/Counselor Dialog Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Create User or Counselor Account
        </DialogTitle>
        <DialogContent dividers>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <form onSubmit={handleCreateUser}>
            <TextField
              label="Full Name"
              fullWidth
              margin="normal"
              size="small"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <TextField
              label="Email Address (optional)"
              type="email"
              fullWidth
              margin="normal"
              size="small"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
            <TextField
              label="Mobile Number (for OTP Login)"
              placeholder="e.g. 9876543210"
              fullWidth
              margin="normal"
              size="small"
              required
              value={createMobile}
              onChange={(e) => setCreateMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputProps={{ maxLength: 10 }}
            />
            
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Account Role</InputLabel>
              <Select
                value={createRole}
                label="Account Role"
                onChange={(e) => setCreateRole(e.target.value)}
              >
                <MenuItem value="patient">Patient / Client</MenuItem>
                <MenuItem value="counselor">Therapist / Counselor</MenuItem>
              </Select>
            </FormControl>

            {createRole === 'counselor' && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Therapist License & Details</Typography>
                <TextField
                  label="Medical Specialty"
                  fullWidth
                  margin="normal"
                  size="small"
                  required
                  placeholder="e.g. Anxiety & OCD, Relationships"
                  value={createSpecialty}
                  onChange={(e) => setCreateSpecialty(e.target.value)}
                />
                <TextField
                  label="Licensure / Credentials"
                  fullWidth
                  margin="normal"
                  size="small"
                  required
                  placeholder="e.g. Licensed LCSW #39420"
                  value={createCredentials}
                  onChange={(e) => setCreateCredentials(e.target.value)}
                />
                <TextField
                  label="Languages (comma separated)"
                  fullWidth
                  margin="normal"
                  size="small"
                  placeholder="e.g. English, Spanish"
                  value={createLanguages}
                  onChange={(e) => setCreateLanguages(e.target.value)}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Experience (years)"
                      type="number"
                      fullWidth
                      margin="normal"
                      size="small"
                      value={createExperience}
                      onChange={(e) => setCreateExperience(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Reg Number (optional)"
                      fullWidth
                      margin="normal"
                      size="small"
                      placeholder="e.g. LCSW-10492"
                      value={createRegNum}
                      onChange={(e) => setCreateRegNum(e.target.value)}
                    />
                  </Grid>
                </Grid>
                <TextField
                  label="Bio / Professional Biography"
                  multiline
                  rows={3}
                  fullWidth
                  margin="normal"
                  size="small"
                  value={createBio}
                  onChange={(e) => setCreateBio(e.target.value)}
                />
              </Box>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createLoading}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateUser}
            disabled={createLoading}
          >
            {createLoading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
