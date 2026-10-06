import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SpaIcon from '@mui/icons-material/Spa';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import StarIcon from '@mui/icons-material/Star';

const STEPS = [
  {
    num: '1',
    step: 'STEP 01',
    color: '#7c3aed',
    bg: '#f3e8ff',
    title: 'Tell us about you',
    desc: 'Share basic background info and the kind of care or guidance you feel you need.',
  },
  {
    num: '2',
    step: 'STEP 02',
    color: '#0d9488',
    bg: '#ccfbf1',
    title: 'Choose your mode',
    desc: 'Select your preferred delivery and whether online or studio fits best with you.',
  },
  {
    num: '3',
    step: 'STEP 03',
    color: '#be185d',
    bg: '#fce7f3',
    title: 'Confirm consent',
    desc: 'Review transparent privacy and confidentiality charters prior to any engagement.',
  },
  {
    num: '4',
    step: 'STEP 04',
    color: '#d97706',
    bg: '#fef3c7',
    title: 'Get matched',
    desc: 'Your intake is thoughtfully assigned to an accredited specialist in your domain.',
  },
  {
    num: '5',
    step: 'STEP 05',
    color: '#6366f1',
    bg: '#e0e7ff',
    title: 'Pick a timeslot',
    desc: 'Select a convenient calendar time and receive prompt session confirmation.',
  },
  {
    num: '6',
    step: 'STEP 06',
    color: '#16a34a',
    bg: '#dcfce7',
    title: 'Attend & evolve',
    desc: 'Engage in your session and receive continuity notes & ongoing care adjustments.',
  },
];

const PRACTITIONERS = [
  {
    name: 'Dr. Clara Thorne',
    tag: 'CLINICAL PSYCHOLOGIST',
    tagColor: '#6b21a8',
    tagBg: '#f3e8ff',
    avatar: 'https://images.pexels.com/photos/7176185/pexels-photo-7176185.jpeg',
    bio: 'Specialised in Individual & Relationship Resilience, cognitive mindfulness integration, and trauma-informed recovery.',
    //   availability: 'Available Today',
    availBg: '#ecfdf5',
    availColor: '#059669',
  },
  {
    name: 'Marcus Vance, MS',
    tag: 'LICENSED FAMILY THERAPIST',
    tagColor: '#0d9488',
    tagBg: '#ccfbf1',
    avatar: 'https://images.pexels.com/photos/26692093/pexels-photo-26692093.jpeg',
    bio: 'Specialised in Family & Blended systems, teen-parent communication breakthroughs, and parent team alignment.',
    //  availability: 'Online & Studio',
    availBg: '#f0fdf4',
    availColor: '#16a34a',
  },
  {
    name: 'Dr. Elena Rostova',
    tag: 'MARITAL & RELATIONSHIP SPECIALIST',
    tagColor: '#d97706',
    tagBg: '#fef3c7',
    avatar: 'https://images.pexels.com/photos/8460158/pexels-photo-8460158.jpeg',
    bio: 'Guiding couples clarity, emotional restoration after conflict, and deep affection renewal for lasting partnerships.',
    // availability: 'In-Studio Only',
    availBg: '#fffbeb',
    availColor: '#d97706',
  },
];

const FAQS = [
  {
    q: 'What types of counselling are available?',
    a: 'We provide comprehensive Individual, Couple, Family, and Pre & Post Marital counselling across evidence-based therapeutic frameworks including CBT, systemic therapy, psychodynamic guidance, and humanistic counselling.',
  },
  {
    q: 'Can I choose between online video or in-studio counselling?',
    a: 'Yes, you can choose between 100% encrypted online video sessions from your private space, or face-to-face sessions in our serene, noise-insulated consulting rooms equipped with private lounges.',
  },
  {
    q: 'Is client consent required before booking a session?',
    a: 'Yes, the Counselling Program adheres strictly to informed consent protocols. You will review and approve all ethical consent points prior to submitting your intake and booking your first consultation.',
  },
  {
    q: 'How does assigned therapist matching work?',
    a: 'Once your intake profile is verified, our clinical coordinator reviews your specific goals, preferences, and availability to match you with an accredited specialist best suited to your needs.',
  },
  {
    q: 'Can I provide continuity feedback or change my counsellor?',
    a: 'Absolutely. We ensure complete autonomy and comfort. You can request a different practitioner or adjust your care plan at any time through your client portal with zero friction.',
  },
];

