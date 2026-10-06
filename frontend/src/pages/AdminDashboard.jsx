import CareWorkflow from '../components/CareWorkflow';
import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Typography, Grid, Card, CardContent, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Alert, TextField, IconButton, Dialog, DialogTitle, Stack, Accordion, AccordionSummary, AccordionDetails,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api } from '../api';

function AccountList({ users, onToggle, showCounselorDetails = false, showPatientLifecycle = false, requests = [], appointments = [] }) {
  if (!users.length) return <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">No accounts in this list.</Typography></Paper>;
  if (showCounselorDetails) return <Grid container spacing={2}>{users.map(user => <Grid item xs={12} sm={6} lg={4} key={user.id}>
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2.5 }}><CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <Box><Typography variant="subtitle1" fontWeight={750}>{user.name}</Typography><Typography variant="body2" color="text.secondary">{user.email || 'Email not provided'}</Typography></Box>
        <Chip size="small" color={user.suspended ? 'default' : 'success'} label={user.suspended ? 'Deactivated' : 'Active'} />
      </Box>
      <Typography variant="body2" fontWeight={650}>{user.specialty || 'General counseling'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{user.credentials || 'Credentials not listed'}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{user.experience || 0} years experience · Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <Chip size="small" variant="outlined" label={`${requests.filter(request => request.finalCounselorId === user.id && !['closed', 'rejected'].includes(request.status)).length} assigned`} />
        <Chip size="small" variant="outlined" color="success" label={`${appointments.filter(appointment => appointment.counselorId === user.id && appointment.status === 'completed' && ['session', 'follow_up', ''].includes(appointment.appointmentKind)).length} sessions done`} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Typography variant="caption" color="text.secondary">Languages: {(user.languages || []).join(', ') || 'Not listed'}</Typography>
        <Button size="small" color={user.suspended ? 'success' : 'error'} variant="outlined" onClick={() => onToggle(user.id, user.suspended)}>{user.suspended ? 'Reactivate' : 'Deactivate'}</Button>
      </Box>
    </CardContent></Card>
  </Grid>)}</Grid>;
  return <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
    <Table size="small">
      <TableHead><TableRow>
        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell><TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
        {showCounselorDetails && <><TableCell sx={{ fontWeight: 700 }}>Specialty</TableCell><TableCell sx={{ fontWeight: 700 }}>Experience</TableCell></>}
        {showPatientLifecycle && <><TableCell sx={{ fontWeight: 700 }}>Track</TableCell><TableCell sx={{ fontWeight: 700 }}>Discovery</TableCell><TableCell sx={{ fontWeight: 700 }}>Assigned counselor</TableCell><TableCell sx={{ fontWeight: 700 }}>Sessions done</TableCell></>}
        <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Account</TableCell>
      </TableRow></TableHead>
      <TableBody>{users.map(user => {
        const request = requests.find(item => item.patientId === user.id);
        const discovery = !request ? 'Not started' : request.status === 'accepted' ? 'Pending' : ['discovery_completed', 'matched', 'active', 'closed'].includes(request.status) ? 'Completed' : 'Registration review';
        return <TableRow key={user.id} hover>
        <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell><TableCell>{user.email || '—'}</TableCell>
        {showCounselorDetails && <><TableCell>{user.specialty || '—'}</TableCell><TableCell>{user.experience ? `${user.experience} years` : '—'}</TableCell></>}
        {showPatientLifecycle && <><TableCell>{request?.supportType || request?.caseType || request?.preferredFormat || 'Not specified'}</TableCell><TableCell><Chip size="small" color={discovery === 'Pending' ? 'warning' : discovery === 'Completed' ? 'success' : 'default'} label={discovery === 'Pending' ? 'Not done' : discovery} />{discovery === 'Completed' && request?.timeline?.length > 0 && <Typography variant="caption" display="block" color="text.secondary">{new Date([...request.timeline].reverse().find(event => event.status === 'discovery_completed')?.at || request.updatedAt).toLocaleDateString()}</Typography>}</TableCell><TableCell>{request?.finalCounselorName || 'Unassigned'}</TableCell><TableCell>{appointments.filter(appointment => appointment.patientId === user.id && appointment.status === 'completed' && ['session', 'follow_up', ''].includes(appointment.appointmentKind)).length}</TableCell></>}
        <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</TableCell>
        <TableCell align="right"><Button size="small" variant="outlined" color={user.suspended ? 'success' : 'error'} onClick={() => onToggle(user.id, user.suspended)}>{user.suspended ? 'Reactivate' : 'Deactivate'}</Button></TableCell>
      </TableRow>})}</TableBody>
    </Table>
  </TableContainer>;
}

