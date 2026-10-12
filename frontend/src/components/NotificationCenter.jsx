import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Popover,
  Badge,
  Button,
  Tooltip,
  Skeleton,
  Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 0 || diffInSeconds < 45) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getNotificationMeta = (message = '') => {
  const text = String(message || '');
  if (/reschedul/i.test(text)) {
    return {
      category: 'reschedule',
      title: 'Session Rescheduled',
      Icon: EventRepeatRoundedIcon,
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a'
    };
  }
  if (/cancell/i.test(text)) {
    return {
      category: 'cancellation',
      title: 'Session Cancelled',
      Icon: EventBusyRoundedIcon,
      color: '#e11d48',
      bgColor: '#fff1f2',
      borderColor: '#fecdd3'
    };
  }
  if (/booked|booking|session\(s\)|scheduled|appointment/i.test(text)) {
    return {
      category: 'booking',
      title: 'Appointment Update',
      Icon: EventAvailableRoundedIcon,
      color: '#4f46e5',
      bgColor: '#eef2ff',
      borderColor: '#c7d2fe'
    };
  }
  if (/assigned|counselor|care case|registration request|care request/i.test(text)) {
    return {
      category: 'counselor',
      title: 'Care & Counselor Update',
      Icon: AssignmentIndRoundedIcon,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      borderColor: '#ddd6fe'
    };
  }
  if (/feedback|completed|review/i.test(text)) {
    return {
      category: 'feedback',
      title: 'Session & Feedback',
      Icon: RateReviewRoundedIcon,
      color: '#059669',
      bgColor: '#ecfdf5',
      borderColor: '#a7f3d0'
    };
  }
  if (/deactivated|reactivated|welcome|account|registered/i.test(text)) {
    return {
      category: 'account',
      title: 'Account Notice',
      Icon: ShieldOutlinedIcon,
      color: '#0891b2',
      bgColor: '#ecfeff',
      borderColor: '#99f6e4'
    };
  }
  return {
    category: 'system',
    title: 'System Notification',
    Icon: InfoOutlinedIcon,
    color: '#475569',
    bgColor: '#f1f5f9',
    borderColor: '#cbd5e1'
  };
};

