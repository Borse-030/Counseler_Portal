import { mergeRescheduleResult, pendingReschedule } from '../utils/rescheduling';
import { hasFeedback } from '../utils/sessionOutcome';
import AdminScheduleSession from '../components/AdminScheduleSession';
import AdminSidebar from '../components/AdminSidebar';
import AdminOverview, { AdminOverviewDate } from '../components/AdminOverview';
import AdminRegistrationEmptyState from '../components/AdminRegistrationEmptyState';
import DiscoveryCallEditor from '../components/DiscoveryCallEditor';
import DiscoveryPlanSummary from '../components/DiscoveryPlanSummary';
import CounselorDeactivationDialog from '../components/CounselorDeactivationDialog';
import EditScheduledSession from '../components/EditScheduledSession';
import { canEditScheduledSession } from '../utils/sessionScheduling';
import SessionOverview from '../components/SessionOverview';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Avatar, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Alert, TextField, IconButton, Dialog, DialogTitle, Stack,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Drawer, Divider, Tooltip
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PhoneIcon from '@mui/icons-material/Phone';
import TranslateIcon from '@mui/icons-material/Translate';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AddIcon from '@mui/icons-material/Add';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../api';
import { getScheduledSession } from '../utils/scheduledSession';

const tableStyles = {
  borderRadius: 2, boxShadow: 'none',
  '& .MuiTableCell-root': { px: 2, py: 2, borderColor: 'divider', verticalAlign: 'middle', fontSize: 13 },
  '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'action.hover', py: 1.5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.035em', whiteSpace: 'nowrap', color: 'text.secondary' },
  '& .MuiButton-root': { height: 32, px: 1.25, borderRadius: 1.25, fontSize: 12, whiteSpace: 'nowrap' },
};
const initials = name => (name || '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('');
const shortDate = date => date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function AccountList({ users, onToggle, onDeactivate, onSelectCase, showCounselorDetails = false, showPatientLifecycle = false, requests = [], appointments = [] }) {
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
        <Button
          size="small"
          color={user.suspended ? 'success' : 'error'}
          variant="outlined"
          onClick={() => {
            if (user.suspended) {
              onToggle(user.id, user.suspended);
            } else {
              onDeactivate(user);
            }
          }}
        >
          {user.suspended ? 'Reactivate' : 'Deactivate'}
        </Button>
      </Box>
    </CardContent></Card>
  )}</Box>;
  return <TableContainer component={Paper} variant="outlined" sx={tableStyles}>
    <Table size="small" sx={{ minWidth: showPatientLifecycle ? 1080 : 650 }}>
      <TableHead><TableRow>
        <TableCell sx={{ fontWeight: 700 }}>User / contact</TableCell>
        {showCounselorDetails && <>
          <TableCell sx={{ fontWeight: 700 }}>Specialty</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Experience</TableCell>
        </>}
        {showPatientLifecycle && <>
          <TableCell sx={{ fontWeight: 700 }}>Track</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Discovery Call Status</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Assigned counselor</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Sessions done</TableCell>
        </>}
        <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell><TableCell align="right" sx={{ fontWeight: 700, width: showPatientLifecycle ? 328 : 120 }}>Actions</TableCell>
      </TableRow></TableHead>
      <TableBody>{users.map(user => {
        const request = requests.find(item => item.patientId === user.id);
        const scheduledSession = getScheduledSession(request, appointments);
        const discovery = request && (['discovery_completed', 'matched', 'active', 'closed'].includes(request.status) || Boolean(request.discoveryNotes)) ? 'Completed' : 'Pending';
        return <TableRow key={user.id} hover>
          <TableCell sx={{ minWidth: 180 }}><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', color: 'primary.dark', fontSize: 12, fontWeight: 700 }}>{initials(user.name)}</Avatar><Box><Typography variant="body2" fontWeight={650}>{user.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user.email || user.mobile || 'Contact not provided'}</Typography></Box></Stack></TableCell>
          {showCounselorDetails && <><TableCell>{user.specialty || '—'}</TableCell><TableCell>{user.experience ? `${user.experience} years` : '—'}</TableCell></>}
          {showPatientLifecycle && <><TableCell>{request?.supportType || request?.caseType || request?.preferredFormat || 'Not specified'}</TableCell>
            <TableCell><Chip size="small" color={discovery === 'Pending' ? 'warning' : 'success'} label={discovery} />{discovery === 'Completed' && request?.timeline?.length > 0 && <Typography variant="caption" display="block" color="text.secondary">{new Date([...request.timeline].reverse().find(event => event.status === 'discovery_completed')?.at || request.updatedAt).toLocaleDateString()}</Typography>}</TableCell>
            <TableCell>{request?.finalCounselorName || 'Unassigned'}</TableCell><TableCell>{appointments.filter(appointment => appointment.patientId === user.id && appointment.status === 'completed' && ['session', 'follow_up', ''].includes(appointment.appointmentKind)).length}</TableCell></>}
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(user.createdAt)}</TableCell>
          <TableCell align="right"><Box sx={{ display: 'grid', gridTemplateColumns: showPatientLifecycle ? '96px 112px 88px' : '88px', justifyContent: 'end', alignItems: 'center', gap: 0.75 }}>{showPatientLifecycle && <>{request ? <Button size="small" onClick={() => onSelectCase?.(user, request)}>{discovery === 'Pending' ? 'Log discovery' : 'Details'}</Button> : <Box />}
            {scheduledSession ? (
              <Tooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography variant="caption" display="block" fontWeight={700}>
                      Session booked
                    </Typography>
                    <Typography variant="caption" display="block">
                      {shortDate(scheduledSession.date)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {scheduledSession.time} IST
                    </Typography>
                  </Box>
                }
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onSelectCase?.(user, request)}
                >
                  View session
                </Button>
              </Tooltip>
            ) : request &&
              ['discovery_completed', 'matched', 'active'].includes(request.status) ? (
              <Button
                size="small"
                variant="contained"
                onClick={() => onSelectCase?.(user, request, { schedule: true })}
              >
                Schedule session
              </Button>
            ) : (
              <Box />
            )}
          </>}<Button size="small" variant="outlined" color={user.suspended ? 'success' : 'error'} onClick={() => onToggle(user.id, user.suspended)}>{user.suspended ? 'Reactivate' : 'Deactivate'}</Button></Box></TableCell>
        </TableRow>
      })}</TableBody>
    </Table>
  </TableContainer>;
}

