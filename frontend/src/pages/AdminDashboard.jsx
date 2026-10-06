import AdminScheduleSession from '../components/AdminScheduleSession';
import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Typography, Grid, Card, CardContent, CardActionArea, Avatar, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Alert, TextField, IconButton, Dialog, DialogTitle, Stack,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Drawer, Divider
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../api';

const tableStyles = {
  borderRadius: 2, boxShadow: 'none',
  '& .MuiTableCell-root': { px: 2, py: 2, borderColor: 'divider', verticalAlign: 'middle', fontSize: 13 },
  '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'action.hover', py: 1.5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.035em', whiteSpace: 'nowrap', color: 'text.secondary' },
  '& .MuiButton-root': { height: 32, px: 1.25, borderRadius: 1.25, fontSize: 12, whiteSpace: 'nowrap' },
};
const initials = name => (name || '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('');
const shortDate = date => date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function AccountList({ users, onToggle, onSelectCase, showCounselorDetails = false, showPatientLifecycle = false, requests = [], appointments = [] }) {
  if (!users.length) return <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">No accounts in this list.</Typography></Paper>;
  if (showCounselorDetails) return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>{users.map(user =>
    <Card key={user.id} variant="outlined" sx={{ height: '100%', borderRadius: 2, boxShadow: 'none' }}><CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <Box><Typography variant="subtitle1" fontWeight={750}>{user.name}</Typography><Typography variant="body2" color="text.secondary">{user.email || 'Email not provided'}</Typography></Box>
        <Chip size="small" color={user.suspended ? 'default' : 'success'} label={user.suspended ? 'Deactivated' : 'Active'} />
      </Box>
      <Typography variant="body2" fontWeight={650}>{user.specialty || 'General counseling'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{user.credentials || 'Credentials not listed'}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{user.experience == null ? 'Experience not listed' : `${user.experience} years experience`} · Joined {shortDate(user.createdAt)}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <Chip size="small" variant="outlined" label={`${requests.filter(request => request.finalCounselorId === user.id && !['closed', 'rejected'].includes(request.status)).length} assigned`} />
        <Chip size="small" variant="outlined" color="success" label={`${appointments.filter(appointment => appointment.counselorId === user.id && appointment.status === 'completed' && ['session', 'follow_up', ''].includes(appointment.appointmentKind)).length} sessions done`} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, pt: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">Languages: {(user.languages || []).join(', ') || 'Not listed'}</Typography>
        <Button size="small" color={user.suspended ? 'success' : 'error'} variant="outlined" onClick={() => onToggle(user.id, user.suspended)}>{user.suspended ? 'Reactivate' : 'Deactivate'}</Button>
      </Box>
    </CardContent></Card>
  )}</Box>;
  return <TableContainer component={Paper} variant="outlined" sx={tableStyles}>
    <Table size="small" sx={{ minWidth: showPatientLifecycle ? 1080 : 650 }}>
      <TableHead><TableRow>
        <TableCell sx={{ fontWeight: 700 }}>User / contact</TableCell>
        {showCounselorDetails && <><TableCell sx={{ fontWeight: 700 }}>Specialty</TableCell><TableCell sx={{ fontWeight: 700 }}>Experience</TableCell></>}
        {showPatientLifecycle && <><TableCell sx={{ fontWeight: 700 }}>Track</TableCell><TableCell sx={{ fontWeight: 700 }}>Discovery</TableCell><TableCell sx={{ fontWeight: 700 }}>Assigned counselor</TableCell><TableCell sx={{ fontWeight: 700 }}>Sessions done</TableCell></>}
        <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell><TableCell align="right" sx={{ fontWeight: 700, width: showPatientLifecycle ? 328 : 120 }}>Actions</TableCell>
      </TableRow></TableHead>
      <TableBody>{users.map(user => {
        const request = requests.find(item => item.patientId === user.id);
        const discovery = request && (['discovery_completed', 'matched', 'active', 'closed'].includes(request.status) || Boolean(request.discoveryNotes)) ? 'Completed' : 'Pending';
        return <TableRow key={user.id} hover>
        <TableCell sx={{ minWidth: 180 }}><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', color: 'primary.dark', fontSize: 12, fontWeight: 700 }}>{initials(user.name)}</Avatar><Box><Typography variant="body2" fontWeight={650}>{user.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user.email || user.mobile || 'Contact not provided'}</Typography></Box></Stack></TableCell>
        {showCounselorDetails && <><TableCell>{user.specialty || '—'}</TableCell><TableCell>{user.experience ? `${user.experience} years` : '—'}</TableCell></>}
        {showPatientLifecycle && <><TableCell>{request?.supportType || request?.caseType || request?.preferredFormat || 'Not specified'}</TableCell><TableCell><Chip size="small" color={discovery === 'Pending' ? 'warning' : 'success'} label={discovery} />{discovery === 'Completed' && request?.timeline?.length > 0 && <Typography variant="caption" display="block" color="text.secondary">{new Date([...request.timeline].reverse().find(event => event.status === 'discovery_completed')?.at || request.updatedAt).toLocaleDateString()}</Typography>}</TableCell><TableCell>{request?.finalCounselorName || 'Unassigned'}</TableCell><TableCell>{appointments.filter(appointment => appointment.patientId === user.id && appointment.status === 'completed' && ['session', 'follow_up', ''].includes(appointment.appointmentKind)).length}</TableCell></>}
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(user.createdAt)}</TableCell>
        <TableCell align="right"><Box sx={{ display: 'grid', gridTemplateColumns: showPatientLifecycle ? '96px 112px 88px' : '88px', justifyContent: 'end', alignItems: 'center', gap: 0.75 }}>{showPatientLifecycle && <>{request ? <Button size="small" onClick={() => onSelectCase?.(user, request)}>{discovery === 'Pending' ? 'Log discovery' : 'Details'}</Button> : <Box />}{request && ['discovery_completed', 'matched', 'active'].includes(request.status) ? <Button size="small" variant="contained" onClick={() => onSelectCase?.(user, request, { schedule: true })}>Schedule session</Button> : <Box />}</>}<Button size="small" variant="outlined" color={user.suspended ? 'success' : 'error'} onClick={() => onToggle(user.id, user.suspended)}>{user.suspended ? 'Reactivate' : 'Deactivate'}</Button></Box></TableCell>
      </TableRow>})}</TableBody>
    </Table>
  </TableContainer>;
}

export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [careRequests, setCareRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestQuery, setRequestQuery] = useState('');
  const [decisionRequest, setDecisionRequest] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [discoveryDraft, setDiscoveryDraft] = useState('');
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [assignmentCounselorId, setAssignmentCounselorId] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // User search/filter
  const [userQuery, setUserQuery] = useState('');
  const [discoveryFilter, setDiscoveryFilter] = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('all');

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
      
      // Refresh user lists
      const u = await api.getAdminUsers();
      setUsers(u);
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
  const filteredUsers = users.filter(u => [u.name, u.email, u.mobile, u.specialty].some(value => String(value || '').toLowerCase().includes(userQuery.trim().toLowerCase())));
  const activePatients = filteredUsers.filter(u => ['user', 'patient'].includes(u.role) && u.approved && !u.suspended);
  const activeCounselors = filteredUsers.filter(u => u.role === 'counselor' && u.approved && !u.suspended);
  const deactivatedPatients = filteredUsers.filter(u => ['user', 'patient'].includes(u.role) && u.suspended);
  const deactivatedCounselors = filteredUsers.filter(u => u.role === 'counselor' && u.suspended);
  const pendingRegistrations = careRequests.filter(request => ['submitted', 'assigned'].includes(request.status)).length;
  const discoveryStages = ['accepted', 'discovery_scheduled', 'discovery_completed'];
  const discoveryPending = careRequests.filter(request => ['accepted', 'discovery_scheduled'].includes(request.status)).length;
  const assignmentPending = careRequests.filter(request => request.status === 'discovery_completed').length;
  const discoveryPatients = activePatients.filter(user => careRequests.some(request => request.patientId === user.id && (discoveryFilter === 'ready' ? request.status === 'discovery_completed' : discoveryFilter === 'pending' ? ['accepted', 'discovery_scheduled'].includes(request.status) : discoveryStages.includes(request.status))));
  const approvedCount = users.filter(u => ['user', 'patient'].includes(u.role) && u.approved && !u.suspended).length;
  const counselorCount = users.filter(u => u.role === 'counselor' && u.approved && !u.suspended).length;
  const archivedCount = users.filter(u => u.suspended).length;
  const sections = [
    { label: 'Registration requests', count: pendingRegistrations, description: 'New applications awaiting review', icon: PeopleAltIcon, color: 'warning.main' },
    { label: 'Approved users', count: approvedCount, description: 'Approved patients in ongoing care', icon: CheckIcon, color: 'success.main' },
    { label: 'Counselors', count: counselorCount, description: 'Active counseling panel', icon: PsychologyOutlinedIcon, color: 'primary.main' },
    { label: 'Discovery & assignment', count: discoveryPending + assignmentPending, description: `${discoveryPending} pending · ${assignmentPending} ready to assign`, icon: HeadsetMicOutlinedIcon, color: 'secondary.main' },
    { label: 'Deactivated accounts', count: archivedCount, description: 'Patient and counselor archive', icon: Inventory2OutlinedIcon, color: 'text.secondary' },
  ];
  const selectSection = value => {
    setActiveTab(value);
    setUserQuery('');
    setRequestQuery('');
    setDiscoveryFilter('all');
    setArchiveFilter('all');
  };
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

  const openCase = (user, request, { schedule = false } = {}) => {
    setSelectedCase({ user, request });
    setDiscoveryDraft(request.discoveryNotes || '');
    setAssignmentCounselorId(request.finalCounselorId || '');
    setScheduleOpen(schedule);
  };

  const currentCaseRequest = selectedCase
    ? careRequests.find(request => request.id === selectedCase.request.id) || selectedCase.request
    : null;
  const assignedCounselor = users.find(user => user.id === currentCaseRequest?.finalCounselorId);
  const discoveryIsComplete = Boolean(currentCaseRequest && (
    ['discovery_completed', 'matched', 'active', 'closed'].includes(currentCaseRequest.status) || currentCaseRequest.discoveryNotes
  ));

  const saveDiscovery = async () => {
    if (!currentCaseRequest || !discoveryDraft.trim()) return;
    try {
      setDiscoveryBusy(true);
      const result = await api.saveDiscoveryNotes(currentCaseRequest.id, discoveryDraft);
      setSelectedCase(previous => previous ? { ...previous, request: result.request } : previous);
      setSuccess('Discovery notes saved. Discovery is marked complete.');
      await fetchAdminData();
    } catch (err) { setError(err.message || 'Unable to save discovery notes.'); }
    finally { setDiscoveryBusy(false); }
  };

  const assignCaseCounselor = async () => {
    if (!currentCaseRequest || !assignmentCounselorId) return;
    try {
      setDiscoveryBusy(true);
      const result = await api.assignFinalCounselor(currentCaseRequest.id, { counselorId: assignmentCounselorId });
      setSelectedCase(previous => previous ? { ...previous, request: result.request } : previous);
      setSuccess('Counselor assigned to this patient.');
      await fetchAdminData();
    } catch (err) { setError(err.message || 'Unable to assign counselor.'); }
    finally { setDiscoveryBusy(false); }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3 }, px: { xs: 2, md: 3 }, '& .MuiButton-root': { borderRadius: 1.5 } }}>
      <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.25, mb: 0.75 }}>
            <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 750, letterSpacing: '-0.035em' }}>Counseling operations</Typography>
            <Chip label="BJS care team" size="small" color="primary" variant="outlined" sx={{ height: 23, fontSize: 11, borderRadius: 1 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">Review registrations, record discovery notes, and coordinate counseling sessions.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ whiteSpace: 'nowrap', height: 38 }}>Create account</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {sections.map((section, index) => {
          const selected = activeTab === index;
          const Icon = section.icon;
          return <Card key={section.label} variant="outlined" sx={{ borderRadius: 2, boxShadow: selected ? '0 4px 12px rgba(49,46,129,.16)' : 'none', borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? 'primary.main' : 'background.paper', color: selected ? 'primary.contrastText' : 'text.primary', transition: 'background-color .15s, box-shadow .15s' }}>
            <CardActionArea onClick={() => selectSection(index)} aria-pressed={selected} aria-controls="admin-directory" sx={{ height: '100%', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light', outlineOffset: -3 } }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, minHeight: 130 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.035em', color: selected ? 'inherit' : 'text.secondary' }}>{section.label}</Typography>
                  <Box sx={{ display: 'grid', placeItems: 'center', width: 30, height: 30, flexShrink: 0, bgcolor: selected ? 'rgba(255,255,255,.16)' : 'action.hover', color: selected ? 'inherit' : section.color, borderRadius: 1.25 }}><Icon sx={{ fontSize: 18 }} /></Box>
                </Stack>
                <Typography sx={{ fontSize: 30, lineHeight: 1.2, fontWeight: 750, mt: 1 }}>{section.count}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: 11, color: selected ? 'inherit' : 'text.secondary', opacity: selected ? 0.85 : 1 }}>{section.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>;
        })}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs value={activeTab} onChange={(_, value) => selectSection(value)} variant="scrollable" scrollButtons="auto" aria-label="Admin directories" sx={{ minHeight: 46, '& .MuiTab-root': { minHeight: 46, px: 2, textTransform: 'none', fontWeight: 600, fontSize: 12 } }}>
          {sections.map((section, index) => <Tab id={`admin-tab-${index}`} aria-controls="admin-directory" key={section.label} label={<Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}><Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>{section.label}</Typography><Chip component="span" size="small" label={section.count} sx={{ height: 20, minWidth: 22, fontSize: 10, bgcolor: activeTab === index ? 'primary.light' : 'action.hover', color: activeTab === index ? 'primary.dark' : 'text.secondary', '& .MuiChip-label': { px: 0.75 } }} /></Stack>} />)}
        </Tabs>
      </Box>

      <Box id="admin-directory" role="tabpanel" aria-labelledby={`admin-tab-${activeTab}`}>
        <Alert severity="info" sx={{ mb: 2, border: 1, borderColor: 'divider', borderRadius: 2, py: 0.5, fontSize: 12 }}>
          {activeTab === 0 ? 'Review new applications first. Approved users move to discovery before counselor assignment.' : activeTab === 1 ? 'Open a case to review discovery notes, then match a counselor and schedule a session.' : activeTab === 2 ? 'Review your active counseling panel, current assignments, and completed sessions.' : activeTab === 3 ? 'Record discovery observations and match each approved user with the right counselor.' : 'Review deactivated accounts and reactivate them when they are ready to return.'}
        </Alert>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField size="small" label={activeTab === 0 ? 'Search applications' : 'Search directory'} placeholder={activeTab === 0 ? 'Name, phone, email or intake note' : 'Name, email, phone or expertise'} value={activeTab === 0 ? requestQuery : userQuery} onChange={e => activeTab === 0 ? setRequestQuery(e.target.value) : setUserQuery(e.target.value)} sx={{ width: { xs: '100%', sm: 360 } }} slotProps={{ input: { startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} /> } }} />
          {activeTab === 3 ? <TextField select size="small" label="Discovery stage" value={discoveryFilter} onChange={e => setDiscoveryFilter(e.target.value)} sx={{ minWidth: 190 }}><MenuItem value="all">All discovery cases</MenuItem><MenuItem value="pending">Discovery pending</MenuItem><MenuItem value="ready">Ready to assign</MenuItem></TextField> : activeTab === 4 ? <TextField select size="small" label="Account type" value={archiveFilter} onChange={e => setArchiveFilter(e.target.value)} sx={{ minWidth: 190 }}><MenuItem value="all">All deactivated accounts</MenuItem><MenuItem value="patients">Deactivated users</MenuItem><MenuItem value="counselors">Deactivated counselors</MenuItem></TextField> : <Typography variant="caption" color="text.secondary">{activeTab === 0 ? `${registrationRequests.length} awaiting review` : activeTab === 1 ? `${activePatients.length} approved users` : `${activeCounselors.length} active counselors`}</Typography>}
        </Paper>

        {activeTab === 0 && <TableContainer component={Paper} variant="outlined" sx={tableStyles}><Table sx={{ minWidth: 940 }}>
          <TableHead><TableRow>
            {['Applicant / contact', 'Track & preference', 'Intake context', 'Applied', 'Actions'].map(title => <TableCell key={title} align={title === 'Actions' ? 'right' : 'left'}>{title}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>{registrationRequests.map(request => {
            const user = users.find(candidate => candidate.id === request.patientId);
            return <TableRow key={request.id} hover>
              <TableCell sx={{ minWidth: 210 }}><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 700, bgcolor: 'primary.light', color: 'primary.dark' }}>{initials(request.patientName)}</Avatar><Box><Typography variant="body2" fontWeight={650}>{request.patientName}</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: 'anywhere' }}>{user?.email || 'Email not provided'}</Typography><Typography variant="caption" color="text.secondary">{request.patientMobile || 'Phone not provided'}</Typography></Box></Stack></TableCell>
              <TableCell sx={{ minWidth: 160 }}><Chip size="small" color="primary" variant="outlined" label={request.preferredFormat || 'Counseling request'} sx={{ fontSize: 11, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} /><Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.75 }}>{request.preferredLanguage || 'Language not specified'}</Typography></TableCell>
              <TableCell sx={{ minWidth: 210, maxWidth: 330, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{request.intakeNotes || 'No additional intake note.'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(request.createdAt)}<Typography variant="caption" display="block" color="text.secondary">{request.createdAt ? new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''}</Typography></TableCell>
              <TableCell align="right" sx={{ width: 180 }}><Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end' }}><Button size="small" startIcon={<CheckIcon sx={{ fontSize: '14px !important' }} />} disabled={decisionBusy} variant="contained" color="success" sx={{ width: 86 }} onClick={() => decideRegistration('accepted', request)}>Approve</Button><Button size="small" disabled={decisionBusy} variant="outlined" color="error" sx={{ width: 70 }} onClick={() => { setDecisionReason(''); setDecisionRequest(request); }}>Reject</Button></Stack></TableCell>
            </TableRow>;
          })}{!registrationRequests.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary" align="center" sx={{ py: 4 }}>No registration requests are waiting for review.</Typography></TableCell></TableRow>}</TableBody>
        </Table></TableContainer>}
        {activeTab === 1 && <AccountList users={activePatients} onToggle={handleToggleSuspension} onSelectCase={openCase} requests={careRequests} appointments={appointments} showPatientLifecycle />}
        {activeTab === 2 && <AccountList users={activeCounselors} onToggle={handleToggleSuspension} showCounselorDetails requests={careRequests} appointments={appointments} />}
        {activeTab === 3 && <AccountList users={discoveryPatients} onToggle={handleToggleSuspension} onSelectCase={openCase} requests={careRequests} appointments={appointments} showPatientLifecycle />}
        {activeTab === 4 && <AccountList users={archiveFilter === 'all' ? [...deactivatedPatients, ...deactivatedCounselors] : archiveFilter === 'patients' ? deactivatedPatients : deactivatedCounselors} onToggle={handleToggleSuspension} showCounselorDetails={archiveFilter === 'counselors'} requests={careRequests} appointments={appointments} />}
      </Box>
      <Drawer anchor="right" open={Boolean(selectedCase) && !scheduleOpen} onClose={() => setSelectedCase(null)} PaperProps={{ sx: { width: { xs: '100vw', sm: 640 }, minWidth: { sm: 560 }, maxWidth: '100vw', p: 0 } }}>
        {selectedCase && currentCaseRequest && <Stack spacing={0} sx={{ height: '100%', overflowY: 'auto' }}>
          <Box sx={{ p: { xs: 2.5, sm: 3.5 }, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 750 }}>PATIENT CASE</Typography>
                <Typography variant="h5" fontWeight={800}>{selectedCase.user.name}</Typography>
                <Typography sx={{ opacity: 0.88 }}>{selectedCase.user.email || 'Email not provided'}</Typography>
                {currentCaseRequest.patientMobile && <Typography sx={{ opacity: 0.88 }}>{currentCaseRequest.patientMobile}</Typography>}
              </Box>
              <IconButton aria-label="Close patient details" onClick={() => setSelectedCase(null)} sx={{ color: 'inherit' }}><CloseIcon /></IconButton>
            </Stack>
            <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
              <Chip size="small" color={discoveryIsComplete ? 'success' : 'warning'} label={`Discovery ${discoveryIsComplete ? 'Completed' : 'Pending'}`} />
              <Chip size="small" variant="outlined" label={currentCaseRequest.finalCounselorName || 'Counselor not assigned'} sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,.5)' }} />
            </Stack>
          </Box>
          <Stack spacing={2.5} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Divider />
          <Box><Typography variant="subtitle2" fontWeight={750} gutterBottom>Intake details</Typography>
            <Typography variant="body2" color="text.secondary">Registration received {currentCaseRequest.createdAt ? new Date(currentCaseRequest.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{currentCaseRequest.supportType || currentCaseRequest.caseType || currentCaseRequest.preferredFormat || 'Counseling request'} · {currentCaseRequest.preferredLanguage || 'Language not specified'}</Typography>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{currentCaseRequest.intakeNotes || 'No intake notes provided.'}</Typography>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {[
                ['Gender', selectedCase.user.gender], ['Date of birth', selectedCase.user.dob],
                ['Location', [selectedCase.user.city, selectedCase.user.state].filter(Boolean).join(', ')],
                ['Preferred language', selectedCase.user.preferredLanguage],
                ['Counseling requirements', selectedCase.user.counselingRequirements],
              ].filter(([, value]) => value).map(([labelText, value]) => <Grid size={{ xs: 12, sm: 6 }} key={labelText}><Paper variant="outlined" sx={{ p: 1.25, height: '100%' }}><Typography variant="caption" color="text.secondary">{labelText}</Typography><Typography variant="body2">{value}</Typography></Paper></Grid>)}
            </Grid>
          </Box>

          <Box><Typography variant="subtitle2" fontWeight={750} gutterBottom>Discovery call</Typography>
            <Alert severity={discoveryIsComplete ? 'success' : 'warning'} sx={{ mb: 1.5 }}>{discoveryIsComplete ? 'Completed' : 'Pending'}{discoveryIsComplete && (currentCaseRequest.discoveryNotesHistory?.length || currentCaseRequest.timeline?.length) ? ` · ${new Date(currentCaseRequest.discoveryNotesHistory?.at(-1)?.at || [...(currentCaseRequest.timeline || [])].reverse().find(event => event.status === 'discovery_completed')?.at || currentCaseRequest.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</Alert>
            {['accepted', 'discovery_scheduled', 'discovery_completed', 'matched', 'active'].includes(currentCaseRequest.status) && <>
              <TextField fullWidth multiline minRows={4} label="Discovery notes" value={discoveryDraft} onChange={event => setDiscoveryDraft(event.target.value)} />
              <Button sx={{ mt: 1 }} variant="contained" disabled={discoveryBusy || !discoveryDraft.trim()} onClick={saveDiscovery}>{discoveryIsComplete ? 'Save discovery notes' : 'Save notes and mark completed'}</Button>
            </>}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>Discovery note history</Typography>
            {currentCaseRequest.discoveryNotesHistory?.length ? <Stack spacing={1}>{[...currentCaseRequest.discoveryNotesHistory].reverse().map((entry, index) => <Paper key={`${entry.at}-${index}`} variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}><Typography variant="caption" color="text.secondary">{new Date(entry.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {entry.actorName || 'Admin'}</Typography><Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{entry.notes}</Typography></Paper>)}</Stack> : currentCaseRequest.discoveryNotes ? <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}><Typography variant="caption" color="text.secondary">Current saved notes</Typography><Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{currentCaseRequest.discoveryNotes}</Typography></Paper> : <Typography variant="body2" color="text.secondary">No discovery notes recorded yet.</Typography>}
          </Box>

          {currentCaseRequest.status === 'discovery_completed' && !currentCaseRequest.finalCounselorId && <Box>
            <Typography variant="subtitle2" fontWeight={750} gutterBottom>Assign counselor</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField select fullWidth label="Approved counselor" value={assignmentCounselorId} onChange={event => setAssignmentCounselorId(event.target.value)}>
                {users.filter(user => user.role === 'counselor' && user.approved && !user.suspended).map(counselor => <MenuItem key={counselor.id} value={counselor.id}>{counselor.name} · {counselor.specialty || 'Counselor'}</MenuItem>)}
              </TextField>
              <Button variant="contained" disabled={!assignmentCounselorId || discoveryBusy} onClick={assignCaseCounselor}>Assign</Button>
            </Stack>
          </Box>}

          {currentCaseRequest.finalCounselorId && ['matched', 'active'].includes(currentCaseRequest.status) && <Box>
            <Typography variant="subtitle2" fontWeight={750} gutterBottom>Assigned counselor</Typography>
            <Typography variant="body2" color="text.secondary">{assignedCounselor?.name || currentCaseRequest.finalCounselorName || 'Counselor assigned'}</Typography>
            <Button sx={{ mt: 1 }} variant="contained" onClick={() => setScheduleOpen(true)}>Schedule session with counselor</Button>
          </Box>}

          <Box><Typography variant="subtitle2" fontWeight={750} gutterBottom>Case history</Typography>
            {!!currentCaseRequest.reviews?.length && <Stack spacing={1} sx={{ mb: 1.5 }}>{currentCaseRequest.reviews.map((review, index) => <Paper key={`${review.at}-${index}`} variant="outlined" sx={{ p: 1.25 }}><Typography variant="caption" color="text.secondary">Registration {review.decision === 'accepted' ? 'approved' : 'rejected'} · {new Date(review.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {review.actorName}</Typography>{review.reason && <Typography variant="body2">{review.reason}</Typography>}</Paper>)}</Stack>}
            {!!currentCaseRequest.timeline?.length && <Box component="details" sx={{ mb: 1.5 }}><Typography component="summary" variant="body2" fontWeight={650} sx={{ cursor: 'pointer', mb: 1 }}>Care timeline ({currentCaseRequest.timeline.length})</Typography>{[...currentCaseRequest.timeline].reverse().map((event, index) => <Typography key={`${event.at}-${index}`} variant="caption" display="block" color="text.secondary" sx={{ mb: 0.75 }}>{new Date(event.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {event.actorName}: {event.note}</Typography>)}</Box>}
            {appointments.filter(appointment => appointment.careRequestId === currentCaseRequest.id).length ? <Stack spacing={1}>{appointments.filter(appointment => appointment.careRequestId === currentCaseRequest.id).map(appointment => <Paper key={appointment.id} variant="outlined" sx={{ p: 1.5 }}><Typography variant="body2" fontWeight={700}>{appointment.date} · {appointment.time} · {appointment.status}</Typography><Typography variant="caption" color="text.secondary">{appointment.counselorName} · {appointment.appointmentKind || 'Session'}</Typography>{appointment.sessionNotes && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{appointment.sessionNotes}</Typography>}{appointment.review?.rating && <Typography variant="body2" sx={{ mt: 0.5 }}>Feedback: {appointment.review.rating}/5 · {appointment.review.reviewText}</Typography>}</Paper>)}</Stack> : <Typography variant="body2" color="text.secondary">No sessions recorded yet.</Typography>}
          </Box>
          </Stack>
        </Stack>}
      </Drawer>

      {scheduleOpen && currentCaseRequest && <AdminScheduleSession
        key={currentCaseRequest.id}
        request={currentCaseRequest}
        patient={selectedCase.user}
        counselors={users.filter(user => user.role === 'counselor' && user.approved && !user.suspended)}
        onClose={() => { setScheduleOpen(false); setSelectedCase(null); }}
        onAssigned={request => {
          setCareRequests(previous => previous.map(item => item.id === request.id ? request : item));
          setSelectedCase(previous => previous ? { ...previous, request } : previous);
        }}
        onScheduled={async result => {
          setScheduleOpen(false);
          setSelectedCase(null);
          setSuccess(result.message || 'Counselor assigned and session scheduled.');
          await fetchAdminData();
        }}
      />}

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
          Create Counselor Account
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
                {/* <MenuItem value="patient">Patient / Client</MenuItem> */}
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
                  <Grid size={6}>
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
                  <Grid size={6}>
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