export default function LandingPage({ onAuthRedirect, onOpenRegisterAuth }) {
  const [formatMode, setFormatMode] = useState('online'); // 'online' | 'studio'
  const [expandedFaq, setExpandedFaq] = useState(false);

  const handleFaqChange = (panel) => (event, isExpanded) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  const handleRegisterClick = () => {
    if (onOpenRegisterAuth) {
      onOpenRegisterAuth();
    }
  };

  return (
    <Box
      sx={{
        background: 'radial-gradient(circle at 10% 15%, rgba(243, 232, 255, 0.65) 0%, rgba(248, 250, 252, 0.96) 80%), url(/registration-bg.png)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        color: '#1e1b4b',
        minHeight: '100vh',
        overflowX: 'hidden',
        width: '100%',
      }}
    >
      {/* 1. HERO SECTION (ROW-WISE 2 ELEMENTS: LEFT TEXT/CTAS + RIGHT IMAGE) */}
      <Box sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 5, md: 7 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
              gap: { xs: 4, lg: 6 },
              alignItems: 'center',
            }}
          >
            {/* Left Column: Headline, Trust & CTAs */}
            <Box>
              {/* Top pill tag */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.65,
                  borderRadius: '99px',
                  bgcolor: '#f3e8ff',
                  border: '1px solid #e9d5ff',
                  color: '#6b21a8',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  mb: 2.5,
                }}
              >
                <SpaIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
                Connect with accredited care • 100% private
              </Box>

              {/* Main Headline */}
              <Typography
                variant="h1"
                sx={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                  lineHeight: 1.12,
                  letterSpacing: '-1.4px',
                  color: '#1e1b4b',
                  mb: 2.5,
                }}
              >
                Support when you need it.{' '}
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    color: '#1e1b4b',
                  }}
                >
                  Guidance when it{' '}
                  <Box
                    component="span"
                    sx={{
                      color: '#059669',
                      fontWeight: 800,
                    }}
                  >
                    matters.
                  </Box>
                </Box>
              </Typography>

              {/* Subtitle */}
              <Typography
                sx={{
                  fontSize: { xs: '1rem', sm: '1.12rem' },
                  color: '#475569',
                  lineHeight: 1.65,
                  maxWidth: '640px',
                  mb: 4,
                  fontWeight: 400,
                }}
              >
                Connect with compassionate, licensed counseling professionals tailored to your schedule and personal needs — in a safe, warm, and strictly protected space.
              </Typography>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 4 }}>
                <Button
                  onClick={handleRegisterClick}
                  component={Link}
                  to="/register"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#4c3b71',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    px: 3.5,
                    py: 1.4,
                    borderRadius: '12px',
                    textTransform: 'none',
                    letterSpacing: '0.3px',
                    boxShadow: '0 8px 24px rgba(76, 59, 113, 0.25)',
                    '&:hover': {
                      bgcolor: '#3b2064',
                      boxShadow: '0 10px 28px rgba(76, 59, 113, 0.32)',
                    },
                  }}
                >
                  BOOK A COUNSELLING SESSION
                </Button>

                <Button
                  component="a"
                  href="#how-it-works"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '18px !important' }} />}
                  sx={{
                    borderColor: '#cbd5e1',
                    color: '#1e1b4b',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    px: 3,
                    py: 1.35,
                    borderRadius: '12px',
                    textTransform: 'none',
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    '&:hover': {
                      borderColor: '#4c3b71',
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
                  How It Works
                </Button>
              </Box>

              {/* 3 Trust points */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 }, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155', fontSize: '0.86rem', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#7c3aed' }} /> Verified Clinical Licensure
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155', fontSize: '0.86rem', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#059669' }} /> 100% Secure & Encrypted
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155', fontSize: '0.86rem', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#d97706' }} /> Same-Week Bookings
                </Box>
              </Box>

              {/* Social Proof / Rating Badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    sx={{ width: 34, height: 34, border: '2px solid #ffffff', ml: 0 }}
                  />
                  <Avatar
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    sx={{ width: 34, height: 34, border: '2px solid #ffffff', ml: -1.2 }}
                  />
                  <Avatar
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                    sx={{ width: 34, height: 34, border: '2px solid #ffffff', ml: -1.2 }}
                  />
                  <Avatar
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                    sx={{ width: 34, height: 34, border: '2px solid #ffffff', ml: -1.2 }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', color: '#f59e0b' }}>
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} sx={{ fontSize: 16 }} />
                      ))}
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.86rem', color: '#1e1b4b' }}>
                      4.9/5
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Over 14,000+ client sessions conducted
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Right Column: Hero Image with Floating Cards */}
            <Box
              sx={{
                position: 'relative',
                borderRadius: '28px',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(76, 59, 113, 0.18)',
                border: '6px solid #ffffff',
                bgcolor: '#ffffff',
                width: '100%',
              }}
            >
              {/* Top Floating Pill on Image */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.85,
                  px: 1.75,
                  py: 0.65,
                  borderRadius: '99px',
                  bgcolor: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                <Box>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', lineHeight: 1.1 }}>
                    Available Today
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: '#64748b' }}>
                    In-person studio & online
                  </Typography>
                </Box>
              </Box>

              {/* Consultation Room Image */}
              <Box
                component="img"
                src="/hero-counseling.jpg"
                alt="Counseling Consultation Session"
                sx={{
                  width: '100%',
                  height: { xs: '320px', sm: '420px', md: '480px' },
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80';
                }}
              />

              {/* Bottom Floating Card */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '18px',
                  p: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  zIndex: 2,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    bgcolor: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                    flexShrink: 0,
                  }}
                >
                  <ShieldOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e1b4b' }}>
                      Total Session Confidentiality
                    </Typography>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Zero commercial sharing • Encrypted clinical notes
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 2. TRUST / COMFORT RIBBON BAR */}
      <Box sx={{ py: 1.5, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: { xs: 2.5, md: 4 },
              py: 1.75,
              borderRadius: '20px',
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #ede9fe',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.04)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: '#f3e8ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                }}
              >
                <SpaIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e1b4b' }}>
                Designed around your comfort, privacy and personalized choice.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#7c3aed' }} /> 100% Confidential
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.84rem', fontWeight: 600, color: '#059669' }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#059669' }} /> Online & Studio
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#d97706' }} /> Tailored Guidance
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 3. FIND THE SUPPORT THAT'S RIGHT FOR YOU (ROW-WISE 2 ELEMENTS: LEFT LARGE CARD + RIGHT 3 STACKED CARDS) */}
      <Box id="counselling-types" sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>

          {/* Section Header */}
          <Box sx={{ textAlign: 'center', maxWidth: '760px', mx: 'auto', mb: 5 }}>
            <Box
              sx={{
                display: 'inline-block',
                px: 2,
                py: 0.5,
                borderRadius: '99px',
                bgcolor: '#f3e8ff',
                color: '#6b21a8',
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                mb: 1.5,
              }}
            >
              2. PERSONALIZED SUPPORT
            </Box>
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 800,
                fontSize: { xs: '2rem', sm: '2.5rem' },
                color: '#1e1b4b',
                letterSpacing: '-0.8px',
                mb: 1.5,
              }}
            >
              Find the support that’s right for you
            </Typography>
            <Typography sx={{ fontSize: '0.98rem', color: '#64748b', lineHeight: 1.6 }}>
              Start a soothing journey to rebuild balance, clarity, and inner comfort, delivered by accredited professionals with genuine empathy and clinical mastery.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 3.5,
              alignItems: 'stretch',
            }}
          >
            {/* Left Big Card: Individual Counselling */}
            <Card
              elevation={0}
              sx={{
                p: { xs: 3.5, md: 4.5 },
                borderRadius: '24px',
                border: '1.5px solid #e2e8f0',
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: '#7c3aed',
                  boxShadow: '0 12px 35px rgba(124, 58, 237, 0.1)',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '16px',
                    bgcolor: '#4c3b71',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PersonOutlinedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Chip
                  label="MOST POPULAR"
                  sx={{
                    bgcolor: '#f3e8ff',
                    color: '#6b21a8',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.5px',
                    borderRadius: '8px',
                  }}
                />
              </Box>

              <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.55rem', color: '#1e1b4b', mb: 1.5 }}>
                Individual Counselling
              </Typography>

              <Typography sx={{ fontSize: '0.94rem', color: '#64748b', lineHeight: 1.65, mb: 3.5 }}>
                A calm, dedicated space for personal anxiety, life transitions, grief, self-esteem, burnout, and emotional healing. You work one-on-one with a therapist matched to your goals.
              </Typography>

              {/* 2x2 Feature Pills */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5,
                  mb: 4,
                  flexGrow: 1,
                }}
              >
                {[
                  'Stress & Burnout',
                  'Anxiety & Worry',
                  'Life Transitions',
                  'Self-Confidence',
                ].map((feat, fIdx) => (
                  <Box
                    key={fIdx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.25,
                      borderRadius: '12px',
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7c3aed' }} />
                    {feat}
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
                  50 min • Online or In-Studio
                </Typography>

                <Button
                  onClick={handleRegisterClick}
                  component={Link}
                  to="/register"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: '#4c3b71',
                    textTransform: 'none',
                    p: 0,
                    '&:hover': { bgcolor: 'transparent', color: '#3b2064' },
                  }}
                >
                  Explore Individual Care
                </Button>
              </Box>
            </Card>

            {/* Right Column: 3 Horizontal Cards Stacked */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', justifyContent: 'space-between' }}>

              {/* 1. Couple Counselling */}
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '22px',
                  border: '1.5px solid #e2e8f0',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#be185d',
                    boxShadow: '0 8px 24px rgba(190, 24, 93, 0.08)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      bgcolor: '#fce7f3',
                      color: '#be185d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FavoriteBorderIcon sx={{ fontSize: 24 }} />
                  </Box>

                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: '#1e1b4b' }}>
                          Couple Counselling
                        </Typography>
                        <Chip label="RELATIONSHIP" size="small" sx={{ bgcolor: '#fce7f3', color: '#be185d', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                      </Box>
                      <Button
                        onClick={handleRegisterClick}
                        component={Link}
                        to="/register"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ p: 0, minWidth: 'auto', fontWeight: 700, fontSize: '0.82rem', color: '#be185d', textTransform: 'none' }}
                      >
                        Learn more
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.55 }}>
                      Guided conversations that help partners navigate communication hurdles, rebuild trust, and cultivate deeper intimacy.
                    </Typography>
                  </Box>
                </Box>
              </Card>

              {/* 2. Family Counselling */}
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '22px',
                  border: '1.5px solid #e2e8f0',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#059669',
                    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.08)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      bgcolor: '#dcfce7',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Diversity1Icon sx={{ fontSize: 24 }} />
                  </Box>

                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: '#1e1b4b' }}>
                          Family Counselling
                        </Typography>
                        <Chip label="ALL AGES" size="small" sx={{ bgcolor: '#dcfce7', color: '#059669', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                      </Box>
                      <Button
                        onClick={handleRegisterClick}
                        component={Link}
                        to="/register"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ p: 0, minWidth: 'auto', fontWeight: 700, fontSize: '0.82rem', color: '#059669', textTransform: 'none' }}
                      >
                        Learn more
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.55 }}>
                      Constructive systemic support for parenting, parent-teen conflict, blended family adjustments, and intergenerational strains.
                    </Typography>
                  </Box>
                </Box>
              </Card>

              {/* 3. Pre & Post Marital */}
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '22px',
                  border: '1.5px solid #e2e8f0',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#d97706',
                    boxShadow: '0 8px 24px rgba(217, 119, 6, 0.08)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      bgcolor: '#fef3c7',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <HandshakeOutlinedIcon sx={{ fontSize: 24 }} />
                  </Box>

                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: '#1e1b4b' }}>
                          Pre & Post Marital
                        </Typography>
                        <Chip label="PARTNERSHIP" size="small" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                      </Box>
                      <Button
                        onClick={handleRegisterClick}
                        component={Link}
                        to="/register"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ p: 0, minWidth: 'auto', fontWeight: 700, fontSize: '0.82rem', color: '#d97706', textTransform: 'none' }}
                      >
                        Learn more
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.55 }}>
                      Facilitated alignment on values, financial goals, boundaries, and healthy communication before and throughout marriage.
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 4. CHOOSE WHAT FEELS COMFORTABLE (ROW-WISE 2 ELEMENTS: LEFT FORMAT CARDS + RIGHT SANCTUARY PHOTO) */}
      <Box sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2, mb: 4.5 }}>
            <Box sx={{ maxWidth: '720px' }}>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 2,
                  py: 0.5,
                  borderRadius: '99px',
                  bgcolor: '#f3e8ff',
                  color: '#6b21a8',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                FLEXIBLE FORMATS
              </Box>
              <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#1e1b4b', letterSpacing: '-0.8px', mb: 1 }}>
                Choose what feels comfortable for you
              </Typography>
              <Typography sx={{ fontSize: '0.96rem', color: '#64748b', lineHeight: 1.6 }}>
                Depending on your personal schedule, physical location, and privacy requirements, sessions can take place virtually or inside our private quiet consultation studios.
              </Typography>
            </Box>

            {/* Interactive Mode Toggle Pill */}
            <Box
              sx={{
                display: 'inline-flex',
                p: 0.5,
                borderRadius: '99px',
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
            >
              <Button
                onClick={() => setFormatMode('online')}
                startIcon={<VideocamOutlinedIcon sx={{ fontSize: '18px !important' }} />}
                sx={{
                  borderRadius: '99px',
                  px: 2.5,
                  py: 0.75,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: formatMode === 'online' ? '#4c3b71' : 'transparent',
                  color: formatMode === 'online' ? '#ffffff' : '#64748b',
                  '&:hover': {
                    bgcolor: formatMode === 'online' ? '#3b2064' : '#f8fafc',
                  },
                }}
              >
                Online Video
              </Button>
              <Button
                onClick={() => setFormatMode('studio')}
                startIcon={<MeetingRoomOutlinedIcon sx={{ fontSize: '18px !important' }} />}
                sx={{
                  borderRadius: '99px',
                  px: 2.5,
                  py: 0.75,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: formatMode === 'studio' ? '#4c3b71' : 'transparent',
                  color: formatMode === 'studio' ? '#ffffff' : '#64748b',
                  '&:hover': {
                    bgcolor: formatMode === 'studio' ? '#3b2064' : '#f8fafc',
                  },
                }}
              >
                In-Studio Suites
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 3.5,
              alignItems: 'stretch',
            }}
          >
            {/* Left Column: 2 Format Selection Cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>

              {/* Online Video Sessions Card */}
              <Card
                onClick={() => setFormatMode('online')}
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: '24px',
                  border: formatMode === 'online' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: formatMode === 'online' ? '0 10px 30px rgba(124, 58, 237, 0.1)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                        bgcolor: '#f3e8ff',
                        color: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <VideocamOutlinedIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#1e1b4b' }}>
                        Online Video Sessions
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
                        Private, encrypted clinical video from anywhere
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="ACCESSIBLE" size="small" sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 800, fontSize: '0.7rem' }} />
                </Box>

                <Typography sx={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, mb: 2.5 }}>
                  Join your secure counseling session from your living room, home office, or private space via web or mobile.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#7c3aed' }} /> Zero commute
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#7c3aed' }} /> Any device
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#7c3aed' }} /> Evening slots
                  </Box>
                </Box>
              </Card>

              {/* Offline Studio Suites Card */}
              <Card
                onClick={() => setFormatMode('studio')}
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: '24px',
                  border: formatMode === 'studio' ? '2px solid #0d9488' : '1.5px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: formatMode === 'studio' ? '0 10px 30px rgba(13, 148, 136, 0.1)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                        bgcolor: '#ccfbf1',
                        color: '#0d9488',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MeetingRoomOutlinedIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#1e1b4b' }}>
                        Offline Studio Suites
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600 }}>
                        A quiet, beautifully appointed physical sanctuary
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="TRANQUIL" size="small" sx={{ bgcolor: '#ccfbf1', color: '#0d9488', fontWeight: 800, fontSize: '0.7rem' }} />
                </Box>

                <Typography sx={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, mb: 2.5 }}>
                  Meet face-to-face inside our serene private consulting suites, designed with gentle sound isolation, warm teas, and full visual privacy.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#0d9488' }} /> Quiet lounge
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 600, color: '#0d9488' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#0d9488' }} /> Warm herbal teas
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 600, color: '#0d9488' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#0d9488' }} /> Private reception
                  </Box>
                </Box>
              </Card>
            </Box>

            {/* Right Column: Serene Studio Interior Image with Floating Card */}
            <Box
              sx={{
                position: 'relative',
                borderRadius: '28px',
                overflow: 'hidden',
                height: '100%',
                minHeight: '380px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                border: '6px solid #ffffff',
                bgcolor: '#ffffff',
              }}
            >
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&auto=format&fit=crop&q=80"
                alt="Calm Consultation Sanctuary Room"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Floating Bottom Card */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  p: 2,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e1b4b' }}>
                    Calm Space Sanctuary Suites • <Box component="span" sx={{ color: '#059669', fontSize: '0.78rem' }}>Exclusive In-person</Box>
                  </Typography>
                  <Typography sx={{ fontSize: '0.76rem', color: '#64748b' }}>
                    A peaceful welcoming space for deep and uninterrupted care
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                  }}
                >
                  <SpaIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 5. GETTING STARTED IS SIMPLE & GENTLE (6 HORIZONTAL STEP CARDS IN A ROW) */}
      <Box id="how-it-works" sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>

          <Box sx={{ textAlign: 'center', maxWidth: '780px', mx: 'auto', mb: 5.5 }}>
            <Box
              sx={{
                display: 'inline-block',
                px: 2,
                py: 0.5,
                borderRadius: '99px',
                bgcolor: '#f3e8ff',
                color: '#6b21a8',
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                mb: 1.5,
              }}
            >
              FRICTIONLESS PATH
            </Box>
            <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#1e1b4b', letterSpacing: '-0.8px', mb: 1.5 }}>
              Getting started is simple & gentle
            </Typography>
            <Typography sx={{ fontSize: '0.98rem', color: '#64748b', lineHeight: 1.6 }}>
              We prioritise low friction and low cognitive effort at every stage, guiding you smoothly toward personal care.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
              gap: 2.5,
            }}
          >
            {STEPS.map((step, idx) => (
              <Card
                key={idx}
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: '22px',
                  border: '1.5px solid #e2e8f0',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: step.color,
                    boxShadow: `0 12px 28px ${step.color}20`,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    bgcolor: step.bg,
                    color: step.color,
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  {step.num}
                </Box>

                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: step.color, letterSpacing: '0.8px', textTransform: 'uppercase', mb: 0.5 }}>
                  {step.step}
                </Typography>

                <Typography sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#1e1b4b', mb: 1 }}>
                  {step.title}
                </Typography>

                <Typography sx={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.55 }}>
                  {step.desc}
                </Typography>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>

      {/* 6. YOUR PRIVACY MATTERS DEEPLY (3 PILLAR CARDS IN A ROW) */}
      <Box sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Box
            sx={{
              p: { xs: 4, sm: 6, md: 7 },
              borderRadius: '32px',
              bgcolor: 'rgba(243, 232, 255, 0.45)',
              border: '1.5px solid #e9d5ff',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Header */}
            <Box sx={{ maxWidth: '820px', mb: 5 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 2,
                  py: 0.5,
                  borderRadius: '99px',
                  bgcolor: '#ffffff',
                  color: '#6b21a8',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 1.5,
                  border: '1px solid #e9d5ff',
                }}
              >
                <ShieldOutlinedIcon sx={{ fontSize: 16 }} />
                PRIVACY, ETHICS & DATA CHARTER
              </Box>
              <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#1e1b4b', letterSpacing: '-0.8px', mb: 1.5 }}>
                Your privacy matters deeply
              </Typography>
              <Typography sx={{ fontSize: '0.96rem', color: '#64748b', lineHeight: 1.65 }}>
                Counselling often involves vulnerable personal circumstances. Counselling Program was engineered with strict client-first visibility, transparent consent logs, and zero online tracking or commercial data broker sharing.
              </Typography>
            </Box>

            {/* 3 White Elevated Pillar Cards in a row */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 3.5,
              }}
            >
              <Card
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                  <LockOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#1e1b4b', mb: 1 }}>
                  Consent before booking
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, mb: 3, flexGrow: 1 }}>
                  You maintain full personal autonomy. Explicit consent is verified and recorded prior to any scheduling or practitioner matching.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed' }}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} /> Revocable anytime
                </Box>
              </Card>

              <Card
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                  <ShieldOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#1e1b4b', mb: 1 }}>
                  Role-based access
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, mb: 3, flexGrow: 1 }}>
                  Only your designated therapist can access clinical session observations. Operations staff see only basic scheduling logs.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} /> Per-session audit trails
                </Box>
              </Card>

              <Card
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                  <KeyOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: '#1e1b4b', mb: 1 }}>
                  Encrypted records
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, mb: 3, flexGrow: 1 }}>
                  All clinical messaging, intake questionnaires, and telehealth video adhere to healthcare-grade AES-256 and TLS encryption.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.82rem', fontWeight: 700, color: '#d97706' }}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} /> AES-256 & TLS 1.3 compliant
                </Box>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 7. MEET THE RIGHT SUPPORT (3 PRACTITIONERS IN A ROW) */}
      <Box sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2, mb: 4.5 }}>
            <Box sx={{ maxWidth: '720px' }}>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 2,
                  py: 0.5,
                  borderRadius: '99px',
                  bgcolor: '#f3e8ff',
                  color: '#6b21a8',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                ACCREDITED PRACTITIONERS
              </Box>
              <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#1e1b4b', letterSpacing: '-0.8px', mb: 1 }}>
                Meet the right support
              </Typography>
              <Typography sx={{ fontSize: '0.96rem', color: '#64748b', lineHeight: 1.6 }}>
                Your counselling journey pairs with certified therapists according to clinical specialities, language, and shared availability slots.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#64748b', fontSize: '0.84rem' }}>
              <LockOutlinedIcon sx={{ fontSize: 16 }} /> 100% verified clinical licensure
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3.5,
            }}
          >
            {PRACTITIONERS.map((doc, idx) => (
              <Card
                key={idx}
                elevation={0}
                sx={{
                  borderRadius: '26px',
                  border: '1.5px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
                  },
                }}
              >
                {/* Photo Container */}
                <Box sx={{ position: 'relative', height: 260, bgcolor: '#f1f5f9' }}>
                  <Box
                    component="img"
                    src={doc.avatar}
                    alt={doc.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  {/* Top availability badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '99px',
                      bgcolor: 'rgba(255, 255, 255, 0.92)',
                      backdropFilter: 'blur(8px)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: doc.availColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                    }}
                  >
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: doc.availColor }} />
                    {doc.availability}
                  </Box>
                </Box>

                {/* Body Content */}
                <Box sx={{ p: 3.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.3rem', color: '#1e1b4b', mb: 0.5 }}>
                    {doc.name}
                  </Typography>

                  <Chip
                    label={doc.tag}
                    size="small"
                    sx={{
                      bgcolor: doc.tagBg,
                      color: doc.tagColor,
                      fontWeight: 800,
                      fontSize: '0.68rem',
                      alignSelf: 'flex-start',
                      mb: 2,
                      borderRadius: '6px',
                    }}
                  />

                  <Typography sx={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, mb: 3, flexGrow: 1 }}>
                    {doc.bio}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#059669', fontSize: '0.82rem', fontWeight: 700 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} /> Available for You
                    </Box>
                    <Button
                      onClick={handleRegisterClick}
                      component={Link}
                      to="/register"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{
                        p: 0,
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        color: '#4c3b71',
                        textTransform: 'none',
                        '&:hover': { bgcolor: 'transparent', color: '#3b2064' },
                      }}
                    >
                      View Profile
                    </Button>
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>

      {/* 8. FREQUENTLY ASKED QUESTIONS (ROW-WISE 2 ELEMENTS: LEFT HELP BOX + RIGHT ACCORDION LIST) */}
      <Box id="faqs" sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1.6fr' },
              gap: { xs: 4, lg: 6 },
              alignItems: 'start',
            }}
          >
            {/* Left Column: Heading & Support Callout Card */}
            <Box>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 2,
                  py: 0.5,
                  borderRadius: '99px',
                  bgcolor: '#f3e8ff',
                  color: '#6b21a8',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                ANSWERS & SUPPORT
              </Box>
              <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#1e1b4b', letterSpacing: '-0.8px', mb: 2 }}>
                Frequently Asked Questions
              </Typography>
              <Typography sx={{ fontSize: '0.96rem', color: '#64748b', lineHeight: 1.65, mb: 4 }}>
                Everything you need to know about our clinical standards, session confidentiality, and scheduling protocols.
              </Typography>

              {/* Help Box */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: '20px',
                  bgcolor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HeadsetMicOutlinedIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b' }}>
                      Do you need specific assistance?
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', color: '#64748b' }}>
                      Our support team replies within 1 hour.
                    </Typography>
                  </Box>
                </Box>

                <Button
                  onClick={handleRegisterClick}
                  component={Link}
                  to="/register"
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 1,
                    bgcolor: '#f3e8ff',
                    color: '#6b21a8',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    py: 1.1,
                    borderRadius: '10px',
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: '#e9d5ff',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Speak with an intake counselor
                </Button>
              </Box>
            </Box>

            {/* Right Column: Accordion FAQ List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
              {FAQS.map((faq, idx) => (
                <Accordion
                  key={idx}
                  expanded={expandedFaq === `panel${idx}`}
                  onChange={handleFaqChange(`panel${idx}`)}
                  elevation={0}
                  sx={{
                    borderRadius: '18px !important',
                    border: '1.5px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#cbd5e1',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#4c3b71' }} />}
                    sx={{ px: 3, py: 1 }}
                  >
                    <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.02rem', color: '#1e1b4b' }}>
                      {faq.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                    <Typography sx={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.65 }}>
                      {faq.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 9. BOTTOM CTA BANNER */}
      <Box sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Box
            sx={{
              borderRadius: '32px',
              color: '#ffffff',
              p: { xs: 4, sm: 6, md: 8 },
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(76, 59, 113, 0.3)',
              background: 'linear-gradient(135deg, #4c3b71 0%, #1e1b4b 100%)',
            }}
          >
            {/* Concentric rings watermark */}
            <Box
              sx={{
                position: 'absolute',
                right: -80,
                bottom: -80,
                width: 380,
                height: 380,
                borderRadius: '50%',
                border: '32px solid rgba(255, 255, 255, 0.05)',
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 240,
                height: 240,
                borderRadius: '50%',
                border: '24px solid rgba(255, 255, 255, 0.05)',
                pointerEvents: 'none',
              }}
            />

            <Box sx={{ position: 'relative', zIndex: 1, maxWidth: '680px' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 2,
                  py: 0.5,
                  borderRadius: '99px',
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 2,
                }}
              >
                <SpaIcon sx={{ fontSize: 16 }} />
                BEGIN WITH COMPASSION
              </Box>

              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '1.9rem', sm: '2.5rem' }, mb: 2, lineHeight: 1.2 }}>
                Ready to take the gentle first step?
              </Typography>

              <Typography sx={{ fontSize: '1.02rem', color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.65, mb: 4 }}>
                Start your counselling registration and let us match you with the right specialist. Your healing journey begins with a confidential, low-stress conversation.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  onClick={handleRegisterClick}
                  component={Link}
                  to="/register"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#ffffff',
                    color: '#4c3b71',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    px: 3.5,
                    py: 1.35,
                    borderRadius: '12px',
                    textTransform: 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    '&:hover': {
                      bgcolor: '#f3e8ff',
                    },
                  }}
                >
                  Start Registration
                </Button>

                <Button
                  component="a"
                  href="#how-it-works"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '18px !important' }} />}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    px: 3,
                    py: 1.3,
                    borderRadius: '12px',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#ffffff',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  Learn How It Works
                </Button>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 10. FOOTER */}
      <Box sx={{ bgcolor: '#ffffff', color: '#64748b', pt: { xs: 6, md: 7 }, pb: 4, width: '100%', borderTop: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 4,
              mb: 4,
            }}
          >
            {/* Brand Logo & Mission */}
            <Box sx={{ maxWidth: '520px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                  }}
                >
                  <SpaIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem', color: '#1e1b4b' }}>
                  Counselling Program
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.6 }}>
                Providing empathetic, dignified professional evidence-based clinical counselling built on autonomy, confidentiality, and emotional safety.
              </Typography>
            </Box>

            {/* Footer Links Row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 }, fontSize: '0.88rem', fontWeight: 600 }}>
              <Box component={Link} to="/" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Home</Box>
              <Box component="a" href="#how-it-works" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>How it Works</Box>
              <Box component="a" href="#counselling-types" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Counselling</Box>
              <Box component="a" href="#faqs" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>FAQs</Box>
              <Box component="a" href="#faqs" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Privacy Policy</Box>
              <Box component="a" href="#faqs" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Terms of Service</Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#e2e8f0', mb: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              🔒 100% HIPAA & GDPR Compliant Confidential Care
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              © 2026 Counselling Program. All Clinical Software. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
