import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Container, Card, Typography, TextField, Button,
  Grid, MenuItem, FormControl, Select, FormHelperText,
  Checkbox, ListItemText, OutlinedInput, FormControlLabel, Alert, CircularProgress, Chip,
  Divider, InputAdornment, Paper, Tooltip, Avatar, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import LockIcon from '@mui/icons-material/Lock';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SpaIcon from '@mui/icons-material/Spa';
import GroupsIcon from '@mui/icons-material/Groups';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { toast } from 'react-toastify';
import { api } from '../api';
import { INDIAN_STATES, INDIAN_STATES_AND_DISTRICTS } from '../data/indianLocations';

const ALL_LANGUAGES = [
  'English', 'Hindi', 'Marathi'
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' }
];

const CONSENT_ITEMS = [
  {
    id: 'purpose',
    title: '1. Purpose of Counseling & Ethical Scope',
    detail: 'I understand counseling provides structured psychological support and emotional wellness guidance, and is not a substitute for inpatient psychiatric treatment.'
  },
  {
    id: 'confidentiality',
    title: '2. Confidentiality & Limits of Privacy',
    detail: 'All counseling notes and conversations are strictly confidential except in mandatory legal disclosure situations (imminent harm to self or others).'
  },
  {
    id: 'voluntary',
    title: '3. Voluntary Engagement & Autonomy',
    detail: 'I participate voluntarily and maintain the right to pause or discontinue sessions at any stage without prejudice.'
  },
  {
    id: 'documentVersion',
    title: '4. Emergency Contact & Crisis Notice',
    detail: 'I acknowledge this platform is not for life-threatening emergencies. For acute crisis, I will reach out to local emergency services (112 or 988).'
  },
  {
    id: 'terms',
    title: '5. Terms of Service & Client Rights',
    detail: 'I confirm full agreement to the code of conduct, privacy policy, and client rights charter of Counselling Program.'
  }
];

