import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, Button, Avatar,
  Chip, Divider, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, Select, MenuItem,
  FormHelperText, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { toast } from 'react-toastify';
import { api } from '../api';
import { INDIAN_STATES, INDIAN_STATES_AND_DISTRICTS } from '../data/indianLocations';

const ALL_LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali',
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function Profile({ currentUser, onUserUpdated }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(currentUser || api.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      const stored = api.getCurrentUser();
      if (stored) {
        setUser(stored);
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleOpenEdit = () => {
    setEditDraft({
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '',
      gender: user.gender || '',
      dob: user.dob || '',
      state: user.state || 'Maharashtra',
      district: user.district || 'Mumbai',
      address: user.address || '',
      preferredLanguage: user.preferredLanguage || 'English',
      preferredCounselingMode: user.preferredCounselingMode || 'Online',
      counselingRequirements: user.counselingRequirements || '',
      specialty: user.specialty || '',
      bio: user.bio || '',
      credentials: user.credentials || '',
      registrationNumber: user.registrationNumber || '',
    });
    setEditOpen(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditDraft(prev => ({ ...prev, avatar: reader.result }));
      toast.success('Profile photo uploaded preview ready.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setEditDraft(prev => ({
      ...prev,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(prev.name || 'User')}`
    }));
  };

  const handleSaveProfile = async () => {
    if (!editDraft.name || editDraft.name.trim().length < 3) {
      toast.error('Please enter a valid full legal name.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.updateProfile(editDraft);
      const updatedUser = res.user || { ...user, ...editDraft };
      setUser(updatedUser);
      api.setCurrentUser(updatedUser);
      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }
      toast.success('Profile updated successfully!');
      setEditOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={48} sx={{ color: '#4c3b71' }} />
      </Box>
    );
  }

  const isApproved = user.approved === true;
  const isCounselor = user.role === 'counselor';
  const isAdmin = user.role === 'admin';

  const userLanguages = Array.isArray(user.languages) && user.languages.length > 0
    ? user.languages
    : (user.preferredLanguage ? user.preferredLanguage.split(',').map(s => s.trim()).filter(Boolean) : ['English']);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="lg">
        {/* Back navigation */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            component={Link}
            to={isAdmin ? '/admin' : '/dashboard'}
            startIcon={<ArrowBackIcon />}
            sx={{
              color: '#475569',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.9rem',
              '&:hover': { color: '#1e1b4b', bgcolor: 'transparent' }
            }}
          >
            Back to Dashboard
          </Button>

          <Button
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={handleOpenEdit}
            sx={{
              bgcolor: '#4c3b71',
              color: '#ffffff',
              fontWeight: 700,
              borderRadius: '12px',
              textTransform: 'none',
              px: 2.5,
              py: 0.9,
              boxShadow: '0 4px 14px rgba(76, 59, 113, 0.25)',
              '&:hover': { bgcolor: '#3b2064' }
            }}
          >
            Edit Profile
          </Button>
        </Box>

        {/* Profile Hero Header Card */}
        <Card
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
            mb: 3.5,
            background: 'linear-gradient(135deg, rgba(243, 232, 255, 0.4) 0%, #ffffff 60%)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user.avatar}
                alt={user.name}
                sx={{
                  width: { xs: 80, sm: 100 },
                  height: { xs: 80, sm: 100 },
                  borderRadius: '24px',
                  border: '3px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.15)',
                  bgcolor: '#ede9fe',
                  color: '#6b21a8',
                  fontSize: '2rem',
                  fontWeight: 800
                }}
              >
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </Avatar>
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b', fontSize: { xs: '1.6rem', sm: '2rem' } }}>
                  {user.name}
                </Typography>

                {/* Role Pill */}
                <Chip
                  icon={isCounselor ? <PsychologyIcon sx={{ fontSize: '16px !important' }} /> : <PersonIcon sx={{ fontSize: '16px !important' }} />}
                  label={user.role ? user.role.toUpperCase() : 'PATIENT'}
                  size="small"
                  sx={{
                    bgcolor: '#f3e8ff',
                    color: '#6b21a8',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    letterSpacing: '0.5px'
                  }}
                />

                {/* Verification Status Pill */}
                <Chip
                  icon={isApproved ? <CheckCircleIcon sx={{ fontSize: '16px !important', color: '#16a34a !important' }} /> : <HourglassEmptyIcon sx={{ fontSize: '16px !important', color: '#d97706 !important' }} />}
                  label={isApproved ? 'Verified & Approved' : 'Profile Under Review'}
                  size="small"
                  sx={{
                    bgcolor: isApproved ? '#dcfce7' : '#fef3c7',
                    color: isApproved ? '#15803d' : '#b45309',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    border: '1px solid',
                    borderColor: isApproved ? '#bbf7d0' : '#fde68a'
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <span><strong>Mobile:</strong> +91 {user.mobile || 'Not set'}</span>
                <span>•</span>
                <span><strong>Email:</strong> {user.email || 'Not set'}</span>
                {user.caseId && (
                  <>
                    <span>•</span>
                    <span><strong>Case ID:</strong> <span style={{ color: '#7c3aed', fontWeight: 700 }}>{user.caseId}</span></span>
                  </>
                )}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Profile Content Grid */}
        <Grid container spacing={3}>
          {/* Left Column: Personal & Location Details */}
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#f3e8ff', color: '#7c3aed' }}>
                  <PersonIcon fontSize="small" />
                </Box>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#1e1b4b' }}>
                  Personal Information
                </Typography>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Legal Full Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                    {user.name || 'Not provided'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Mobile Number
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                    +91 {user.mobile || 'Not provided'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Email Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e1b4b' }}>
                    {user.email || 'Not provided'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Gender
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e1b4b' }}>
                    {user.gender || 'Not specified'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Date of Birth
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e1b4b' }}>
                    {user.dob || 'Not provided'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Account Created
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e1b4b' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 4, mb: 2.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#f1f5f9', color: '#475569' }}>
                  <HomeOutlinedIcon fontSize="small" />
                </Box>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#1e1b4b' }}>
                  Residential Location
                </Typography>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    State / UT
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                    {user.state || 'Not specified'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    District / City
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                    {user.district || user.city || 'Not specified'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Full Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>
                    {user.address || 'No detailed address provided'}
                  </Typography>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Right Column: Counseling Preferences & Clinical Details */}
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#ccfbf1', color: '#0d9488' }}>
                  <ShieldOutlinedIcon fontSize="small" />
                </Box>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#1e1b4b' }}>
                  {isCounselor ? 'Professional & Clinical Profile' : 'Care & Intake Preferences'}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2.5}>
                {isCounselor ? (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Specialty Domain
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                        {user.specialty || 'General Therapy'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Credentials / Title
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                        {user.credentials || 'Accredited Counselor'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Experience
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e1b4b' }}>
                        {user.experience ? `${user.experience} years` : '1+ years'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Registration / License No.
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e1b4b' }}>
                        {user.registrationNumber || 'Pending verification'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Professional Bio & Practice Focus
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {user.bio || 'No professional bio provided.'}
                      </Typography>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Preferred Session Format
                      </Typography>
                      <Chip
                        icon={<VideocamOutlinedIcon sx={{ fontSize: '15px !important' }} />}
                        label={user.preferredCounselingMode || 'Online'}
                        size="small"
                        sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 700 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Case Reference Number
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                        {user.caseId || 'Assigned on match'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.75 }}>
                        Preferred Consultation Languages
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {userLanguages.map(lang => (
                          <Chip
                            key={lang}
                            label={lang}
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', color: '#1e1b4b', fontWeight: 600 }}
                          />
                        ))}
                      </Box>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Counseling Needs / Focus Areas
                      </Typography>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: '12px',
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          minHeight: '90px'
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap' }}>
                          {user.counselingRequirements || 'No specific goals described during intake.'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </>
                )}
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Edit Profile Dialog Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b' }}>
          Edit Profile Information
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {/* Avatar Edit Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
            <Avatar
              src={editDraft.avatar}
              sx={{ width: 72, height: 72, borderRadius: '18px', border: '2px solid #7c3aed' }}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                Profile Photo
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Upload a clear photo (JPG/PNG, max 5MB)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                >
                  Upload Photo
                  <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                </Button>
                {editDraft.avatar && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlinedIcon />}
                    onClick={handleRemovePhoto}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Reset
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                fullWidth
                value={editDraft.name || ''}
                onChange={(e) => setEditDraft(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Email Address"
                fullWidth
                value={editDraft.email || ''}
                onChange={(e) => setEditDraft(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, color: '#475569' }}>Gender</Typography>
                <Select
                  value={editDraft.gender || ''}
                  onChange={(e) => setEditDraft(prev => ({ ...prev, gender: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select Gender</MenuItem>
                  {GENDER_OPTIONS.map(g => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, color: '#475569' }}>State</Typography>
                <Select
                  value={editDraft.state || ''}
                  onChange={(e) => {
                    const st = e.target.value;
                    const districts = INDIAN_STATES_AND_DISTRICTS[st] || [];
                    setEditDraft(prev => ({ ...prev, state: st, district: districts[0] || '' }));
                  }}
                >
                  {INDIAN_STATES.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, color: '#475569' }}>District</Typography>
                <Select
                  value={editDraft.district || ''}
                  onChange={(e) => setEditDraft(prev => ({ ...prev, district: e.target.value }))}
                >
                  {(INDIAN_STATES_AND_DISTRICTS[editDraft.state] || []).map(d => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Full Address"
                fullWidth
                multiline
                rows={2}
                value={editDraft.address || ''}
                onChange={(e) => setEditDraft(prev => ({ ...prev, address: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Counseling Needs / Goals"
                fullWidth
                multiline
                rows={3}
                value={editDraft.counselingRequirements || ''}
                onChange={(e) => setEditDraft(prev => ({ ...prev, counselingRequirements: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={saving}
            sx={{
              bgcolor: '#4c3b71',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '10px',
              '&:hover': { bgcolor: '#3b2064' }
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