export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [careRequests, setCareRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestQuery, setRequestQuery] = useState('');
  const [decisionRequest, setDecisionRequest] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);

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


      const apts = await api.getAppointments();
      setAppointments(apts);

      const requests = await api.getSessionRequests();
      setCareRequests(requests);

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

  // Filtering calculations
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(userQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userQuery.toLowerCase())
  );

  const pendingCounselors = users.filter(u => u.role === 'counselor' && !u.approved);
  const activePatients = filteredUsers.filter(u => ['user', 'patient'].includes(u.role) && u.approved && !u.suspended);
  const activeCounselors = filteredUsers.filter(u => u.role === 'counselor' && u.approved && !u.suspended);
  const deactivatedPatients = filteredUsers.filter(u => ['user', 'patient'].includes(u.role) && u.suspended);
  const deactivatedCounselors = filteredUsers.filter(u => u.role === 'counselor' && u.suspended);
  const pendingRegistrations = careRequests.filter(request => ['submitted', 'assigned'].includes(request.status)).length;
  const discoveryPending = careRequests.filter(request => request.status === 'accepted').length;
  const assignmentPending = careRequests.filter(request => request.status === 'discovery_completed').length;
  const registrationRequests = careRequests.filter(request => ['submitted', 'assigned'].includes(request.status)).filter(request => {
    const user = users.find(candidate => candidate.id === request.patientId);
    const query = requestQuery.trim().toLowerCase();
    return !query || [request.patientName, request.patientMobile, request.intakeNotes, user?.email].some(value => String(value || '').toLowerCase().includes(query));
  });

  const decideRegistration = async (decision, request = decisionRequest) => {
    if (!request) return;
    if (decision === 'rejected' && !decisionReason.trim()) return;
    try {
      setDecisionBusy(true);
      await api.decideSessionRequest(request.id, { decision, reason: decisionReason.trim() });
      setDecisionRequest(null);
      setDecisionReason('');
      setSuccess(decision === 'accepted' ? `${request.patientName}'s registration was approved.` : `${request.patientName}'s registration was rejected.`);
      await fetchAdminData();
    } catch (err) {
      setError(err.message || 'Unable to update registration.');
    } finally {
      setDecisionBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      {/* Title */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '-0.035em' }}>
            Administrative Governance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review registrations, track discovery conversations, and coordinate counselor assignment.
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
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 4 }}>{success}</Alert>}

      {/* Live operations at a glance */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', borderRadius: 3 }}>
                  <PeopleAltIcon />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Pending intake</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {pendingRegistrations}
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
                  <Typography variant="caption" color="text.secondary">Discovery pending</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {discoveryPending}
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
                  <Typography variant="caption" color="text.secondary">Ready to assign</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {assignmentPending}
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
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Active counselors</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                    {activeCounselors.length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 48, '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 650 } }}>
          <Tab label={`Registration requests (${pendingRegistrations})`} sx={{ fontWeight: 600 }} />
          <Tab label={`Approved users (${users.filter(u => ['user', 'patient'].includes(u.role) && u.approved && !u.suspended).length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`Counselors (${users.filter(u => u.role === 'counselor' && u.approved && !u.suspended).length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`Deactivated users (${deactivatedPatients.length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`Deactivated counselors (${deactivatedCounselors.length})`} sx={{ fontWeight: 600 }} />
          <Tab label="Counselor verification" sx={{ fontWeight: 600 }} />
          <Tab label="Session register" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* Pending patient registration requests: approval and rejection actions */}
      {activeTab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>New applications are reviewed for eligibility first. Counselor assignment happens after approval and discovery.</Alert>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField size="small" placeholder="Search applicant, phone, email, or intake note" value={requestQuery} onChange={event => setRequestQuery(event.target.value)} sx={{ flex: 1, maxWidth: 460 }} InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{registrationRequests.length} awaiting review</Typography>
          </Paper>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}><Table>
            <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
              {['Applicant / contact', 'Track & preference', 'Intake context', 'Applied', 'Actions'].map(title => <TableCell key={title} sx={{ fontWeight: 750, whiteSpace: 'nowrap' }}>{title}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>{registrationRequests.map(request => {
              const user = users.find(candidate => candidate.id === request.patientId);
              return <TableRow key={request.id} hover>
                <TableCell sx={{ minWidth: 190 }}><Typography fontWeight={700}>{request.patientName}</Typography><Typography variant="body2" color="text.secondary">{user?.email || 'Email not provided'}</Typography><Typography variant="body2" color="text.secondary">{request.patientMobile || 'Phone not provided'}</Typography></TableCell>
                <TableCell sx={{ minWidth: 150 }}><Chip size="small" color="primary" variant="outlined" label={request.preferredFormat || 'Counseling request'} /><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{request.preferredLanguage || 'Language not specified'}</Typography></TableCell>
                <TableCell sx={{ minWidth: 240, maxWidth: 360, whiteSpace: 'normal' }}>{request.intakeNotes || 'No additional intake note.'}</TableCell>
                <TableCell sx={{ minWidth: 135, whiteSpace: 'nowrap' }}>{request.createdAt ? new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</TableCell>
                <TableCell sx={{ minWidth: 170 }}><Stack direction="row" spacing={1}><Button size="small" disabled={decisionBusy} variant="contained" color="success" onClick={() => decideRegistration('accepted', request)}>Approve</Button><Button size="small" disabled={decisionBusy} variant="outlined" color="error" onClick={() => { setDecisionReason(''); setDecisionRequest(request); }}>Reject</Button></Stack></TableCell>
              </TableRow>;
            })}{!registrationRequests.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary" align="center" sx={{ py: 4 }}>No registration requests are waiting for review.</Typography></TableCell></TableRow>}</TableBody>
          </Table></TableContainer>
        </Box>
      )}

      {/* Approved users: discovery progress, observations and manual counselor assignment */}
      {activeTab === 1 && <Box>
        <Alert severity="info" sx={{ mb: 2 }}>Discovery is tracked as not done or completed with notes. No call is scheduled here.</Alert>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Approved patient directory</Typography>
        <TextField fullWidth size="small" placeholder="Search approved patients by name or email" value={userQuery} onChange={e => setUserQuery(e.target.value)} sx={{ mb: 2 }} InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }} />
        <AccountList users={activePatients} onToggle={handleToggleSuspension} requests={careRequests} appointments={appointments} showPatientLifecycle />
        <Accordion variant="outlined" sx={{ mt: 2, borderRadius: '8px !important' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={700}>Discovery notes and counselor assignment</Typography></AccordionSummary>
          <AccordionDetails><CareWorkflow currentUser={currentUser} filter={1} onAppointmentsChange={setAppointments} onRequestsChange={setCareRequests} /></AccordionDetails>
        </Accordion>
      </Box>}

      {activeTab === 2 && <Box><Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}><Typography variant="subtitle1" fontWeight={750}>Active counselor panel · {activeCounselors.length} counselors</Typography><Typography variant="body2" color="text.secondary">Assigned patients and completed sessions help you review current caseload load.</Typography></Paper><AccountList users={activeCounselors} onToggle={handleToggleSuspension} showCounselorDetails requests={careRequests} appointments={appointments} /></Box>}
      {activeTab === 3 && <Box><Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Deactivated patient accounts</Typography><AccountList users={deactivatedPatients} onToggle={handleToggleSuspension} /></Box>}
      {activeTab === 4 && <Box><Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Deactivated counselors</Typography><AccountList users={deactivatedCounselors} onToggle={handleToggleSuspension} showCounselorDetails /></Box>}

      {activeTab === 5 && <Box>
        <Typography variant="h6" fontWeight={750} sx={{ mb: 2 }}>Counselor verification · {pendingCounselors.length} pending</Typography>
        {!pendingCounselors.length ? <Paper variant="outlined" sx={{ p: 3 }}><Typography color="text.secondary">No counselor applications need review.</Typography></Paper> : <TableContainer component={Paper} variant="outlined"><Table>
          <TableHead><TableRow>{['Name', 'Email', 'Specialty', 'Credentials', 'Action'].map(title => <TableCell key={title} sx={{ fontWeight: 700 }}>{title}</TableCell>)}</TableRow></TableHead>
          <TableBody>{pendingCounselors.map(counselor => <TableRow key={counselor.id} hover><TableCell>{counselor.name}</TableCell><TableCell>{counselor.email || '—'}</TableCell><TableCell>{counselor.specialty || '—'}</TableCell><TableCell>{counselor.credentials || '—'}</TableCell><TableCell><Button color="success" variant="contained" size="small" startIcon={<CheckIcon />} onClick={() => handleApproveCounselor(counselor.id)}>Approve</Button></TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>}
      </Box>}

      {activeTab === 6 && <TableContainer component={Paper}><Table><TableHead><TableRow>
        {['User', 'Counselor', 'Session', 'Date (IST)', 'Status', 'Feedback'].map(title => <TableCell key={title}>{title}</TableCell>)}
        </TableRow></TableHead><TableBody>{appointments.map(appointment => <TableRow key={appointment.id}>
          <TableCell>{appointment.patientName}</TableCell><TableCell>{appointment.counselorName}</TableCell>
          <TableCell>{appointment.appointmentKind?.replaceAll('_', ' ') || 'Session'}</TableCell>
          <TableCell>{appointment.date} {appointment.time}</TableCell><TableCell>{appointment.status.replaceAll('_', ' ')}</TableCell>
          <TableCell>{appointment.review?.rating ? `${appointment.review.rating}/5 — ${appointment.review.reviewText || ''}` : 'Not received'}</TableCell>
        </TableRow>)}</TableBody></Table></TableContainer>}

      <Dialog open={Boolean(decisionRequest)} onClose={() => !decisionBusy && setDecisionRequest(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject registration request</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>Reject the registration for <strong>{decisionRequest?.patientName}</strong>?</Typography>
          <TextField autoFocus multiline minRows={3} label="Reason for rejection" value={decisionReason} onChange={event => setDecisionReason(event.target.value)} />
        </Stack></DialogContent>
        <DialogActions><Button disabled={decisionBusy} onClick={() => setDecisionRequest(null)}>Cancel</Button><Button color="error" variant="contained" disabled={decisionBusy || !decisionReason.trim()} onClick={() => decideRegistration('rejected')}>{decisionBusy ? 'Saving…' : 'Reject request'}</Button></DialogActions>
      </Dialog>


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