export default function NotificationCenter({
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
  loading = false,
  error = null,
  onRefresh,
  currentUser = null
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleItemClick = (notif) => {
    if (!notif.read && onMarkRead) {
      onMarkRead(notif.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notif);
    } else {
      const msg = (notif.message || '').toLowerCase();
      if (currentUser?.role === 'admin') {
        if (msg.includes('registration') || msg.includes('counselor') || msg.includes('assigned')) {
          navigate('/admin');
          handleClose();
        }
      } else if (currentUser?.role === 'counselor') {
        if (msg.includes('session') || msg.includes('appointment') || msg.includes('booking')) {
          navigate('/counselor-dashboard');
          handleClose();
        }
      } else {
        if (msg.includes('session') || msg.includes('appointment') || msg.includes('booking')) {
          navigate('/dashboard');
          handleClose();
        }
      }
    }
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Tooltip title="Notifications" arrow>
        <IconButton
          aria-describedby={id}
          aria-label="Notifications"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={handleOpen}
          sx={{
            color: open ? '#4f46e5' : '#475569',
            bgcolor: open ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
            borderRadius: '12px',
            p: 1.1,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: 'rgba(79, 70, 229, 0.08)',
              color: '#4f46e5',
              transform: 'scale(1.04)'
            },
            '&:active': {
              transform: 'scale(0.96)'
            }
          }}
        >
          <Badge
            badgeContent={unreadCount}
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.7rem',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                borderRadius: '9px',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)',
                animation: unreadCount > 0 ? 'notifPulse 2.5s infinite ease-in-out' : 'none',
                '@keyframes notifPulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.08)' },
                  '100%': { transform: 'scale(1)' }
                }
              }
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ fontSize: 23 }} />
            ) : (
              <NotificationsNoneRoundedIcon sx={{ fontSize: 23 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'calc(100vw - 32px)', sm: 400 },
              maxWidth: 420,
              maxHeight: 'min(580px, calc(100vh - 100px))',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 20px 35px -8px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.06)',
              overflow: 'hidden',
              mt: 1.5,
              animation: 'popoverEntrance 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              '@keyframes popoverEntrance': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(-8px) scale(0.98)'
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0) scale(1)'
                }
              },
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none'
              }
            }
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2.25,
            pb: 1.5,
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.08rem',
                  color: '#0f172a',
                  letterSpacing: '-0.2px'
                }}
              >
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} new`}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(79, 70, 229, 0.1)',
                    color: '#4f46e5',
                    borderRadius: '10px'
                  }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {unreadCount > 0 && onMarkAllRead && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<DoneAllRoundedIcon sx={{ fontSize: '15px !important' }} />}
                  onClick={onMarkAllRead}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#4f46e5',
                    borderRadius: '8px',
                    px: 1,
                    py: 0.4,
                    '&:hover': {
                      bgcolor: 'rgba(79, 70, 229, 0.08)'
                    }
                  }}
                >
                  Mark all as read
                </Button>
              )}
              <IconButton
                size="small"
                onClick={handleClose}
                aria-label="Close notifications"
                sx={{
                  color: '#94a3b8',
                  p: 0.5,
                  borderRadius: '8px',
                  '&:hover': {
                    color: '#475569',
                    bgcolor: '#f1f5f9'
                  }
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>



          {/* Filter Pills */}
          <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
            <Button
              size="small"
              onClick={() => setFilter('all')}
              sx={{
                py: 0.4,
                px: 1.5,
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 'unset',
                bgcolor: filter === 'all' ? '#0f172a' : '#f1f5f9',
                color: filter === 'all' ? '#ffffff' : '#64748b',
                '&:hover': {
                  bgcolor: filter === 'all' ? '#1e293b' : '#e2e8f0'
                }
              }}
            >
              All ({notifications.length})
            </Button>
            <Button
              size="small"
              onClick={() => setFilter('unread')}
              sx={{
                py: 0.4,
                px: 1.5,
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 'unset',
                bgcolor: filter === 'unread' ? '#4f46e5' : '#f1f5f9',
                color: filter === 'unread' ? '#ffffff' : '#64748b',
                '&:hover': {
                  bgcolor: filter === 'unread' ? '#4338ca' : '#e2e8f0'
                }
              }}
            >
              Unread ({unreadCount})
            </Button>
          </Box>
        </Box>

        {/* Scrollable Notification List */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: 380,
            p: 1.2,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.8,
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '6px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#cbd5e1',
              borderRadius: '6px'
            }
          }}
        >
          {loading && notifications.length === 0 && (
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[1, 2, 3].map((item) => (
                <Box key={item} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, borderRadius: '14px', bgcolor: '#f8fafc' }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="95%" height={16} />
                    <Skeleton variant="text" width="40%" height={14} sx={{ mt: 0.8 }} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {error && !loading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 600, mb: 1 }}>
                Unable to load notifications
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {error}
              </Typography>
              {onRefresh && (
                <Button size="small" variant="outlined" onClick={onRefresh} startIcon={<RefreshRoundedIcon />}>
                  Retry
                </Button>
              )}
            </Box>
          )}

          {!loading && !error && filteredNotifications.length === 0 && (
            <Box
              sx={{
                py: 5,
                px: 3,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  bgcolor: 'rgba(79, 70, 229, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.8,
                  color: 'primary.main',
                  boxShadow: '0 0 0 8px rgba(79, 70, 229, 0.03)'
                }}
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 32, color: '#10b981' }} />
              </Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: '0.98rem',
                  mb: 0.5
                }}
              >
                {filter === 'unread' ? 'No unread notifications' : "You're all caught up!"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  fontSize: '0.82rem',
                  maxWidth: 280,
                  lineHeight: 1.45
                }}
              >
                {filter === 'unread'
                  ? 'All your notifications have been marked as read.'
                  : 'No notifications right now. Check back later for appointment and schedule updates.'}
              </Typography>
              {filter === 'unread' && notifications.length > 0 && (
                <Button
                  size="small"
                  onClick={() => setFilter('all')}
                  sx={{
                    mt: 2,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#4f46e5'
                  }}
                >
                  View all notifications ({notifications.length})
                </Button>
              )}
            </Box>
          )}

          {!loading &&
            filteredNotifications.map((notif) => {
              const meta = getNotificationMeta(notif.message);
              const { Icon, color, bgColor, borderColor, title } = meta;
              const isUnread = !notif.read;

              return (
                <Box
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(notif);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    p: 1.5,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    bgcolor: isUnread ? 'rgba(79, 70, 229, 0.035)' : '#ffffff',
                    border: '1px solid',
                    borderColor: isUnread ? 'rgba(99, 102, 241, 0.2)' : '#f1f5f9',
                    borderLeft: isUnread ? '3.5px solid #4f46e5' : '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.4,
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: isUnread ? 'rgba(79, 70, 229, 0.07)' : '#f8fafc',
                      borderColor: isUnread ? 'rgba(99, 102, 241, 0.35)' : '#e2e8f0',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                      '& .mark-read-btn': {
                        opacity: 1
                      }
                    },
                    '&:focus-visible': {
                      outline: '2px solid #4f46e5',
                      outlineOffset: '2px'
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '11px',
                      bgcolor: bgColor,
                      border: '1px solid ' + borderColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: color,
                      mt: 0.2
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.35 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: isUnread ? '#1e1b4b' : '#334155',
                          letterSpacing: '-0.1px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {title}
                      </Typography>

                      <Tooltip title={new Date(notif.date).toLocaleString()} arrow placement="top">
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatRelativeTime(notif.date)}
                        </Typography>
                      </Tooltip>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        color: isUnread ? '#0f172a' : '#475569',
                        fontWeight: isUnread ? 600 : 400,
                        fontSize: '0.84rem',
                        lineHeight: 1.42,
                        wordBreak: 'break-word'
                      }}
                    >
                      {notif.message}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.3 }}>
                    {isUnread && (
                      <Tooltip title="Unread" arrow>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: '#4f46e5',
                            boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.25)'
                          }}
                        />
                      </Tooltip>
                    )}

                    {isUnread && onMarkRead && (
                      <Tooltip title="Mark as read" arrow>
                        <IconButton
                          className="mark-read-btn"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notif.id);
                          }}
                          aria-label="Mark as read"
                          sx={{
                            opacity: { xs: 1, sm: 0 },
                            p: 0.4,
                            color: '#64748b',
                            borderRadius: '6px',
                            transition: 'opacity 0.15s ease',
                            '&:hover': {
                              bgcolor: 'rgba(79, 70, 229, 0.1)',
                              color: '#4f46e5'
                            }
                          }}
                        >
                          <MarkEmailReadRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })}
        </Box>

        {notifications.length > 0 && (
          <Box
            sx={{
              px: 2.25,
              py: 1.25,
              bgcolor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.74rem' }}>
              Showing {filteredNotifications.length} of {notifications.length} notification{notifications.length === 1 ? '' : 's'}
            </Typography>

            {/* {currentUser && (
              <Typography
                component="button"
                onClick={() => {
                  const target = currentUser.role === 'admin' ? '/admin' : '/dashboard';
                  navigate(target);
                  handleClose();
                }}
                sx={{
                  border: 'none',
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  color: '#4f46e5',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  p: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Go to Dashboard <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
              </Typography>
            )} */}
          </Box>
        )}
      </Popover>
    </Box>
  );
}
