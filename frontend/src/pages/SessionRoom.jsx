import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Container, Grid, Typography, Button, TextField,
  Avatar, CircularProgress, Alert, Paper, IconButton, Divider
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import ChatIcon from '@mui/icons-material/Chat';
import TimerIcon from '@mui/icons-material/Timer';
import { api } from '../api';

const MOCK_BOT_RESPONSES = [
  "I understand. Thank you for sharing that with me.",
  "That sounds challenging. How does that make you feel in your body?",
  "Let's take a deep breath together. Box breathing can help ground us.",
  "That is a very valid perspective. How long have you noticed this pattern?",
  "What is one small step we could take this week to address that stress?",
  "Let's write that down in your homework sheet to track over the next few days."
];

export default function SessionRoom({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Call states
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [sessionEndState, setSessionEndState] = useState(false);

  // Time tracking: counts down 10 minutes for demo quick testing, or standard 60 minutes
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds (600s)
  
  // Chat log
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const chatEndRef = useRef(null);

  // Notepad state
  const [notepadText, setNotepadText] = useState('');
  const [notepadSaving, setNotepadSaving] = useState(false);

  // Auto save notes
  const handleAutoSaveNotes = useCallback(async (textToSave = notepadText) => {
    if (currentUser.role === 'counselor') {
      try {
        setNotepadSaving(true);
        await api.updateAppointment(id, { sessionNotes: textToSave });
      } catch (err) {
        console.error('Failed to autosave notes', err);
      } finally {
        setNotepadSaving(false);
      }
    } else {
      localStorage.setItem(`notepad_${id}`, textToSave);
    }
  }, [currentUser.role, id, notepadText]);

  const handleAutoSaveNotesRef = useRef(handleAutoSaveNotes);
  useEffect(() => {
    handleAutoSaveNotesRef.current = handleAutoSaveNotes;
  });

  const fetchSessionData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAppointment(id);
      setAppointment(data);
      
      // Seed clinical/personal notepad
      setNotepadText(currentUser.role === 'counselor' ? data.sessionNotes : localStorage.getItem(`notepad_${id}`) || '');

      // Seed initial chat logs
      setChatMessages([
        {
          id: 1,
          senderName: data.counselorName,
          senderRole: 'counselor',
          text: `Hello ${data.patientName}, welcome to our session today. How have things been since we last met?`,
          timestamp: new Date(Date.now() - 30000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load session workspace.');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser.role]);

  useEffect(() => {
    if (currentUser && id) {
      Promise.resolve().then(() => {
        fetchSessionData();
      });
    }
  }, [currentUser, id, fetchSessionData]);

  // Countdown timer logic
  useEffect(() => {
    if (loading || error || sessionEndState) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSessionEndState(true);
          handleAutoSaveNotesRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, error, sessionEndState]);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!typedMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: typedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setTypedMessage('');

    // Trigger mock automated therapy reply
    setTimeout(() => {
      const responseIndex = Math.floor(Math.random() * MOCK_BOT_RESPONSES.length);
      const botMessage = {
        id: Date.now() + 1,
        senderName: currentUser.role === 'patient' ? appointment.counselorName : appointment.patientName,
        senderRole: currentUser.role === 'patient' ? 'counselor' : 'patient',
        text: MOCK_BOT_RESPONSES[responseIndex],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, botMessage]);
    }, 2000);
  };

  // Trigger save when notepad is edited
  const handleNotepadChange = (e) => {
    const txt = e.target.value;
    setNotepadText(txt);
    
    // Simple debounce/autosave simulation
    if (currentUser.role === 'counselor') {
      handleAutoSaveNotes(txt);
    } else {
      localStorage.setItem(`notepad_${id}`, txt);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (window.confirm("Are you sure you want to exit the virtual session? Your clinical notes have been saved.")) {
      handleAutoSaveNotes();
      
      // Update appointment status to completed if session completed
      if (currentUser.role === 'counselor') {
        api.updateAppointment(id, { status: 'completed' })
          .then(() => {
            navigate('/dashboard');
          })
          .catch((err) => {
            console.error('Failed to complete appointment', err);
            navigate('/dashboard');
          });
      } else {
        navigate('/dashboard');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>Return to Dashboard</Button>
      </Container>
    );
  }

  if (appointment && appointment.appointmentType === 'In-Person Consultation') {
    return (
      <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
        <Paper sx={{ p: 6, borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 3 }}>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2 }}>
            Offline Meeting Details
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            This appointment with <strong>{appointment.counselorName}</strong> is scheduled to take place in-person (offline).
          </Typography>
          <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 3, border: '1px dashed', borderColor: 'primary.light', display: 'inline-block', textAlign: 'left', mb: 4, width: '100%', maxWidth: '400px', mx: 'auto' }}>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Date:</strong> {appointment.date}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Time:</strong> {appointment.time}</Typography>
            <Typography variant="body2"><strong>Clinic Location:</strong> {appointment.clinicAddress || '102 Medical Wellness Center, Suite 300, California'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Determine timer color alerts
  const timerColor = timeLeft < 60 ? 'error.main' : timeLeft < 300 ? 'warning.main' : 'success.main';

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      bgcolor: '#0f172a', // Fixed Dark blue background for call workspace
      color: '#f8fafc',
      overflow: 'hidden'
    }}>
      <Grid container sx={{ height: '100%' }}>
        {/* LEFT COLUMN: VIDEO ROOM COMPONENT */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
          {/* Header Row: Room details & Countdown */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                Virtual Session Room
              </Typography>
              <Typography variant="caption" sx={{ color: 'slate.400' }}>
                Provider: {appointment.counselorName} | Patient: {appointment.patientName}
              </Typography>
            </Box>

            <Paper sx={{ 
              px: 2, 
              py: 0.75, 
              bgcolor: 'rgba(255,255,255,0.08)', 
              color: timerColor,
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              borderRadius: 3,
              border: '1px solid',
              borderColor: timerColor
            }}>
              <TimerIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                {sessionEndState ? "Session Concluded" : formatTime(timeLeft)}
              </Typography>
            </Paper>
          </Box>

          {/* Immersive Video Feeds Grid */}
          <Box sx={{ 
            flexGrow: 1, 
            position: 'relative', 
            bgcolor: '#1e293b', 
            borderRadius: 4, 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}>
            {/* 1. Main Feed (Counselor or Client) */}
            {cameraOn ? (
              <Box sx={{ 
                width: '100%', 
                height: '100%', 
                position: 'relative', 
                backgroundImage: 'url("https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800")', // Healing therapy background representation
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Audio Wave Overlay */}
                <Box sx={{ textAlign: 'center', bgcolor: 'rgba(15,23,42,0.6)', p: 3, borderRadius: 4, backdropFilter: 'blur(4px)' }}>
                  <Avatar 
                    src={currentUser.role === 'patient' ? appointment.counselorName : appointment.patientName} // Dynamic helper name
                    sx={{ width: 80, height: 80, mx: 'auto', mb: 1, border: '3px solid #818cf8' }} 
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {currentUser.role === 'patient' ? appointment.counselorName : appointment.patientName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'success.light', display: 'block', mt: 0.5 }}>
                    {micOn ? "🎙️ Audio Connected" : "🔇 Muted"}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <VideocamOffIcon sx={{ fontSize: 60, color: 'slate.600', mb: 1 }} />
                <Typography color="slate.400">Webcam turned off</Typography>
              </Box>
            )}

            {/* 2. PiP Self Webcam View */}
            <Box sx={{ 
              position: 'absolute', 
              bottom: 16, 
              right: 16, 
              width: 140, 
              height: 100, 
              bgcolor: '#0f172a', 
              borderRadius: 3, 
              overflow: 'hidden',
              boxShadow: '0 8px 16px -4px rgba(0,0,0,0.5)',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cameraOn ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar src={currentUser.avatar} sx={{ width: 40, height: 40, mx: 'auto', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>You (Self)</Typography>
                </Box>
              ) : (
                <VideocamOffIcon sx={{ fontSize: 24, color: 'slate.500' }} />
              )}
            </Box>
          </Box>

          {/* Interactive Web-Controls Toolbar */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: 2, 
            py: 1,
            bgcolor: '#1e293b', 
            borderRadius: 3 
          }}>
            <IconButton 
              color={cameraOn ? "inherit" : "error"} 
              onClick={() => setCameraOn(!cameraOn)}
              sx={{ bgcolor: cameraOn ? 'rgba(255,255,255,0.08)' : 'rgba(239, 68, 68, 0.2)' }}
            >
              {cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton 
              color={micOn ? "inherit" : "error"} 
              onClick={() => setMicOn(!micOn)}
              sx={{ bgcolor: micOn ? 'rgba(255,255,255,0.08)' : 'rgba(239, 68, 68, 0.2)' }}
            >
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            <IconButton 
              color={screenShare ? "primary" : "inherit"} 
              onClick={() => setScreenShare(!screenShare)}
              sx={{ bgcolor: screenShare ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)' }}
            >
              <ScreenShareIcon />
            </IconButton>

            <Button 
              variant="contained" 
              color="error" 
              startIcon={<CallEndIcon />}
              onClick={handleEndCall}
              sx={{ borderRadius: 99, px: 3 }}
            >
              End Call
            </Button>
          </Box>
        </Grid>

        {/* RIGHT COLUMN: INTEGRATED NOTEBOOK & LIVE CHAT */}
        <Grid item xs={12} md={4} sx={{ 
          height: '100%', 
          borderLeft: '1px solid #334155', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: '#1e293b'
        }}>
          {/* Section 1: Note Pad */}
          <Box sx={{ p: 2, height: '40%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'indigo.200' }}>
              <NoteAltIcon fontSize="small" /> 
              {currentUser.role === 'counselor' ? 'Clinical Session Journal (Auto-saved)' : 'Personal Notes / Therapy Goals'}
            </Typography>
            <TextField
              multiline
              fullWidth
              value={notepadText}
              onChange={handleNotepadChange}
              placeholder={currentUser.role === 'counselor' 
                ? "Write professional progress reports, diagnostic details..." 
                : "Jot down insights, strategies, or questions for your therapist..."}
              sx={{ 
                flexGrow: 1, 
                bgcolor: '#0f172a', 
                borderRadius: 2,
                '& .MuiInputBase-root': { color: '#cbd5e1', height: '100%', alignItems: 'flex-start' },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
              }}
            />
            {notepadSaving && (
              <Typography variant="caption" sx={{ color: 'success.main', mt: 0.5, alignSelf: 'flex-end' }}>
                Autosaving notes...
              </Typography>
            )}
          </Box>

          <Divider sx={{ bgcolor: '#334155' }} />

          {/* Section 2: Live Chat Panel */}
          <Box sx={{ p: 2, height: '60%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'indigo.200' }}>
              <ChatIcon fontSize="small" /> Live Chat Session
            </Typography>
            
            {/* Chat Box log area */}
            <Box sx={{ 
              flexGrow: 1, 
              overflowY: 'auto', 
              bgcolor: '#0f172a', 
              borderRadius: 3, 
              p: 2, 
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}>
              {chatMessages.map((msg) => {
                const isSelf = msg.senderRole === currentUser.role;
                return (
                  <Box 
                    key={msg.id} 
                    sx={{ 
                      alignSelf: isSelf ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isSelf ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'slate.400', fontSize: '0.7rem', mb: 0.25 }}>
                      {msg.senderName} • {msg.timestamp}
                    </Typography>
                    <Box sx={{ 
                      bgcolor: isSelf ? '#4f46e5' : '#334155', 
                      color: '#ffffff',
                      p: 1.25, 
                      borderRadius: isSelf ? '12px 12px 0 12px' : '12px 12px 12px 0',
                      fontSize: '0.875rem',
                      wordBreak: 'break-word'
                    }}>
                      {msg.text}
                    </Box>
                  </Box>
                );
              })}
              <div ref={chatEndRef} />
            </Box>

            {/* Chat Form message sender input */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type your message..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                sx={{ 
                  bgcolor: '#0f172a', 
                  borderRadius: 2,
                  '& .MuiInputBase-root': { color: '#cbd5e1' },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              />
              <IconButton color="primary" onClick={handleSendMessage} sx={{ bgcolor: '#4f46e5', color: '#ffffff', '&:hover': { bgcolor: '#4338ca' } }}>
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
