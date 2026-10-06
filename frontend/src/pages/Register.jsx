import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Container, Card, Typography, TextField, Button,
  Grid, MenuItem, FormControl, Select, FormHelperText,
  Checkbox, FormControlLabel, Alert, CircularProgress, Chip,
  Divider, InputAdornment, Paper, Tooltip
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
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LockIcon from '@mui/icons-material/Lock';
import SpaIcon from '@mui/icons-material/Spa';
import GroupsIcon from '@mui/icons-material/Groups';
import { toast } from 'react-toastify';
import { api } from '../api';
import { INDIAN_STATES, INDIAN_STATES_AND_DISTRICTS } from '../data/indianLocations';

const LANGUAGES = [
  'English', 'Hindi', 'Marathi',
  // 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Other'
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male (Min. 21 yrs)' },
  { value: 'Female', label: 'Female (Min. 18 yrs)' },
  { value: 'Other', label: 'Other (Min. 18 yrs)' },
  { value: 'Prefer not to say', label: 'Prefer not to say (Min. 18 yrs)' }
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

// Calculate Max Date based on required min age
const getMaxDobForGender = (gender) => {
  const today = new Date();
  const minAge = gender === 'Male' ? 21 : 18;
  const maxYear = today.getFullYear() - minAge;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${maxYear}-${month}-${day}`;
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

// Reusable styled input styling matching the screenshot
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
    '& input::placeholder': {
      fontSize: '0.88rem',
      fontWeight: 400,
      color: '#94a3b8',
      opacity: 1,
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

  // If already logged in, redirect
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  // Step 0: Mobile & OTP Verification
  // Step 1: Personal, Demographic & Location Details
  // Step 2: Informed Consent & Verification
  const [activeStep, setActiveStep] = useState(() => (preVerifiedMobile ? 1 : 0));

  // Step 0 State
  const [verifyMobile, setVerifyMobile] = useState(() => preVerifiedMobile || '');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: preVerifiedMobile,
    email: '',
    gender: '', // User must select gender first
    dob: '',
    state: 'Maharashtra',
    district: 'Mumbai',
    address: '',
    preferredLanguage: 'English & Hindi',
    preferredCounselingMode: 'Online',
    counselingRequirements: '',
  });

  // If navigation state updates with verifiedMobile, sync it
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
  const [isSuccess, setIsSuccess] = useState(false);

  // Countdown timer
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Dynamic available districts based on selected state
  const availableDistricts = useMemo(() => {
    if (!formData.state) return [];
    return INDIAN_STATES_AND_DISTRICTS[formData.state] || ['Main District', 'Other District'];
  }, [formData.state]);

  // Dynamic max DOB attribute based on gender
  const maxDobDate = useMemo(() => {
    if (!formData.gender) return '';
    return getMaxDobForGender(formData.gender);
  }, [formData.gender]);

  // Step 0: Send Initial OTP
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
      setVerifyOtp('123456'); // Hardcoded default code pre-filled
      setOtpCountdown(30);
      toast.success(`OTP sent to +91 ${cleanMobile}! Default code: 123456`);
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  // Step 0: Verify OTP & Check User Existence
  const handleVerifyInitialOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = verifyMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!verifyOtp || verifyOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP code (123456).');
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await api.verifyRegistrationOtp(cleanMobile, verifyOtp.trim());

      if (res.exists || res.registered) {
        toast.info('This mobile number is already registered! Redirecting to Sign In...');
        setTimeout(() => {
          if (onOpenAuth) {
            onOpenAuth();
          }
          navigate('/', { replace: true });
        }, 1500);
        return;
      }

      // Mobile is verified & new -> proceed to Step 1
      toast.success('Mobile number verified! Please complete your registration details.');
      setFormData(prev => ({
        ...prev,
        mobile: cleanMobile
      }));
      setActiveStep(1);
    } catch (err) {
      toast.error(err.message || 'Invalid OTP code. Please enter 123456.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // When state changes, reset district to first available district
      if (field === 'state') {
        const districts = INDIAN_STATES_AND_DISTRICTS[value] || [];
        updated.district = districts[0] || '';
      }
      // If gender changes, check if existing DOB complies with new restriction
      if (field === 'gender') {
        if (updated.dob) {
          const age = calculateAge(updated.dob);
          const minAge = value === 'Male' ? 21 : 18;
          if (age !== null && age < minAge) {
            updated.dob = ''; // reset invalid date
            toast.warning(`Note: Minimum age for ${value} is ${minAge} years. Please re-enter date of birth.`);
          }
        }
      }
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
      if (age === null) {
        errs.dob = 'Please enter a valid date of birth.';
      } else {
        const minAge = formData.gender === 'Male' ? 21 : 18;
        if (age < minAge) {
          errs.dob = `Age restriction: ${formData.gender} participants must be at least ${minAge} years old (Current age: ${age}).`;
          toast.error(`Restriction: Minimum age for ${formData.gender} is ${minAge} years.`);
        }
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
        gender: formData.gender,
        dob: formData.dob,
        state: formData.state,
        district: formData.district,
        city: formData.district,
        address: formData.address ? formData.address.trim() : '',
        preferredLanguage: formData.preferredLanguage,
        preferredCounselingMode: formData.preferredCounselingMode,
        counselingRequirements: formData.counselingRequirements.trim(),
        caseId: caseId,
        consents: consents,
        role: 'patient',
      };

      const res = await api.register(payload);
      setIsSuccess(true);
      toast.success('Registration completed successfully! Welcome to Counselling Program.');

      if (onAuthSuccess) {
        onAuthSuccess(res.user);
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allConsentsSelected = CONSENT_ITEMS.every(item => consents[item.id]);

  // Success State Card
  if (isSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          py: { xs: 4, sm: 8 },
          background: 'radial-gradient(circle at 10% 20%, rgba(243, 232, 255, 0.6) 0%, rgba(241, 245, 249, 0.88) 90%), url(/registration-bg.png)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: '24px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)'
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: '#dcfce7',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#1e1b4b', mb: 1 }}>
              Intake Registration Complete!
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mb: 3 }}>
              Your confidential client profile and case file have been successfully established.
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                mb: 4,
                textAlign: 'left'
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#4c3b71', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', mb: 1 }}>
                Registered Case Credentials
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Case ID</Typography>
                  <Typography variant="body2" fontWeight={800} color="#7c3aed">{caseId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Mobile</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">+91 {formData.mobile}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Participant</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">{formData.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Session Format</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">{formData.preferredCounselingMode}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <CircularProgress size={28} sx={{ color: '#4c3b71', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Redirecting you directly to your confidential dashboard...
            </Typography>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 3, sm: 6 },
        background: 'radial-gradient(circle at 10% 20%, rgba(243, 232, 255, 0.65) 0%, rgba(248, 250, 252, 0.94) 85%), url(/registration-bg.png)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Container maxWidth="md">

        {/* Top Stepper Header matching attached design */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, px: 1, flexWrap: 'wrap', gap: 2 }}>

          {/* Left Progress Step Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: activeStep >= 1 ? '#4c3b71' : '#cbd5e1',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                1
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: activeStep === 1 ? '#4c3b71' : '#64748b' }}>
                Personal & Session
              </Typography>
            </Box>

            <Box sx={{ width: 28, height: 2, bgcolor: '#cbd5e1' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: activeStep === 2 ? '#4c3b71' : '#e2e8f0',
                  color: activeStep === 2 ? '#ffffff' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                2
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: activeStep === 2 ? '#4c3b71' : '#94a3b8' }}>
                Consent & Verify
              </Typography>
            </Box>
          </Box>

          {/* Right Stage Badges */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.75,
                py: 0.6,
                borderRadius: '99px',
                bgcolor: activeStep === 1 ? '#4c3b71' : '#f1f5f9',
                color: activeStep === 1 ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.76rem',
              }}
            >
              <SpaIcon sx={{ fontSize: 14 }} />
              Step 1: Intake
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, fontSize: '0.76rem', fontWeight: 600, color: activeStep === 2 ? '#4c3b71' : '#94a3b8' }}>
              <CheckCircleIcon sx={{ fontSize: 15, color: activeStep === 2 ? '#4c3b71' : '#cbd5e1' }} />
              Step 2: Consent
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8' }}>
              <CheckCircleIcon sx={{ fontSize: 15, color: '#cbd5e1' }} />
              Success
            </Box>
          </Box>
        </Box>

        {/* STEP 0: MOBILE FIRST OTP VERIFICATION */}
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
                  Step 0 — Mobile Number Verification
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Please enter your mobile number. We will verify your number before starting registration.
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3.5, borderRadius: '12px', bgcolor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff', '& .MuiAlert-icon': { color: '#7c3aed' } }}>
              New users will be taken directly to the registration intake form. If you already have an account, you will be redirected to sign in.
            </Alert>

            <Box component="form" onSubmit={otpSent ? handleVerifyInitialOtp : handleSendInitialOtp}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    10-Digit Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="e.g. 98765 43210"
                    disabled={otpSent}
                    value={verifyMobile}
                    onChange={(e) => setVerifyMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                  <Grid item xs={12}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                      6-Digit OTP Verification Code <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Enter 6-digit code"
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
                      helperText="Default test verification code: 123456"
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

        {/* STEP 1: PERSONAL, DEMOGRAPHIC & CLINICAL DETAILS */}
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
            {/* Header matching screenshot */}
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
                    Please provide your contact details and counseling preferences.
                  </Typography>
                </Box>
              </Box>


            </Box>

            {/* SECTION 1: IDENTIFICATION */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  1. IDENTIFICATION
                </Typography>
                <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              </Box>

              <Grid container spacing={2.5}>
                {/* Full Name */}
                <Grid item xs={12}>
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
                    placeholder="Siddharth Rao"
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

                {/* Mobile Number (Locked Verified) */}
                <Grid item xs={12} sm={6}>
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

                {/* Email Address */}
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="siddharth.rao@example.com"
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

                {/* Gender First Selection */}
                <Grid item xs={12} sm={6}>
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

                {/* Date of Birth (Enabled after gender) */}
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Date of Birth <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <Tooltip
                    title={!formData.gender ? 'Please select gender first to enable DOB entry' : ''}
                    placement="top"
                  >
                    <TextField
                      fullWidth
                      type="date"
                      disabled={!formData.gender}
                      value={formData.dob}
                      onChange={(e) => handleChange('dob', e.target.value)}
                      inputProps={{
                        max: maxDobDate
                      }}
                      error={Boolean(errors.dob)}
                      helperText={
                        errors.dob || (formData.gender
                          ? `Must be ${formData.gender === 'Male' ? '21+' : '18+'} yrs (Max date: ${maxDobDate})`
                          : 'Select Gender first to enable date picker')
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarMonthOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                          </InputAdornment>
                        )
                      }}
                      sx={formFieldSx}
                    />
                  </Tooltip>
                </Grid>
              </Grid>
            </Box>

            {/* SECTION 2: RESIDENTIAL LOCATION */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  2. RESIDENTIAL LOCATION
                </Typography>
                <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              </Box>

              <Grid container spacing={2.5}>
                {/* State Selection */}
                <Grid item xs={12} sm={6}>
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

                {/* District Selection */}
                <Grid item xs={12} sm={6}>
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

                {/* Address Multiline Textarea */}
                <Grid item xs={12}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Complete Address (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    // placeholder="Flat 402, Green Valley Apartments, MG Road..."
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    sx={formFieldSx}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* SECTION 3: CONSULTATION FORMAT */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: '#4c3b71', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  3. CONSULTATION FORMAT
                </Typography>
                <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              </Box>

              <Grid container spacing={2.5}>
                {/* Preferred Language */}
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Preferred Language <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <FormControl fullWidth sx={formFieldSx}>
                    <Select
                      value={formData.preferredLanguage}
                      onChange={(e) => handleChange('preferredLanguage', e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          <TranslateOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      }
                    >
                      {LANGUAGES.map(lang => (
                        <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Preferred Session Mode matching screenshot buttons */}
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e1b4b', mb: 0.75 }}>
                    Preferred Session Mode <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Paper
                        elevation={0}
                        onClick={() => handleChange('preferredCounselingMode', 'Online')}
                        sx={{
                          p: 1.5,
                          borderRadius: '12px',
                          border: '2px solid',
                          borderColor: formData.preferredCounselingMode === 'Online' ? '#7c3aed' : '#e2e8f0',
                          bgcolor: formData.preferredCounselingMode === 'Online' ? '#f3e8ff' : '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: '#7c3aed' }
                        }}
                      >
                        <VideocamOutlinedIcon sx={{ color: formData.preferredCounselingMode === 'Online' ? '#7c3aed' : '#64748b', fontSize: 22 }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: formData.preferredCounselingMode === 'Online' ? '#6b21a8' : '#475569' }}>
                          Online
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={6}>
                      <Paper
                        elevation={0}
                        onClick={() => handleChange('preferredCounselingMode', 'Offline')}
                        sx={{
                          p: 1.5,
                          borderRadius: '12px',
                          border: '2px solid',
                          borderColor: formData.preferredCounselingMode === 'Offline' ? '#7c3aed' : '#e2e8f0',
                          bgcolor: formData.preferredCounselingMode === 'Offline' ? '#f3e8ff' : '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: '#7c3aed' }
                        }}
                      >
                        <GroupsIcon sx={{ color: formData.preferredCounselingMode === 'Offline' ? '#7c3aed' : '#64748b', fontSize: 22 }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: formData.preferredCounselingMode === 'Offline' ? '#6b21a8' : '#475569' }}>
                          Offline
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Brief Description */}
                <Grid item xs={12}>
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
                    rows={3} S
                    // placeholder="Experiencing elevated work-related burnout and sleep anxiety over the past 3 months. Hoping to acquire cognitive grounding techniques and structured boundary-setting tools."
                    value={formData.counselingRequirements}
                    onChange={(e) => handleChange('counselingRequirements', e.target.value.slice(0, 500))}
                    error={Boolean(errors.counselingRequirements)}
                    helperText={errors.counselingRequirements || 'Please provide at least 10 characters so we can match the best counsellor for you.'}
                    // sx={formFieldSx}
                    sx={{ backgroundColor: "#f1f5f9", width: "50vw" }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Bottom Actions matching screenshot */}
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
                  bgcolor: '#584482',
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

        {/* STEP 2: INFORMED CONSENT & VERIFICATION */}
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

            {/* Summary Box */}
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
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Legal Participant Name</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">{formData.name}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Mobile Number</Typography>
                  <Typography variant="body2" fontWeight={700} color="#1e1b4b">+91 {formData.mobile}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Assigned Case ID</Typography>
                  <Typography variant="body2" fontWeight={700} color="#7c3aed">{caseId}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Email Address</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.email}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Gender & Age</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.gender} ({calculateAge(formData.dob)} yrs)</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.district}, {formData.state}</Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="text.secondary">Address</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.address || 'Not specified'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Format & Mode</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1e1b4b">{formData.preferredCounselingMode} ({formData.preferredLanguage})</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Consent Checkboxes */}
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

            {/* Bottom Actions */}
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
                  bgcolor: '#584482',
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
