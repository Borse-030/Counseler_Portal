import { useState, useEffect } from 'react';
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
  IconButton,
  Stack,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';

import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import SentimentDissatisfiedOutlinedIcon from '@mui/icons-material/SentimentDissatisfiedOutlined';
import SelfImprovementOutlinedIcon from '@mui/icons-material/SelfImprovementOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SpaIcon from '@mui/icons-material/Spa';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import StarIcon from '@mui/icons-material/Star';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HandshakeIcon from '@mui/icons-material/Handshake';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';

const scenes = [
  { src: "/Worried.svg", duration: 3000 },
  { src: "/SeekHelp.svg", duration: 3000 },
  { src: "/Relieved.svg", duration: 4000 },
];

const PROMISES = [
  {
    title: 'Privacy first.',
    description:
      'Sessions are held in private rooms, whether you choose to meet your counsellor online or in person.',
    icon: LockOutlinedIcon,
    color: '#B3315A',
    bg: '#F8E9EF',
  },
  {
    title: 'Confidential notes.',
    description:
      'Your session notes are handled with care and archived confidentially as part of your counselling journey.',
    icon: DescriptionOutlinedIcon,
    color: '#197985',
    bg: '#E7F2F3',
  },
  {
    title: 'The right help.',
    description:
      'The discovery call helps understand what kind of support may be appropriate, so you are guided in the right direction.',
    icon: ExploreOutlinedIcon,
    color: '#B66A00',
    bg: '#F8F0E3',
  },
  {
    title: 'No labels.',
    description:
      'Clusters help describe the concerns you may be experiencing. They are not a diagnosis and do not define who you are.',
    icon: LocalOfferOutlinedIcon,
    color: '#43833F',
    bg: '#EAF3EA',
  },
  {
    title: 'A good match.',
    description:
      'Counsellors are thoughtfully matched based on factors such as case complexity, workload, and language where relevant.',
    icon: HandshakeOutlinedIcon,
    color: '#5550A5',
    bg: '#EEEEF8',
  },
  {
    title: 'Your voice matters.',
    description:
      'After your counselling package is complete, you will have an opportunity to share your experience and provide feedback.',
    icon: ChatBubbleOutlineOutlinedIcon,
    color: '#B3315A',
    bg: '#F8E9EF',
  },
];

// const STEPS = [
//   {
//     num: '1',
//     step: 'STEP 01',
//     color: '#7c3aed',
//     bg: '#f3e8ff',
//     title: 'Tell us about you',
//     desc: 'Share basic background info and the kind of care or guidance you feel you need.',
//   },
//   {
//     num: '2',
//     step: 'STEP 02',
//     color: '#0d9488',
//     bg: '#ccfbf1',
//     title: 'Choose your mode',
//     desc: 'Select your preferred delivery and whether online or studio fits best with you.',
//   },
//   {
//     num: '3',
//     step: 'STEP 03',
//     color: '#be185d',
//     bg: '#fce7f3',
//     title: 'Confirm consent',
//     desc: 'Review transparent privacy and confidentiality charters prior to any engagement.',
//   },
//   {
//     num: '4',
//     step: 'STEP 04',
//     color: '#d97706',
//     bg: '#fef3c7',
//     title: 'Get matched',
//     desc: 'Your intake is thoughtfully assigned to an accredited specialist in your domain.',
//   },
//   {
//     num: '5',
//     step: 'STEP 05',
//     color: '#6366f1',
//     bg: '#e0e7ff',
//     title: 'Pick a timeslot',
//     desc: 'Select a convenient calendar time and receive prompt session confirmation.',
//   },
//   {
//     num: '6',
//     step: 'STEP 06',
//     color: '#16a34a',
//     bg: '#dcfce7',
//     title: 'Attend & evolve',
//     desc: 'Engage in your session and receive continuity notes & ongoing care adjustments.',
//   },
// ];