export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState(6);
  const [sessionView, setSessionView] = useState('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  useEffect(() => {
    let active = true;
    const refresh = () => api.getAppointments().then(data => { if (active) setAppointments(data); }).catch(() => { });
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, []);
  const [careRequests, setCareRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestQuery, setRequestQuery] = useState('');
  const [decisionRequest, setDecisionRequest] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);

  // User search/filter
  const [userQuery, setUserQuery] = useState('');
  const [discoveryFilter, setDiscoveryFilter] = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('all');

  // User creation dialog state
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
  const [createCounselorOpen, setCreateCounselorOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deactivateUser, setDeactivateUser] = useState(null);

  const navigate = useNavigate()

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
      setCreateCounselorOpen(false);
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
    const user = users.find(item => item.id === userId);
    if (!currentSuspension && user?.role === 'counselor') { setDeactivateUser(user); return; }
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
  const rescheduleCount = appointments.filter(pendingReschedule).length;
  const sections = [
    { id: 6, label: 'Workspace overview', navLabel: 'Overview', description: 'A quick look at your program, pending work, and upcoming sessions.', icon: DashboardIcon },
    { id: 0, label: 'Registration requests', navLabel: 'Registrations', count: pendingRegistrations, description: 'Review new applications and approve users for care.', icon: PeopleAltIcon },
    { id: 1, label: 'Approved users', navLabel: 'Users', count: approvedCount, description: 'Manage user cases, counselor assignments, and upcoming sessions.', icon: PersonIcon },
    { id: 2, label: 'Counselors', count: counselorCount, description: 'Manage your counseling panel and ongoing case assignments.', icon: PsychologyOutlinedIcon },
    { id: 3, label: 'Discovery & assignment', navLabel: 'Discovery calls', count: discoveryPending + assignmentPending, description: 'Record discovery conversations and match users with a counselor.', icon: HeadsetMicOutlinedIcon },
    { id: 5, label: 'Sessions & feedback', count: rescheduleCount, description: 'Review sessions, attendance, feedback, and rescheduling requests.', icon: CalendarMonthOutlinedIcon },
    { id: 4, label: 'Deactivated accounts', navLabel: 'Deactivated', count: archivedCount, description: 'Review archived accounts and reactivate them when needed.', icon: Inventory2OutlinedIcon },
  ];
  const currentSection = sections.find(section => section.id === activeTab) || sections[0];
  const selectSection = value => {
    setActiveTab(value);
    setSessionView('all');
    setUserQuery('');
    setRequestQuery('');
    setDiscoveryFilter('all');
    setArchiveFilter('all');
  };
  const openOverviewSection = (section, filter) => {
    selectSection(section);
    if (section === 5 && filter) setSessionView(filter);
    if (section === 3 && filter) setDiscoveryFilter(filter);
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
    setScheduleOpen(schedule);
  };

  const currentCaseRequest = selectedCase
    ? careRequests.find(request => request.id === selectedCase.request.id) || selectedCase.request
    : null;
  const assignedCounselor = users.find(user => user.id === currentCaseRequest?.finalCounselorId);
  const scheduledCaseSession = getScheduledSession(currentCaseRequest, appointments);
  const discoveryIsComplete = Boolean(currentCaseRequest && (
    ['discovery_completed', 'matched', 'active', 'closed'].includes(currentCaseRequest.status) || currentCaseRequest.discoveryNotes
  ));

  const saveDiscovery = async (notes, discoveryPlan) => {
    if (!currentCaseRequest) throw new Error('Open a case before saving discovery details.');
    const requestId = currentCaseRequest.id;
    try {
      setDiscoveryBusy(true);
      const result = await api.saveDiscoveryNotes(requestId, notes, discoveryPlan);
      setSelectedCase(previous => previous?.request.id === requestId ? { ...previous, request: result.request } : previous);
      setCareRequests(previous => previous.map(request => request.id === requestId ? result.request : request));
      setSuccess('Discovery notes, proposed session, and concerns saved.');
    } catch (err) { setError(err.message || 'Unable to save discovery details.'); throw err; }
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
    <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: 'calc(100dvh - 70px)', bgcolor: '#f7f9fc', '& .MuiButton-root': { borderRadius: 1.5 } }}>
      <AdminSidebar sections={sections} activeSection={activeTab} onSelect={selectSection} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, md: activeTab === 6 ? 3 : 4 }, maxWidth: 1664, mx: 'auto' }}>
      <Box sx={{ mb: activeTab === 6 ? 2 : 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <IconButton aria-label="Open admin navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} sx={{ display: { md: 'none' }, mt: .25, bgcolor: '#fff', border: '1px solid #e2e8f0' }}><MenuIcon fontSize="small" /></IconButton>
          <Box>
            <Typography sx={{ display: activeTab === 6 ? 'none' : 'block', color: '#94a3b8', fontSize: 10, letterSpacing: '.12em', fontWeight: 700, mb: .75 }}>CARE MANAGEMENT</Typography>
            <Typography id="admin-section-heading" component="h1" sx={{ fontSize: { xs: 23, md: activeTab === 6 ? 24 : 28 }, fontWeight: 750, letterSpacing: '-.035em', color: '#172033', lineHeight: 1.25 }}>{currentSection.label}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: activeTab === 6 ? .5 : .75, fontSize: activeTab === 6 ? 12 : undefined, maxWidth: 600, lineHeight: 1.6 }}>{currentSection.description}</Typography>
          </Box>
        </Box>
        {activeTab === 6 && <AdminOverviewDate onRefresh={() => fetchAdminData()} />}
        {(activeTab === 0 || activeTab === 1) && <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => navigate('/register')} sx={{ height: 40, px: 2, whiteSpace: 'nowrap' }}>Create user</Button>}
        {activeTab === 2 && <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => { setCreateCounselorOpen(true); setCreateRole('counselor'); }} sx={{ height: 40, px: 2, whiteSpace: 'nowrap' }}>Create counselor</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!appointments.filter(pendingReschedule).length && ![5, 6].includes(activeTab) && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => openOverviewSection(5, 'reschedule')}>Review requests</Button>}>{appointments.filter(pendingReschedule).length} rescheduling request(s) awaiting review.</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      <Box id="admin-directory" role="region" aria-labelledby="admin-section-heading">
        {activeTab === 6 && <AdminOverview users={users} appointments={appointments} requests={careRequests} onNavigate={openOverviewSection} onCreateUser={() => navigate('/register')} onCreateCounselor={() => { setCreateRole('counselor'); setCreateCounselorOpen(true); }} />}
        {activeTab === 5 && <SessionOverview key={sessionView} initialFilter={sessionView} appointments={appointments} onEdit={setEditingAppointment} currentUser={currentUser} onUpdated={result => setAppointments(previous => mergeRescheduleResult(previous, result))} />}
        <Box sx={{ mb: 2, display: [5, 6].includes(activeTab) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField size="small" label={activeTab === 0 ? 'Search applications' : 'Search directory'} placeholder={activeTab === 0 ? 'Name, phone, email or intake note' : 'Name, email, phone or expertise'} value={activeTab === 0 ? requestQuery : userQuery} onChange={e => activeTab === 0 ? setRequestQuery(e.target.value) : setUserQuery(e.target.value)} sx={{ width: { xs: '100%', sm: 340 }, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }} slotProps={{ input: { startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} /> } }} />
          {activeTab === 3 ? <TextField select size="small" label="Discovery stage" value={discoveryFilter} onChange={e => setDiscoveryFilter(e.target.value)} sx={{ minWidth: 190 }}><MenuItem value="all">All discovery cases</MenuItem><MenuItem value="pending">Discovery pending</MenuItem><MenuItem value="ready">Ready to assign</MenuItem></TextField> : activeTab === 4 ? <TextField select size="small" label="Account type" value={archiveFilter} onChange={e => setArchiveFilter(e.target.value)} sx={{ minWidth: 190 }}><MenuItem value="all">All deactivated accounts</MenuItem><MenuItem value="patients">Deactivated users</MenuItem><MenuItem value="counselors">Deactivated counselors</MenuItem></TextField> : <Typography variant="caption" color="text.secondary">{activeTab === 0 ? `${registrationRequests.length} awaiting review` : activeTab === 1 ? `${activePatients.length} approved users` : `${activeCounselors.length} active counselors`}</Typography>}
        </Box>

        {activeTab === 0 && (registrationRequests.length ? <TableContainer component={Paper} variant="outlined" sx={tableStyles}><Table sx={{ minWidth: 940 }}>
          <TableHead><TableRow>
            {['Applicant / contact', 'Track & preference', 'Intake context', 'Applied', 'Actions'].map(title =>
              <TableCell key={title} align={title === 'Actions' ? 'right' : 'left'}>{title}</TableCell>)}
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
        </Table></TableContainer> : <AdminRegistrationEmptyState filtered={Boolean(requestQuery.trim())} onClear={() => setRequestQuery('')} onViewUsers={() => selectSection(1)} />)}
        {activeTab === 1 && <AccountList onDeactivate={setDeactivateUser} users={activePatients} onToggle={handleToggleSuspension} onSelectCase={openCase} requests={careRequests} appointments={appointments} showPatientLifecycle />}
        {activeTab === 2 && <AccountList onDeactivate={setDeactivateUser} users={activeCounselors} onToggle={handleToggleSuspension} showCounselorDetails requests={careRequests} appointments={appointments} />}
        {activeTab === 3 && <AccountList onDeactivate={setDeactivateUser} users={discoveryPatients} onToggle={handleToggleSuspension} onSelectCase={openCase} requests={careRequests} appointments={appointments} showPatientLifecycle />}
        {activeTab === 4 && <AccountList onDeactivate={setDeactivateUser} users={archiveFilter === 'all' ? [...deactivatedPatients, ...deactivatedCounselors] : archiveFilter === 'patients' ? deactivatedPatients : deactivatedCounselors} onToggle={handleToggleSuspension} showCounselorDetails={archiveFilter === 'counselors'} requests={careRequests} appointments={appointments} />}
      </Box>
      <Drawer anchor="right" open={Boolean(selectedCase) && !scheduleOpen} onClose={() => setSelectedCase(null)} PaperProps={{ sx: { width: { xs: '100vw', sm: 500 }, maxWidth: '100vw', p: 0 } }}>
        {selectedCase && currentCaseRequest && <Stack spacing={0} sx={{ height: '100%', overflowY: 'auto' }}>
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F5FAFF 55%, #E8F4FF 100%)',
              color: '#172B4D',
              borderBottom: '1px solid #DCEAF7',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 750 }}>CASE Number : {selectedCase.user.id}</Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                  sx={{ flexWrap: 'wrap', gap: 1.5 }}
                >
                  <Typography variant="h5" fontWeight={800}>
                    {selectedCase.user.name}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      component="a"
                      href={`mailto:${selectedCase.user.email}`}
                      clickable
                      icon={<EmailIcon />}
                      label={selectedCase.user.email || 'Email not provided'}
                      size="medium"
                      variant="outlined"
                      sx={{
                        color: '#172B4D',
                        borderColor: '#DCEAF7',
                        bgcolor: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        '&:hover': { bgcolor: '#E8F4FF' },
                      }}
                    />

                    {currentCaseRequest.patientMobile && (
                      <Chip
                        component="a"
                        href={`tel:${currentCaseRequest.patientMobile}`}
                        clickable
                        icon={<PhoneIcon />}
                        label={currentCaseRequest.patientMobile}
                        size="medium"
                        variant="outlined"
                        sx={{
                          color: '#172B4D',
                          borderColor: '#DCEAF7',
                          bgcolor: 'rgba(255,255,255,0.7)',
                          textDecoration: 'none',
                          '&:hover': { bgcolor: '#E8F4FF' },
                        }}
                      />
                    )}
                  </Stack>
                </Stack>
              </Box>
              <IconButton aria-label="Close patient details" onClick={() => setSelectedCase(null)} sx={{ color: 'inherit' }}><CloseIcon sx={{ color: '#486581' }} /></IconButton>
            </Stack>
            <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 800 } }}>
              <Grid
                container
                spacing={0}
                sx={{
                  mt: 2,
                }}
              >
                {[
                  {
                    label: 'Gender',
                    value: selectedCase.user.gender,
                    icon: <PersonIcon />,
                    color: 'primary.main',
                  },
                  {
                    label: 'Date of Birth',
                    value: selectedCase.user.dob,
                    icon: <CalendarMonthOutlinedIcon />,
                    color: 'primary.main',
                  },
                  {
                    label: 'Location',
                    value: [
                      selectedCase.user.city,
                      selectedCase.user.state,
                    ].filter(Boolean).join(', '),
                    icon: <LocationOnOutlinedIcon />,
                    color: 'error.main',
                  },
                  {
                    label: 'Languages',
                    value: selectedCase.user.preferredLanguage,
                    icon: <TranslateIcon />,
                    color: 'success.main',
                  },
                  {
                    label: 'Counseling requirements',
                    value: selectedCase.user.counselingRequirements,
                    icon: <PsychologyOutlinedIcon />,
                    color: 'secondary.main',
                  },
                  {
                    label: 'Discovery Call',
                    value: discoveryIsComplete
                      ? 'Completed'
                      : 'Pending',
                    subValue: discoveryIsComplete
                      ? (currentCaseRequest.discoveryNotesHistory?.at(-1)?.at ||
                        [...(currentCaseRequest.timeline || [])]
                          .reverse()
                          .find(event => event.status === 'discovery_completed')?.at ||
                        currentCaseRequest.updatedAt)
                        ? new Date(
                          currentCaseRequest.discoveryNotesHistory?.at(-1)?.at ||
                          [...(currentCaseRequest.timeline || [])]
                            .reverse()
                            .find(event => event.status === 'discovery_completed')?.at ||
                          currentCaseRequest.updatedAt
                        ).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                        : null
                      : null,
                    icon: <AccessTimeIcon />,
                    color: discoveryIsComplete ? 'success.main' : 'warning.main',
                  },
                  {
                    label: 'Counselor Assignment',
                    value: currentCaseRequest.finalCounselorName ||
                      'Not assigned',
                    icon: <PsychologyOutlinedIcon />,
                    color: currentCaseRequest.finalCounselorId
                      ? 'success.main'
                      : 'warning.main',
                  },
                ].map(item => (
                  <Grid
                    size={{ xs: 6, sm: 4, md: 3 }}
                    key={item.label}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        p: { xs: 1.25, sm: 1 },
                        height: '100%',
                        // minHeight: { xs: 100, sm: 110 },
                        borderRadius: 2,
                        bgcolor: 'rgba(198, 198, 198, 0)',
                        // borderColor: '#DCEAF7',
                        border: 'none',
                        color: '#172B4D',
                        boxShadow: '0 2px 2px rgba(96, 97, 98, 0.08)',
                      }}
                    >
                      <Box sx={{ display: 'flex', color: item.color, flexShrink: 0, gap: 1 }}>
                        {item.icon}
                        <Typography
                          variant="body"
                          sx={{
                            display: 'block',
                            alignContent: "center",
                            mb: 1,
                            color: 'inherit',
                            opacity: 0.8,
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {item.value || '—'}
                        </Typography>
                      </Stack>

                      {item.subValue && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}
                        >
                          {item.subValue}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
          <Stack spacing={2.5} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <>
              {/* Intake Details */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                {/* <Stack direction="row" spacing={1.25} alignItems="center"> */}
                <Typography variant="overline"
                  sx={{ opacity: 0.8, fontWeight: 750, display: 'block' }}>
                  INTAKE DETAILS
                </Typography>
                {/* </Stack> */}
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      <AccessTimeIcon />
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', fontWeight: 650 }}
                      >
                        Registration received
                      </Typography>
                      <Typography fontWeight={500}>
                        {currentCaseRequest.createdAt
                          ? new Date(currentCaseRequest.createdAt).toLocaleString(
                            'en-IN',
                            {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: 'numeric', minute: '2-digit'
                            }
                          )
                          : '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      <VideocamOutlinedIcon />
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', fontWeight: 650 }}
                      >
                        Consultation mode
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Typography fontWeight={500}>
                          {currentCaseRequest.preferredFormat ||
                            currentCaseRequest.supportType ||
                            currentCaseRequest.caseType ||
                            'Not specified'}
                        </Typography>
                        <Typography color="text.disabled">•</Typography>
                        <Typography color="text.secondary">
                          {currentCaseRequest.preferredLanguage || 'Language not specified'}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              {currentCaseRequest.intakeNotes && (
                <Box sx={{ mt: 2.5, pt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Intake notes
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {currentCaseRequest.intakeNotes}
                  </Typography>
                </Box>
              )}
            </>


            <Box>
              <Stack spacing={1.5}>
                <Box>

                  {['accepted', 'discovery_scheduled', 'discovery_completed', 'matched', 'active'].includes(currentCaseRequest.status) && (
                    <>
                      <DiscoveryCallEditor
                        key={currentCaseRequest.id}
                        request={currentCaseRequest}
                        busy={discoveryBusy}
                        completed={discoveryIsComplete}
                        onSave={saveDiscovery}
                      />

                      <DiscoveryPlanSummary
                        plan={currentCaseRequest.discoveryPlan}
                      />
                    </>
                  )}

                </Box>

                <Divider />

                <Box>
                  <Typography
                    variant="overline"
                    sx={{ opacity: 0.8, fontWeight: 750, display: 'block', mb: 1 }}
                  >
                    DISCOVERY NOTE HISTORY
                  </Typography>

                  {currentCaseRequest.discoveryNotesHistory?.length ? (
                    <Box sx={{ pl: 0.5 }}>
                      {[...currentCaseRequest.discoveryNotesHistory]
                        .reverse()
                        .map((entry, index, entries) => {
                          const isLast = index === entries.length - 1;

                          return (
                            <Box
                              key={`${entry.at}-${index}`}
                              sx={{
                                display: 'flex',
                                gap: 1.5,
                                position: 'relative',
                                pb: isLast ? 0 : 2,
                              }}
                            >
                              {/* Timeline dot and connecting line */}
                              <Box
                                sx={{
                                  width: 22,
                                  flexShrink: 0,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  position: 'relative',
                                }}
                              >
                                {!isLast && (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: 9,
                                      bottom: -16,
                                      width: 2,
                                      bgcolor: 'divider',
                                    }}
                                  />
                                )}

                                <Box
                                  sx={{
                                    width: 9,
                                    height: 9,
                                    mt: 0.5,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    flexShrink: 0,
                                    zIndex: 1,
                                  }}
                                />
                              </Box>

                              {/* Note details */}
                              <Box
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 0.25,
                                  pb: 0.25,
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                                  {new Date(entry.at).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                  <Box>
                                    Noted by : {' '}
                                    {entry.actorName || 'Admin'}
                                  </Box>
                                </Typography>

                                <Typography
                                  variant="body2"
                                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                                >
                                  {entry.notes}
                                </Typography>
                                <Divider />
                              </Box>
                            </Box>
                          );
                        })}
                    </Box>
                  ) : currentCaseRequest.discoveryNotes ? (
                    <Box sx={{ display: 'flex', gap: 1.5, pl: 0.5 }}>
                      <Box sx={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        <Box
                          sx={{
                            width: 9,
                            height: 9,
                            mt: 0.5,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Current saved notes
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                          {currentCaseRequest.discoveryNotes}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No discovery notes recorded yet.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>

            {currentCaseRequest.status === 'discovery_completed' && !currentCaseRequest.finalCounselorId && <Box>
              <Typography variant="subtitle2" fontWeight={750} gutterBottom>Assign counselor and schedule session</Typography>
              <Button variant="contained" disabled={discoveryBusy} onClick={() => setScheduleOpen(true)}>Assign counselor and schedule session</Button>
            </Box>}

            {currentCaseRequest.finalCounselorId && ['matched', 'active'].includes(currentCaseRequest.status) && <Box>
              {/* <Typography variant="subtitle2" fontWeight={750} gutterBottom>Assigned counselor</Typography> */}
              {/* <Typography variant="body2" color="text.secondary">{assignedCounselor?.name || currentCaseRequest.finalCounselorName || 'Counselor assigned'}</Typography> */}
              {scheduledCaseSession ? <Alert severity="success" sx={{ mt: 1, borderRadius: "8px" }}> <Box> <strong> Session booked for : </strong> {shortDate(scheduledCaseSession.date)} at {scheduledCaseSession.time} IST </Box> <Divider sx={{ m: 0.5 }} /> <Box> <strong>Type of Consultation :</strong> {scheduledCaseSession.appointmentType || 'Consultation'} </Box> </Alert> : <Button sx={{ mt: 1 }} variant="contained" onClick={() => setScheduleOpen(true)}>Schedule session with counselor</Button>}
            </Box>}

            {!!currentCaseRequest.timeline?.length && (
              <Box component="details" sx={{ mb: 1.5 }}>
                <Typography
                  component="summary"
                  variant="overline"
                  fontWeight={650}
                  sx={{
                    cursor: 'pointer',
                    mb: 1.5,
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                    color: 'text.secondary',
                    opacity: 0.8,
                    fontWeight: 750,
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  Care timeline ({currentCaseRequest.timeline.length})
                </Typography>

                <Box sx={{ pl: 0.5 }}>
                  {[...currentCaseRequest.timeline]
                    .reverse()
                    .map((event, index, events) => {
                      const isLast = index === events.length - 1;
                      const isApproved = event.status === 'accepted';

                      return (
                        <Box
                          key={`${event.at}-${index}`}
                          sx={{
                            display: 'flex',
                            gap: 1.5,
                            position: 'relative',
                            pb: isLast ? 0 : 2,
                          }}
                        >
                          {/* Timeline icon and connecting line */}
                          <Box
                            sx={{
                              width: 22,
                              flexShrink: 0,
                              display: 'flex',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            {!isLast && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 17,
                                  bottom: -16,
                                  width: 2,
                                  bgcolor: 'divider',
                                }}
                              />
                            )}

                            <Box
                              sx={{
                                zIndex: 1,
                                width: 17,
                                height: 17,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                bgcolor: isApproved
                                  ? 'success.light'
                                  : 'action.selected',
                                color: isApproved
                                  ? 'success.dark'
                                  : 'text.secondary',
                              }}
                            >
                              {isApproved ? (
                                <CheckCircleIcon sx={{ fontSize: 17 }} />
                              ) : (
                                <PersonIcon sx={{ fontSize: 13 }} />
                              )}
                            </Box>
                          </Box>

                          {/* Event details */}
                          <Box sx={{
                            flex: 1,
                            minWidth: 0,
                            pb: 0.25,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.25
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                              {new Date(event.at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })} <Box component="span" fontWeight={700}>
                                Done by : {event.actorName || 'System'}
                              </Box>
                            </Typography>

                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                              {event.note}
                            </Typography>

                            <Divider />

                          </Box>
                        </Box>
                      );
                    })}
                </Box>
              </Box>
            )}

          </Stack>
        </Stack>}
      </Drawer>

      {scheduleOpen && currentCaseRequest && <AdminScheduleSession
        key={currentCaseRequest.id}
        request={currentCaseRequest}
        patient={selectedCase.user}
        appointments={appointments}
        onPartiallyScheduled={result => setAppointments(previous => {
          const savedIds = new Set(result.appointments.map(item => item.id));
          return [...previous.filter(item => !savedIds.has(item.id)), ...result.appointments];
        })}
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

      {editingAppointment && <EditScheduledSession key={editingAppointment.id} appointment={editingAppointment} onClose={() => setEditingAppointment(null)} onSaved={result => {
        setAppointments(previous => previous.map(item => item.id === result.appointment.id ? result.appointment : item));
        setEditingAppointment(null); setSuccess(result.message || 'Session updated.');
      }} />}

      <Dialog open={Boolean(decisionRequest)} onClose={() => !decisionBusy && setDecisionRequest(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject registration request</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>Reject the registration for <strong>{decisionRequest?.patientName}</strong>?</Typography>
          <TextField autoFocus multiline minRows={3} label="Reason for rejection" value={decisionReason} onChange={event => setDecisionReason(event.target.value)} />
        </Stack></DialogContent>
        <DialogActions><Button disabled={decisionBusy} onClick={() => setDecisionRequest(null)}>Cancel</Button><Button color="error" variant="contained" disabled={decisionBusy || !decisionReason.trim()} onClick={() => decideRegistration('rejected')}>{decisionBusy ? 'Saving…' : 'Reject request'}</Button></DialogActions>
      </Dialog>


      {deactivateUser?.role === 'counselor' && <CounselorDeactivationDialog key={deactivateUser.id} counselor={deactivateUser} onClose={() => setDeactivateUser(null)} onComplete={result => {
        setDeactivateUser(null); setSuccess(result.message); void fetchAdminData();
      }} />}

      {/* Create User Dialog Modal */}



      {/* Create Counselor Dialog Modal */}
      <Dialog open={createCounselorOpen} onClose={() => setCreateCounselorOpen(false)} maxWidth="sm" fullWidth>
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
                {/* <TextField
                  label="Licensure / Credentials"
                  fullWidth
                  margin="normal"
                  size="small"
                  required
                  placeholder="e.g. Licensed LCSW #39420"
                  value={createCredentials}
                  onChange={(e) => setCreateCredentials(e.target.value)}
                /> */}
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
          <Button onClick={() => setCreateCounselorOpen(false)} disabled={createLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={createLoading}
          >
            {createLoading ? <CircularProgress size={24} /> : 'Create Counselor'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}