const generateCaseId = () => {
  const letters = 'CP';
  const num = Math.floor(100000 + Math.random() * 900000);
  return `#${letters}-${num}`;
};

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateAge = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const formFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#f8fafc',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    fontSize: '0.92rem',
    fontWeight: 500,
    color: '#0f172a',
    '& fieldset': {
      borderColor: '#e2e8f0',
      borderWidth: '1.5px',
    },
    '&:hover fieldset': {
      borderColor: '#cbd5e1',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#7c3aed',
      borderWidth: '2px',
    },
    '&.Mui-disabled': {
      bgcolor: '#f1f5f9',
      '& fieldset': {
        borderColor: '#e2e8f0',
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#1e1b4b',
    transform: 'none',
    position: 'relative',
    marginBottom: '6px',
    '&.Mui-focused': {
      color: '#4c3b71',
    },
  },
  '& .MuiFormHelperText-root': {
    marginLeft: '2px',
    marginTop: '5px',
    fontSize: '0.76rem',
    color: '#64748b',
  },
};
export default function Register({ onAuthSuccess, onOpenAuth, currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  const preVerifiedMobile = location.state?.verifiedMobile || '';

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const [activeStep, setActiveStep] = useState(() => (preVerifiedMobile ? 1 : 0));

  const [verifyMobile, setVerifyMobile] = useState(() => preVerifiedMobile || '');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState(['English', 'Hindi']);

  const [formData, setFormData] = useState({
    name: '',
    mobile: preVerifiedMobile,
    email: '',
    gender: '',
    dob: '',
    state: 'Maharashtra',
    district: 'Mumbai',
    address: '',
    preferredCounselingMode: 'Online',
    counselingRequirements: '',
  });

  useEffect(() => {
    if (location.state?.verifiedMobile) {
      setFormData(prev => ({ ...prev, mobile: location.state.verifiedMobile }));
      setActiveStep(1);
    }
  }, [location.state]);

  const [caseId] = useState(() => generateCaseId());

  const [consents, setConsents] = useState({
    purpose: false,
    confidentiality: false,
    voluntary: false,
    documentVersion: false,
    terms: false,
  });

  const [errors, setErrors] = useState({});
  const [consentErrors, setConsentErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const availableDistricts = useMemo(() => {
    if (!formData.state) return [];
    return INDIAN_STATES_AND_DISTRICTS[formData.state] || ['Main District', 'Other District'];
  }, [formData.state]);

  const maxDobDate = useMemo(() => {
    return getTodayDateString();
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      toast.success('Photo uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
  };

  const handleToggleLanguage = (lang) => {
    setSelectedLanguages(prev => {
      if (prev.includes(lang)) {
        if (prev.length === 1) {
          toast.info('At least one language must be selected.');
          return prev;
        }
        return prev.filter(l => l !== lang);
      } else {
        return [...prev, lang];
      }
    });
  };

  const handleVerifyMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setVerifyMobile(val);
    setVerifyOtp('');
    setOtpSent(false);
  };

  const handleSendInitialOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = verifyMobile.replace(/\D/g, '');
    if (!cleanMobile) {
      toast.error('Please enter your 10-digit mobile number.');
      return;
    }
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      setOtpSending(true);
      await api.sendOtp(cleanMobile, false);
      setOtpSent(true);
      setVerifyOtp('');
      setOtpCountdown(30);
      toast.success(`OTP sent to +91 ${cleanMobile}!`);
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyInitialOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = verifyMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!verifyOtp || verifyOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await api.verifyRegistrationOtp(cleanMobile, verifyOtp.trim());

      if (res.user || res.exists || res.registered) {
        toast.info('This mobile number is already registered! Signing you in...');
        if (onAuthSuccess && res.user) {
          onAuthSuccess(res.user);
        }
        setTimeout(() => {
          if (res.user?.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 1000);
        return;
      }

      toast.success('Mobile number verified! Please complete your registration details.');
      setFormData(prev => ({
        ...prev,
        mobile: cleanMobile
      }));
      setActiveStep(1);
    } catch (err) {
      toast.error(err.message || 'Invalid OTP code.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'state') {
        const districts = INDIAN_STATES_AND_DISTRICTS[value] || [];
        updated.district = districts[0] || '';
      }
      // No age restriction based on gender
      return updated;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleConsentChange = (id, checked) => {
    setConsents(prev => ({ ...prev, [id]: checked }));
    if (consentErrors[id]) {
      setConsentErrors(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSelectAllConsents = () => {
    const allChecked = CONSENT_ITEMS.every(item => consents[item.id]);
    const newState = {};
    CONSENT_ITEMS.forEach(item => {
      newState[item.id] = !allChecked;
    });
    setConsents(newState);
    setConsentErrors({});
  };

  const validateStep1 = () => {
    const errs = {};

    if (!formData.name || !formData.name.trim()) {
      errs.name = 'Full legal name is required.';
    } else if (formData.name.trim().length < 3) {
      errs.name = 'Please provide full name (at least 3 characters).';
    }

    if (!formData.mobile || formData.mobile.replace(/\D/g, '').length !== 10) {
      errs.mobile = 'A valid 10-digit mobile number is required.';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please provide a valid email address.';
      }
    }

    if (!formData.gender) {
      errs.gender = 'Please select your gender first.';
    }

    if (!formData.dob) {
      errs.dob = 'Date of birth is required.';
    } else {
      const age = calculateAge(formData.dob);
      if (age === null || age < 0 || age > 125) {
        errs.dob = 'Please enter a valid date of birth.';
      }
    }

    if (!formData.state) {
      errs.state = 'Please select your residential State.';
    }

    if (!formData.district) {
      errs.district = 'Please select your residential District.';
    }

    if (!formData.preferredCounselingMode) {
      errs.preferredCounselingMode = 'Please select your preferred session mode.';
    }

    if (selectedLanguages.length === 0) {
      errs.languages = 'Please select at least one preferred language.';
    }

    if (!formData.counselingRequirements || formData.counselingRequirements.trim().length < 10) {
      errs.counselingRequirements = 'Please provide at least 10 characters so we can match the best counsellor.';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please complete all required fields correctly.');
      return false;
    }
    return true;
  };

  const handleProceedToStep2 = () => {
    if (validateStep1()) {
      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateStep2 = () => {
    const cErrs = {};
    let hasError = false;

    CONSENT_ITEMS.forEach(item => {
      if (!consents[item.id]) {
        cErrs[item.id] = true;
        hasError = true;
      }
    });

    setConsentErrors(cErrs);
    if (hasError) {
      toast.error('All 5 ethical consent points must be acknowledged to continue.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        mobile: formData.mobile.replace(/\D/g, ''),
        email: formData.email ? formData.email.trim() : '',
        avatar: avatarPreview || '',
        gender: formData.gender,
        dob: formData.dob,
        state: formData.state,
        district: formData.district,
        city: formData.district,
        address: formData.address ? formData.address.trim() : '',
        languages: selectedLanguages,
        preferredLanguage: selectedLanguages.join(', '),
        preferredCounselingMode: formData.preferredCounselingMode,
        counselingRequirements: formData.counselingRequirements.trim(),
        caseId: caseId,
        consents: consents,
        role: 'patient',
      };

      const res = await api.register(payload);
      toast.success('Registration completed successfully! Welcome to Counselling Program.');

      if (onAuthSuccess && res.user) {
        onAuthSuccess(res.user);
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allConsentsSelected = CONSENT_ITEMS.every(item => consents[item.id]);
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 70px)',
        py: { xs: 3, sm: 6 },
        background: 'radial-gradient(circle at 10% 20%, rgba(243, 232, 255, 0.65) 0%, rgba(248, 250, 252, 0.94) 85%), url(/registration-bg.png)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, px: 1, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: activeStep >= 1 ? '#4c3b71' : '#cbd5e1',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                1
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: activeStep === 1 ? '#4c3b71' : '#64748b' }}>
                Personal & Session Details
              </Typography>
            </Box>

            <Box sx={{ width: 28, height: 2, bgcolor: '#cbd5e1' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: activeStep === 2 ? '#4c3b71' : '#e2e8f0',
                  color: activeStep === 2 ? '#ffffff' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                2
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: activeStep === 2 ? '#4c3b71' : '#94a3b8' }}>
                Consent & Confirmation
              </Typography>
            </Box>
          </Box>
        </Box>

        {activeStep === 0 && (
          <Card
            elevation={0}
            sx={{
              p: { xs: 3.5, sm: 5 },
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '14px',
                  bgcolor: '#f3e8ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PhoneIphoneIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b', fontSize: { xs: '1.25rem', sm: '1.45rem' } }}>
                  Mobile Number Verification
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Please enter your mobile number to verify and start registration.
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3.5, borderRadius: '12px', bgcolor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff', '& .MuiAlert-icon': { color: '#7c3aed' } }}>
              New users will be taken directly to the registration intake form. If you already have an account, you will be signed in.
            </Alert>

            <Box component="form" onSubmit={otpSent ? handleVerifyInitialOtp : handleSendInitialOtp}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    10-Digit Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    disabled={otpSent}
                    value={verifyMobile}
                    onChange={handleVerifyMobileChange}
                    inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pr: 1, borderRight: '1px solid #cbd5e1' }}>
                            <PhoneIphoneIcon sx={{ color: '#64748b', fontSize: 18 }} />
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>+91</Typography>
                          </Box>
                        </InputAdornment>
                      )
                    }}
                    helperText="10-digit Indian mobile number"
                    sx={formFieldSx}
                    autoFocus
                  />
                </Grid>

                {otpSent && (
                  <Grid size={{ xs: 12 }} sx={{ width: '100%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                      6-Digit OTP Verification Code <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: '#64748b', fontSize: 18 }} />
                          </InputAdornment>
                        )
                      }}
                      helperText="Enter 6-digit verification code"
                      sx={formFieldSx}
                      autoFocus
                    />
                  </Grid>
                )}
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {otpSent ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setOtpSent(false);
                      setVerifyOtp('');
                    }}
                    sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
                  >
                    Change Number
                  </Button>
                ) : (
                  <Box />
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={otpSending || otpVerifying}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#4c3b71',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    py: 1.3,
                    px: 3.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(76, 59, 113, 0.25)',
                    '&:hover': { bgcolor: '#3b2064' }
                  }}
                >
                  {otpSending || otpVerifying ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : otpSent ? (
                    'Verify & Proceed to Intake'
                  ) : (
                    'Send OTP Code'
                  )}
                </Button>
              </Box>
            </Box>
          </Card>
        )}
        {activeStep === 1 && (
          <Card
            elevation={0}
            sx={{
              p: { xs: 3.5, sm: 5 },
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    bgcolor: '#f3e8ff',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PersonOutlinedIcon sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b', fontSize: { xs: '1.25rem', sm: '1.45rem' } }}>
                    Step 1 — Personal & Session Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Please provide your contact details, profile photo, and counseling preferences.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mb: 4, p: 2.5, bgcolor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                <Avatar
                  src={avatarPreview || (formData.name ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(formData.name)}` : '')}
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '18px',
                    border: '2px solid #7c3aed',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
                    bgcolor: '#ede9fe',
                    color: '#6b21a8',
                    fontSize: '1.5rem',
                    fontWeight: 800
                  }}
                >
                  {formData.name ? formData.name[0].toUpperCase() : <PersonOutlinedIcon />}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e1b4b' }}>
                    Profile Photo (Optional)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                    Upload your profile picture. It will be displayed on your profile and dashboard.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      startIcon={<PhotoCameraIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        borderRadius: '10px',
                        borderColor: '#7c3aed',
                        color: '#7c3aed',
                        '&:hover': { borderColor: '#6b21a8', bgcolor: '#f3e8ff' }
                      }}
                    >
                      Upload Photo
                      <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                    </Button>
                    {avatarPreview && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlinedIcon />}
                        onClick={handleRemovePhoto}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem' }}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  1. IDENTIFICATION
                </Typography>
                <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              </Box>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12 }} sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b' }}>
                      Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Legal or preferred
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={Boolean(errors.name)}
                    helperText={errors.name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      )
                    }}
                    sx={formFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.mobile}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pr: 1, borderRight: '1px solid #cbd5e1' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>+91</Typography>
                          </Box>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                        </InputAdornment>
                      )
                    }}
                    helperText="10-digit Indian mobile number (Verified)"
                    sx={formFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    error={Boolean(errors.email)}
                    helperText={errors.email || 'For session confirmations and links'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      )
                    }}
                    sx={formFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Gender <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <FormControl fullWidth error={Boolean(errors.gender)} sx={formFieldSx}>
                    <Select
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      displayEmpty
                      startAdornment={
                        <InputAdornment position="start">
                          <PeopleOutlineIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="" disabled>
                        <span style={{ color: '#94a3b8' }}>Select Gender</span>
                      </MenuItem>
                      {GENDER_OPTIONS.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Date of Birth <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    inputProps={{
                      max: maxDobDate
                    }}
                    error={Boolean(errors.dob)}
                    helperText={errors.dob || 'Open to all age groups'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonthOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      )
                    }}
                    sx={formFieldSx}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  2. RESIDENTIAL LOCATION
                </Typography>
                <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              </Box>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    State / UT <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <FormControl fullWidth error={Boolean(errors.state)} sx={formFieldSx}>
                    <Select
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      displayEmpty
                      startAdornment={
                        <InputAdornment position="start">
                          <MapOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="" disabled>
                        <span style={{ color: '#94a3b8' }}>Select State / UT</span>
                      </MenuItem>
                      {INDIAN_STATES.map(st => (
                        <MenuItem key={st} value={st}>{st}</MenuItem>
                      ))}
                    </Select>
                    {errors.state && <FormHelperText>{errors.state}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    City / District <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <FormControl fullWidth error={Boolean(errors.district)} sx={formFieldSx}>
                    <Select
                      value={formData.district}
                      onChange={(e) => handleChange('district', e.target.value)}
                      displayEmpty
                      disabled={!formData.state}
                      startAdornment={
                        <InputAdornment position="start">
                          <LocationCityOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="" disabled>
                        <span style={{ color: '#94a3b8' }}>{formData.state ? 'Select District' : 'Select State First'}</span>
                      </MenuItem>
                      {availableDistricts.map(dist => (
                        <MenuItem key={dist} value={dist}>{dist}</MenuItem>
                      ))}
                    </Select>
                    {errors.district && <FormHelperText>{errors.district}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Complete Residential Address (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    sx={formFieldSx}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  3. CONSULTATION FORMAT & LANGUAGES
                </Typography>
                <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              </Box>

              <Grid container spacing={2.5}>
                {/* 1) Preferred Languages for Counseling: Multiselect dropdown with English, Hindi, Marathi */}
                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Preferred Languages for Counseling <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <FormControl fullWidth error={Boolean(errors.languages)} sx={formFieldSx}>
                    <Select
                      multiple
                      displayEmpty
                      value={selectedLanguages}
                      onChange={(e) => {
                        const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        setSelectedLanguages(val);
                      }}
                      input={<OutlinedInput />}
                      startAdornment={
                        <InputAdornment position="start">
                          <TranslateOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      }
                      renderValue={(selected) => {
                        if (!selected || selected.length === 0) {
                          return <span style={{ color: '#94a3b8' }}>Select Languages</span>;
                        }
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((val) => (
                              <Chip
                                key={val}
                                label={val}
                                size="small"
                                sx={{
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  bgcolor: '#ede9fe',
                                  color: '#6b21a8'
                                }}
                              />
                            ))}
                          </Box>
                        );
                      }}
                    >
                      {ALL_LANGUAGES.map((lang) => (
                        <MenuItem key={lang} value={lang}>
                          <Checkbox checked={selectedLanguages.indexOf(lang) > -1} />
                          <ListItemText primary={lang} />
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.languages && <FormHelperText>{errors.languages}</FormHelperText>}
                  </FormControl>
                </Grid>

                {/* 2) Preferred Session Mode: Online, Offline */}
                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Preferred Session Mode <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <FormControl fullWidth error={Boolean(errors.preferredCounselingMode)} sx={formFieldSx}>
                    <Select
                      value={formData.preferredCounselingMode || 'Online'}
                      onChange={(e) => handleChange('preferredCounselingMode', e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          {formData.preferredCounselingMode === 'Offline' ? (
                            <GroupsIcon sx={{ color: '#64748b', fontSize: 20 }} />
                          ) : (
                            <VideocamOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                          )}
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="Online">Online</MenuItem>
                      <MenuItem value="Offline">Offline</MenuItem>
                    </Select>
                    {errors.preferredCounselingMode && <FormHelperText>{errors.preferredCounselingMode}</FormHelperText>}
                  </FormControl>
                </Grid>

                {/* 3) Brief Description of Counseling Needs / Goals: Full width (100%) */}
                <Grid size={{ xs: 12 }} sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b' }}>
                      Brief Description of Counseling Needs / Goals <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {formData.counselingRequirements.length} / 500
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={formData.counselingRequirements}
                    onChange={(e) => handleChange('counselingRequirements', e.target.value.slice(0, 500))}
                    error={Boolean(errors.counselingRequirements)}
                    helperText={errors.counselingRequirements || 'Please provide details so we can match the best counsellor for you.'}
                    sx={{ width: '100%', ...formFieldSx }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pt: 2.5,
                borderTop: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.86rem' }}>
                Already registered?{' '}
                <Box
                  component="span"
                  onClick={() => onOpenAuth && onOpenAuth()}
                  sx={{ color: '#4c3b71', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Sign In instead
                </Box>
              </Typography>

              <Button
                variant="contained"
                onClick={handleProceedToStep2}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#4c3b71',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  py: 1.3,
                  px: 3.5,
                  borderRadius: '14px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(76, 59, 113, 0.25)',
                  '&:hover': { bgcolor: '#3b2064' }
                }}
              >
                Continue to Consent
              </Button>
            </Box>
          </Card>
        )}
        {activeStep === 2 && (
          <Card
            elevation={0}
            sx={{
              p: { xs: 3.5, sm: 5 },
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  bgcolor: '#f3e8ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b', fontSize: { xs: '1.25rem', sm: '1.45rem' } }}>
                  Step 2 — Informed Consent & Verification
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Review your intake details and accept the ethical counseling agreements.
                </Typography>
              </Box>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                mb: 3
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#4c3b71', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', mb: 1.5 }}>
                Intake Participant Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Legal Participant Name</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">{formData.name}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Mobile Number</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">+91 {formData.mobile}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Assigned Case ID</Typography>
                  <Typography variant="body2" fontWeight={700} color="#7c3aed">{caseId}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Email Address</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.email || 'Not provided'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Gender & Age</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.gender} ({calculateAge(formData.dob)} yrs)</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.district}, {formData.state}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Languages</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{selectedLanguages.join(', ')}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">Format & Mode</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.preferredCounselingMode}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Mandatory Consent Acknowledgments
                </Typography>
                <Button
                  size="small"
                  onClick={handleSelectAllConsents}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.76rem', color: '#7c3aed' }}
                >
                  {allConsentsSelected ? 'Deselect All' : 'Select All 5'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {CONSENT_ITEMS.map((item) => {
                  const checked = Boolean(consents[item.id]);
                  const hasError = Boolean(consentErrors[item.id]);

                  return (
                    <Paper
                      key={item.id}
                      elevation={0}
                      onClick={() => handleConsentChange(item.id, !checked)}
                      sx={{
                        p: 1.75,
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: hasError ? '#ef4444' : checked ? '#7c3aed' : '#e2e8f0',
                        bgcolor: checked ? '#f3e8ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#7c3aed' }
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checked}
                            onChange={(e) => handleConsentChange(item.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#7c3aed' } }}
                          />
                        }
                        label={
                          <Box>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1b4b' }}>
                              {item.title}
                            </Typography>
                            <Typography sx={{ fontSize: '0.76rem', color: '#64748b', mt: 0.25 }}>
                              {item.detail}
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, alignItems: 'flex-start' }}
                      />
                    </Paper>
                  );
                })}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pt: 2.5,
                borderTop: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Button
                size="small"
                onClick={() => setActiveStep(1)}
                startIcon={<ArrowBackIcon />}
                sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
              >
                Back to Personal Info
              </Button>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                endIcon={<AssignmentTurnedInIcon />}
                sx={{
                  bgcolor: '#4c3b71',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  py: 1.3,
                  px: 3.5,
                  borderRadius: '14px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(76, 59, 113, 0.25)',
                  '&:hover': { bgcolor: '#3b2064' }
                }}
              >
                {submitting ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </Box>
          </Card>
        )}
      </Container>
    </Box>
  );
}