const STEPS = [
  {
    num: '01',
    step: 'LISTEN',
    title: 'Every person is heard.',
    desc: 'without judgement and without hurry.',
    color: '#B3315A',
    bg: '#F7E9EE',
    icon: HeadphonesIcon,
  },
  {
    num: '02',
    step: 'UNDERSTAND',
    title: 'Every concern is placed into',
    desc: 'one of 15 simple clusters, so the right kind of help can be planned.',
    color: '#197985',
    bg: '#E5F1F2',
    icon: LightbulbIcon,
  },
  {
    num: '03',
    step: 'SUPPORT',
    title: 'A suitable counsellor is',
    desc: 'matched, sessions are scheduled online or in person, and feedback is collected.',
    color: '#B66A00',
    bg: '#F6EFE4',
    icon: HandshakeIcon,
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

const CARE_GROUPS = [
  {
    id: 'families',
    title: 'Couples & Families',
    category: 'Family & Marriage',
    color: '#B3315A',
    lightBg: '#FCF1F5',
    icon: FamilyRestroomOutlinedIcon,

    concerns: [
      {
        code: 'C01',
        title: 'Family Conflict & In-Law Friction',
        points: [
          'Household friction',
          'Arguments & interference',
          'Silent treatment',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C02',
        title: 'Marital Disharmony & Communication Breakdown',
        points: [
          'Communication distance',
          'Criticism & defensiveness',
          'Emotional coldness',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C03',
        title: 'Pre-Marriage & Relationship Readiness',
        points: [
          'Wedding disagreements',
          'Relationship doubts',
          'Future-related fears',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C04',
        title: 'Parenting & Child-Rearing Challenges',
        points: [
          'Parenting differences',
          'Child behaviour concerns',
          'Parental guilt / friction',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
    ],
  },

  {
    id: 'students',
    title: 'Students & Young Adults',
    category: 'Growth & Identity',
    color: '#197985',
    lightBg: '#EEF8F9',
    icon: SchoolOutlinedIcon,

    concerns: [
      {
        code: 'C11',
        title: 'Academic Stress & Student Pressure',
        points: [
          'Procrastination',
          'Exam pressure',
          'High expectations / burnout',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C07',
        title: 'Identity Crisis & Self-Esteem Issues',
        points: [
          'Self-doubt',
          'Identity concerns',
          'Low confidence / impostor feelings',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C03',
        title: 'Pre-Marriage & Relationship Readiness',
        points: [
          'Wedding disagreements',
          'Relationship doubts',
          'Future-related fears',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
    ],
  },

  {
    id: 'professionals',
    title: 'Working Professionals',
    category: 'Financial & Career',
    color: '#B66A00',
    lightBg: '#FAF3E7',
    icon: WorkOutlineOutlinedIcon,

    concerns: [
      {
        code: 'C10',
        title: 'Professional Burnout & Career Stress',
        points: [
          'Work fatigue',
          'Chronic exhaustion',
          'Irritability / work dread',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C09',
        title: 'Financial Stress & Debt Pressure',
        points: [
          'Budget strain',
          'Debt-related worry',
          'Stress over bills',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C14',
        title: 'Chronic Fatigue & Low Energy',
        points: [
          'Low morning energy',
          'Afternoon slumps',
          'Difficulty with daily tasks',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C12',
        title: 'Lifestyle Disruption & Insomnia',
        points: [
          'Irregular sleep / routine',
          'Racing thoughts',
          'Fatigue & restlessness',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
    ],
  },

  {
    id: 'wellness',
    title: 'Anyone Feeling Low or Anxious',
    category: 'Mental Wellness',
    color: '#43833F',
    lightBg: '#F0F7F0',
    icon: SentimentDissatisfiedOutlinedIcon,

    concerns: [
      {
        code: 'C05',
        title: 'Anxiety, Overthinking & Emotional Distress',
        points: [
          'Excessive worry',
          'Catastrophizing',
          'Physical tension / panic',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C06',
        title: 'Grief, Loss & Major Life Transitions',
        points: [
          'Adjustment to change',
          'Persistent sadness',
          'Loss of focus / direction',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C08',
        title: 'Health Anxiety & Somatic Concerns',
        points: [
          'Health-related worry',
          'Symptom checking',
          'Health panic',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C15',
        title: 'Social Isolation & Loneliness',
        points: [
          'Reduced social contact',
          'Feeling disconnected',
          'Spending excessive time alone',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
    ],
  },

  {
    id: 'habits',
    title: 'Everyday Life Habits',
    category: 'Lifestyle & Community',
    color: '#5550A5',
    lightBg: '#F2F2FA',
    icon: SelfImprovementOutlinedIcon,

    concerns: [
      {
        code: 'C12',
        title: 'Lifestyle Disruption & Insomnia',
        points: [
          'Irregular sleep / routine',
          'Racing thoughts',
          'Fatigue & restlessness',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C13',
        title: 'Technology & Digital Overload',
        points: [
          'Excessive phone use',
          'Digital distraction in relationships',
          'Mental fatigue',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C14',
        title: 'Chronic Fatigue & Low Energy',
        points: [
          'Low morning energy',
          'Afternoon slumps',
          'Difficulty with daily tasks',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
      {
        code: 'C15',
        title: 'Social Isolation & Loneliness',
        points: [
          'Reduced social contact',
          'Feeling disconnected',
          'Spending excessive time alone',
          'Lorem ipsum dolor sit amet, consectetur elit.',
          'Lorem ipsum dolor sit amet, consectetur elit.',
        ],
      },
    ],
  },
];

const FAQS = [
  {
    q: 'Is counselling only for serious problems?',
    a: 'No. Many clusters describe everyday stress, like tiredness, screen overload or exam pressure. Early support often prevents bigger problems.',
  },
  {
    q: 'Does a cluster mean I have a diagnosis?',
    a: 'No. A cluster is a family of similar concerns. It helps plan the support and is not a medical label.',
  },
  {
    q: 'Can I fit in more than one cluster?',
    a: 'Yes. Many people do. The counsellor looks at the whole picture.',
  },
  {
    q: 'Would the session be conducted online or in-person?',
    a: 'Your choice. Both are private, scheduled and supported by the BJS team.',
  },
  {
    q: 'How do I pay?',
    a: 'Through an official Razorpay link sent on WhatsApp. You can pay for the full package upfront or session by session.',
  },
  {
    q: 'What happens to my session notes?',
    a: 'The counsellor archives them confidentially. Video sessions use encrypted connections, with sensitive data protected using industry-standard encryption.',
  },
];

export default function LandingPage({ onAuthRedirect, onOpenRegisterAuth }) {
  const [formatMode, setFormatMode] = useState('online'); // 'online' | 'studio'
  const [expandedFaq, setExpandedFaq] = useState(false);
  const [activeCareGroup, setActiveCareGroup] = useState(0);
  const [activeConcern, setActiveConcern] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [currentScene, setCurrentScene] = useState(0);



  const phrases = [
    { text: "better relationships.", color: "#378579" },
    { text: "open conversations.", color: "#6484BD" },
    { text: "mutual understanding.", color: "#8B78B5" },
    { text: "healthier connections.", color: "#C56F91" },
    { text: "mental clarity.", color: "#71966F" },
    { text: "new beginnings.", color: "#96966f" },
  ];


  const navigate = useNavigate()

  const handleFaqChange = (panel) => (event, isExpanded) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  const handleRegisterClick = () => {
    if (onOpenRegisterAuth) {
      onOpenRegisterAuth();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setVisible(true);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScene((prev) => (prev + 1) % scenes.length);
    }, scenes[currentScene].duration);

    return () => clearTimeout(timer);
  }, [currentScene]);

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
      <Box sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 5, md: 6 }, width: '100%' }}>
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
              {/* <Box
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
              </Box> */}

              {/* Main Headline */}

              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.8rem", sm: "3.5rem", md: "4.5rem" },
                  lineHeight: 1.05,
                  fontWeight: 600,
                  textWrap:"wrap",
                  letterSpacing: "-2px",
                   width: {xs:"100%", sm:"100%"},
                  // maxWidth: "650px",
                  mb: 3,
                }}
              >
                A safe space for{" "}


                <Box
                  component="span"
                  sx={{
                    color: phrases[phraseIndex].color,
                    fontWeight: 600,
                    display: "inline-block",
                    height: { xs: "1.75em", sm: "1em", md: "2em" },
                    lineHeight: 1.05,
                    verticalAlign: "bottom",
                    opacity: visible ? 1 : 0,
                    transition: "opacity 400ms ease-in-out",
                  }}
                >
                  {phrases[phraseIndex].text}
                </Box>
              </Typography>


              {/* Subtitle */}
              <Typography
                sx={{
                  fontSize: { xs: '1rem', sm: '1.12rem', md:"1.25rem" },
                  width:"100%",
                  color: '#475569',
                  lineHeight: 1.65,
                  // maxWidth: '640px',
                   width: {xs:"100%", sm:"100%"},
                  mb: 4,
                  fontWeight: 400,
                }}
              >
                Access professional marriage counselling and relationship
                support through a simple, confidential platform designed to help
                you take the next step.

                <p>The <b>BJS Counselling Program</b> helps a person move from “I don’t know who to talk to” to <b>“I have someone who understands.”</b>​</p>
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
              {/* <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 }, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155', fontSize: '0.86rem', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#7c3aed' }} /> Verified Clinical Licensure
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155', fontSize: '0.86rem', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#059669' }} /> 100% Secure & Encrypted
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#334155', fontSize: '0.86rem', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#d97706' }} /> Same-Week Bookings
                </Box>
              </Box> */}

              {/* Social Proof / Rating Badge */}
              {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
              </Box> */}
            </Box>

            {/* Right Column: Hero Image with Floating Cards */}
            <Box
              sx={{
                position: 'relative',
                borderRadius: '28px',
                overflow: 'hidden',
                // bgcolor: '#ff00ff',
                width: "100%",
                height: { xs: "320px", sm: "420px", md: "4/3" },
                aspectRatio: { xs: "4 / 3", sm: "5 / 4", md: "4/3" },
              }}
            >
              {/* Consultation Room Image */}
              <Box
                component="img"
                src={scenes[currentScene].src}
                aria-label="Counselling journey illustration"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                sx={{
                  width: "100%",
                  height: "100%",
                  aspectRatio: { xs: "4 / 3", sm: "5 / 4", md: "auto" },
                  objectFit: "contain",
                  display: "block",
                  borderRadius: "20px",
                }}
              />

              {/* Bottom Floating Card */}
              {/* <Box
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
              </Box> */}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 3. FIND THE SUPPORT THAT'S RIGHT FOR YOU (ROW-WISE 2 ELEMENTS: LEFT LARGE CARD + RIGHT 3 STACKED CARDS) */}
      {/* <Box id="counselling-types" sx={{ py: { xs: 6, md: 8 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>

          {/* Section Header 
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
            {/* Left Big Card: Individual Counselling 
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

              {/* 2x2 Feature Pills 
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

            {/* Right Column: 3 Horizontal Cards Stacked 
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', justifyContent: 'space-between' }}>

              {/* 1. Couple Counselling 
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

              {/* 2. Family Counselling 
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

              {/* 3. Pre & Post Marital 
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
      </Box> */}

      {/* 4. CHOOSE WHAT FEELS COMFORTABLE (ROW-WISE 2 ELEMENTS: LEFT FORMAT CARDS + RIGHT SANCTUARY PHOTO) */}
      <Box sx={{ py: { xs: 3, md: 4 } }}>
        <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, textAlign: "center", fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#1e1b4b', letterSpacing: '-0.8px', mb: 3 }}>
          Choose what feels comfortable
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
            mx: { xs: 2, sm: 10 },
            alignItems: 'stretch',
          }}
        >
          {[
            {
              id: 'online',
              title: 'PRIVATE ONLINE SESSION',
              icon: VideocamOutlinedIcon,
              color: '#197985',
              shadow: 'rgba(25, 121, 133, 0.18)',
              items: [
                {
                  label: 'How it is booked',
                  text: 'Scheduled through a calendar invite',
                },
                {
                  label: 'Where it happens',
                  text: 'Secure Zoom or Google Meet link',
                },
                {
                  label: 'Privacy',
                  text: 'Counsellor works from a quiet, private office with a professional headset',
                },
                {
                  label: 'Support on hand',
                  text: 'IT team on call for connectivity problems',
                },
              ],
            },
            {
              id: 'studio',
              title: 'AT HEAD OFFICE',
              icon: MeetingRoomOutlinedIcon,
              color: '#B3315A',
              shadow: 'rgba(179, 49, 90, 0.18)',
              items: [
                {
                  label: 'How it is booked',
                  text: 'Timing strictly as per the master schedule',
                },
                {
                  label: 'Where it happens',
                  text: 'Dedicated consultation chamber at the Head Office',
                },
                {
                  label: 'Privacy',
                  text: 'Sound-proof room for absolute privacy',
                },
                {
                  label: 'Support on hand',
                  text: 'Front desk greets you, offers water and escorts you from the waiting lounge',
                },
              ],
            },
          ].map((option, optionIndex) => {
            const isSelected = formatMode === option.id;
            const Icon = option.icon;

            return (
              <Card
                key={option.id}
                onClick={() => setFormatMode(option.id)}
                elevation={0}
                sx={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',

                  // Selection
                  border: isSelected
                    ? `2px solid ${option.color}`
                    : '1px solid #e2e8f0',

                  opacity: isSelected ? 1 : 0.58,

                  transform: isSelected
                    ? 'scale(1.025) translateY(-5px)'
                    : 'scale(0.97)',

                  boxShadow: isSelected
                    ? `0 8px 24px ${option.shadow}`
                    : '0 3px 12px rgba(0,0,0,0.035)',

                  transition:
                    'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), ' +
                    'box-shadow 0.4s ease, ' +
                    'opacity 0.4s ease, ' +
                    'filter 0.4s ease, ' +
                    'border-color 0.4s ease',

                  animation: 'formatCardIn 0.55s ease both',
                  animationDelay: `${optionIndex * 100}ms`,

                  '&:hover': {
                    opacity: 1,
                    filter: 'none',
                    transform: isSelected
                      ? 'scale(1.025) translateY(-7px)'
                      : 'scale(0.99) translateY(-3px)',
                  },

                  '@keyframes formatCardIn': {
                    from: {
                      opacity: 0,
                      transform: 'translateY(18px)',
                    },
                    to: {
                      opacity: 1,
                      transform: isSelected ? 'translateY(-3px)' : 'none',
                    },
                  },
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    px: { xs: 2.5, sm: 3 },
                    py: 2.5,

                    bgcolor: '#fff',
                    color: '#1e293b',
                    borderBottom: '1px solid #edf1f3',

                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,

                    transition:
                      'background-color 0.4s ease, color 0.4s ease',
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',

                      bgcolor: isSelected
                        ? 'rgba(255,255,255,0.16)'
                        : 'rgba(255,255,255,0.7)',

                      transition: 'all 0.4s ease',

                      '& svg': {
                        fontSize: isSelected ? 27 : 24,
                        transition: 'font-size 0.4s ease',
                      },
                    }}
                  >
                    <Icon sx={{
                      bgcolor: `${option.color}15`,
                      color: option.color
                    }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: {
                        xs: '1.05rem',
                        sm: '1.2rem',
                      },
                      fontWeight: 800,
                      letterSpacing: '1px',
                      transition: 'font-size 0.4s ease',
                    }}
                  >
                    {option.title}
                  </Typography>
                </Box>

                {/* Details */}
                <Box
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    bgcolor: isSelected ? '#fff' : '#f8fafc',
                    transition: 'background-color 0.4s ease',
                  }}
                >
                  {option.items.map((item, index) => (
                    <Box
                      key={item.label}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: '1fr',
                        },
                        gap: 2,
                        alignItems: 'center',

                        py: 2,

                        borderBottom:
                          index !== option.items.length - 1
                            ? '1px solid #edf1f3'
                            : 'none',

                        animation: isSelected
                          ? 'rowIn 0.4s ease both'
                          : 'none',

                        animationDelay: `${index * 70}ms`,

                        '@keyframes rowIn': {
                          from: {
                            opacity: 0,
                            transform: 'translateX(-6px)',
                          },
                          to: {
                            opacity: 1,
                            transform: 'translateX(0)',
                          },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column"
                        }}
                      >

                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color: isSelected
                              ? option.color
                              : '#94a3b8',
                            transition: 'color 0.4s ease',
                          }}
                        >
                          {item.label}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: '0.9rem',
                            color: isSelected
                              ? '#334155'
                              : '#94a3b8',
                            lineHeight: 1.5,
                            transition: 'color 0.4s ease',
                          }}
                        >
                          {item.text}
                        </Typography>

                      </Box>
                    </Box>
                  ))}
                </Box>
                {/* <Box sx={{ px: 2, pb: 2 }}>
                <Button
                  fullWidth
                  variant={isSelected ? 'contained' : 'outlined'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormatMode(option.id);
                  }}
                  sx={{
                    borderRadius: '7px',
                    py: 1,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isSelected ? '#fff' : '#475569',
                    bgcolor: isSelected ? option.color : '#fff',
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',

                    '&:hover': {
                      bgcolor: isSelected ? option.color : '#f8fafc',
                      boxShadow: 'none',
                    },
                  }}
                >
                  {option.id === 'online'
                    ? 'Select Online Session →'
                    : 'Select Head Office Session →'}
                </Button>
              </Box> */}
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* 5. GETTING STARTED IS SIMPLE & GENTLE (6 HORIZONTAL STEP CARDS IN A ROW) */}
      <Box id="how-it-works" sx={{ py: { xs: 6 }, width: '100%' }}>
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
              How it Works
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
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, 1fr)',
              },
              gap: 2.5,
            }}
          >
            {STEPS.map((step, idx) => {
              const Icon = step.icon;

              return (
                <Card
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 3.5,
                    borderRadius: '10px',
                    bgcolor: step.bg,
                    border: 'none',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Icon + Number */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 3.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: step.color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ fontSize: 42 }} />
                    </Box>

                    <Typography
                      sx={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '3.2rem',
                        fontWeight: 700,
                        color: step.color,
                        opacity: 0.7,
                        lineHeight: 1,
                      }}
                    >
                      {step.num}
                    </Typography>
                  </Box>

                  {/* Heading */}
                  <Typography
                    sx={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: step.color,
                      mb: 1.5,
                    }}
                  >
                    {step.step}
                  </Typography>

                  {/* Content */}
                  <Typography
                    sx={{
                      fontSize: '1rem',
                      color: '#29202B',
                      lineHeight: 1.45,
                    }}
                  >
                    {step.title} {step.desc}
                  </Typography>
                </Card>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* 6. YOUR PRIVACY MATTERS DEEPLY (3 PILLAR CARDS IN A ROW) */}
      <Box
        sx={{
          py: { xs: 6 },
          px: { xs: 2, sm: 4, md: 6 },
        }}
        id="promises"
      >
        {/* Section heading */}
        <Box sx={{ textAlign: 'center' }}>
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
            Our Promises
          </Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, textAlign: "center", color: '#1e1b4b', letterSpacing: '-0.8px', mb: 1.5 }}>
            We’ll be here when you need support
          </Typography>
          <Typography sx={{ fontSize: '0.98rem', color: '#64748b' }}>
            We want to earn your trust, so here’s what you can expect from us.          </Typography>
        </Box>

        {/* Promise cards */}
        <Box
          sx={{
            display: 'grid',
            paddingTop: "25px",
            paddingLeft: { xs: "5px", sm: "50px" },
            paddingRight: { xs: "5px", sm: "50px" },
            paddingBottom: "25px",
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(6, 1fr)',
            },
            gap: 2,
          }}
        >
          {PROMISES.map((promise, index) => {
            const Icon = promise.icon;
            return (
              <Box
                key={promise.title}
                tabIndex={0}
                sx={{
                  position: 'relative',
                  minWidth: 0,
                  p: { xs: 2.5, md: 2.75 },
                  borderRadius: '16px',
                  bgcolor: promise.bg,
                  border: '1px solid transparent',

                  transition:
                    'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1), ' +
                    'box-shadow 280ms ease, ' +
                    'border-color 200ms ease',

                  animation: 'promiseIn 450ms ease both',
                  animationDelay: `${index * 60}ms`,

                  '&:hover, &:focus-visible': {
                    transform: 'translateY(-7px) scale(1.02)',
                    borderColor: `${promise.color}35`,
                    boxShadow: `0 18px 38px ${promise.color}22`,
                    zIndex: 2,
                    outline: 'none',
                  },

                  '&:focus-visible': {
                    boxShadow: `0 0 0 3px ${promise.color}30, 0 18px 38px ${promise.color}22`,
                  },

                  '@keyframes promiseIn': {
                    from: {
                      opacity: 0,
                      transform: 'translateY(12px)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  },
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: promise.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,

                    transition:
                      'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',

                    '.MuiBox-root:hover &, .MuiBox-root:focus-visible &': {
                      transform: 'scale(1.08)',
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 25 }} />
                </Box>

                {/* Title */}
                <Typography
                  sx={{
                    fontSize: '1.08rem',
                    fontWeight: 800,
                    color: promise.color,
                    mb: 1,
                  }}
                >
                  {promise.title}
                </Typography>

                {/* Description */}
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    color: '#342C38',
                    lineHeight: 1.55,
                  }}
                >
                  {promise.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* 7. Clusters and problems () */}
      <Box
        sx={{
          py: { xs: 6 },
          bgcolor: '#FBFBFD',
        }}
        id="seek-help"
      >
        <Container maxWidth="lg">

          {/* Section heading */}
          <Box
            sx={{
              textAlign: 'center',
              maxWidth: 700,
              mx: 'auto',
              mb: { xs: 4, md: 6 },
            }}
          >
            <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' }, textAlign: "center", color: '#1e1b4b', letterSpacing: '-0.8px', mb: 1.5 }}>
              Find where you belong today
            </Typography>

            <Typography
              sx={{
                color: '#64748b',
                fontSize: '0.95rem',
                lineHeight: 1.65,
              }}
            >
              You do not need a clinical diagnosis to seek support.
              Explore an area that feels relevant to you.
            </Typography>
          </Box>

          {/* Main navigator */}
          {/* <Box
            sx={{
              bgcolor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: { xs: '18px', md: '24px' },
              p: { xs: 2, sm: 3, md: 4 },
              boxShadow: '0 12px 35px rgba(15,23,42,0.05)',
            }}
          > */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: '300px 1fr',
              },
              gap: { xs: 3, lg: 4 },
            }}
          >

            {/* LEFT — CARE GROUPS */}
            <Stack sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {CARE_GROUPS.map((group, index) => {
                const Icon = group.icon;
                const selected = activeCareGroup === index;

                return (
                  <Box
                    key={group.id}
                    component="button"
                    onClick={() => {
                      setActiveCareGroup(index);
                      setActiveConcern(0);
                    }}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      border: selected
                        ? `1px solid ${group.color}`
                        : '1px solid #edf0f3',
                      bgcolor: selected ? '#fff' : '#fafbfc',
                      borderRadius: '14px',
                      p: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      transition: 'all 0.3s ease',

                      boxShadow: selected
                        ? `0 8px 22px ${group.color}14`
                        : 'none',

                      transform: selected
                        ? 'translateX(3px)'
                        : 'none',

                      '&:hover': {
                        bgcolor: '#fff',
                        borderColor: group.color,
                        transform: 'translateX(3px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: '12px',
                        bgcolor: selected
                          ? group.color
                          : group.lightBg,
                        color: selected
                          ? '#fff'
                          : group.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Icon sx={{ fontSize: 22 }} />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          mb: 0.25,
                        }}
                      >
                        {group.category}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: '0.88rem',
                          fontWeight: selected ? 800 : 600,
                          color: '#1e293b',
                          lineHeight: 1.3,
                        }}
                      >
                        {group.title}
                      </Typography>
                    </Box>

                    <ChevronRightRoundedIcon
                      sx={{
                        fontSize: 20,
                        color: selected
                          ? group.color
                          : '#cbd5e1',
                        transition: 'all 0.3s ease',
                        transform: selected
                          ? 'translateX(3px)'
                          : 'none',
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>

            {/* RIGHT — CONCERN CAROUSEL */}
            {(() => {
              const group = CARE_GROUPS[activeCareGroup];
              const concern = group.concerns[activeConcern];
              const Icon = group.icon;

              return (
                <Box
                  key={`${group.id}-${activeConcern}`}
                  sx={{
                    borderRadius: '18px',
                    bgcolor: group.lightBg,
                    border: `1px solid ${group.color}22`,
                    p: { xs: 2.5, sm: 3.5 },
                    minHeight: { lg: 430 },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',

                    animation: 'carePanelIn 0.35s ease both',

                    '@keyframes carePanelIn': {
                      from: {
                        opacity: 0,
                        transform: 'translateY(8px)',
                      },
                      to: {
                        opacity: 1,
                        transform: 'translateY(0)',
                      },
                    },
                  }}
                >

                  {/* Panel header */}
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.75,
                        }}
                      >
                        {/* Cluster code */}
                        <Box
                          sx={{
                            width: 58,
                            height: 58,
                            borderRadius: '14px',
                            bgcolor: group.color,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 58,
                              height: 58,
                              borderRadius: '14px',
                              bgcolor: group.color,
                              color: group.lightBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <group.icon sx={{ fontSize: 30 }} />
                          </Box>
                        </Box>

                        {/* Cluster name */}
                        <Typography
                          sx={{
                            fontSize: {
                              xs: '1.25rem',
                              sm: '1.6rem',
                            },
                            fontWeight: 800,
                            color: '#172033',
                            lineHeight: 1.2,
                          }}
                        >
                          {concern.title}
                        </Typography>
                      </Box>

                      {/* Carousel controls */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <IconButton
                          disabled={activeConcern === 0}
                          onClick={() =>
                            setActiveConcern((prev) => prev - 1)
                          }
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: '#fff',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <ChevronLeftRoundedIcon />
                        </IconButton>

                        <IconButton
                          disabled={
                            activeConcern ===
                            group.concerns.length - 1
                          }
                          onClick={() =>
                            setActiveConcern((prev) => prev + 1)
                          }
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: '#fff',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <ChevronRightRoundedIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Concern */}
                    <Card
                      elevation={0}
                      sx={{
                        bgcolor: '#fff',
                        borderRadius: '15px',
                        border: '1px solid #e8ebef',
                        p: { xs: 2.5, sm: 3 },
                      }}
                    >
                      {/* <Typography
                          sx={{
                            fontSize: {
                              xs: '1.2rem',
                              sm: '1.4rem',
                            },
                            fontWeight: 800,
                            color: '#172033',
                            lineHeight: 1.25,
                            mb: 2.5,
                          }}
                        >
                          {concern.title}
                        </Typography> */}

                      <Typography
                        sx={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          color: '#94a3b8',
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase',
                          mb: 1.25,
                        }}
                      >
                        You might be experiencing
                      </Typography>

                      <Stack spacing={1}>
                        {concern.points.map((point) => (
                          <Box
                            key={point}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                bgcolor: group.color,
                                flexShrink: 0,
                              }}
                            />

                            <Typography
                              sx={{
                                fontSize: '0.84rem',
                                color: '#475569',
                              }}
                            >
                              {point}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Card>
                  </Box>

                  {/* Bottom */}
                  <Box
                    sx={{
                      mt: 3,
                      pt: 2.5,
                      borderTop: `1px solid ${group.color}18`,
                      display: 'flex',
                      alignItems: {
                        xs: 'flex-start',
                        sm: 'center',
                      },
                      justifyContent: 'space-between',
                      flexDirection: {
                        xs: 'column',
                        sm: 'row',
                      },
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        maxWidth: 390,
                        lineHeight: 1.5,
                      }}
                    >
                      No one should have to carry their pain alone. You are not alone, and support is here when you are ready to take the first step towards healing.
                    </Typography>

                    <Button
                      variant='text'
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        color: group.color,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => navigate("/register")}
                    >
                      Explore support
                      <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
                    </Button>
                  </Box>
                </Box>
              );
            })()}
            {/* </Box> */}

            {/* Reassurance */}
            {/* <Box
              sx={{
                mt: 3,
                pt: 2.5,
                borderTop: '1px solid #edf0f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    color: '#B66A00',
                    fontWeight: 800,
                  }}
                >
                  Please remember:
                </Box>{' '}
                You do not need a “serious” problem to ask for help.
                Early signs count too.
              </Typography>

              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                }}
              >
                Private • Online & In-Person
              </Typography>
            </Box> */}
          </Box>
        </Container>
      </Box>

      {/* 8. FREQUENTLY ASKED QUESTIONS (ROW-WISE 2 ELEMENTS: LEFT HELP BOX + RIGHT ACCORDION LIST) */}
      <Box id="faqs" sx={{ py: { xs: 6 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, md: 6 } }}>
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
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: "space-between", gap: 1 }}>
              {FAQS.map((faq, idx) => (
                <Accordion
                  key={idx}
                  expanded={expandedFaq === `panel${idx}`}
                  onChange={handleFaqChange(`panel${idx}`)}
                  elevation={0}
                  sx={{
                    borderRadius: '8px !important',
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
      <Box sx={{ py: { xs: 2 }, width: '100%' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Box
            sx={{
              borderRadius: '24px',
              color: '#ffffff',
              p: { xs: 4, sm: 6 },
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(76, 59, 113, 0.3)',
              background: 'linear-gradient(135deg, #8774b1 0%, #4f49a4 100%)',
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

              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: { xs: '1.9rem', sm: '2.5rem' }, mb: 2, lineHeight: 1.2 }}>
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
      <Box sx={{ bgcolor: '#ffffff', color: '#64748b', pt: { xs: 4 }, pb: 4, width: '100%', borderTop: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 4,
            }}
          >
            {/* Brand Logo & Mission */}
            <Box sx={{ maxWidth: '520px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
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
                  BJS Counselling Program
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.6 }}>
                Providing empathetic, professional counselling built on trust, familiarity and emotional safety.
              </Typography>
            </Box>

            {/* Footer Links Row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 }, fontSize: '0.88rem', fontWeight: 600 }}>
              <Box component={Link} to="/" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Home</Box>
              <Box component="a" href="#how-it-works" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>How it Works</Box>
              <Box component="a" href="#promises" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Our Promise</Box>
              <Box component="a" href="#seek-help" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Seek Help</Box>
              <Box component="a" href="#faqs" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>FAQs</Box>
              {/* <Box component="a" href="#faqs" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Privacy Policy</Box>
              <Box component="a" href="#faqs" sx={{ color: '#475569', textDecoration: 'none', '&:hover': { color: '#1e1b4b' } }}>Terms of Service</Box> */}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
