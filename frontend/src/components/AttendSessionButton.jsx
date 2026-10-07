import { Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { attendanceLink } from '../utils/sessionAttendance';

export default function AttendSessionButton({ appointment, ...props }) {
  const link = attendanceLink(appointment);
  return <Button {...props} {...(link
    ? { component: 'a', href: link, target: '_blank', rel: 'noopener noreferrer' }
    : { component: Link, to: `/session/${appointment.id}` })}>Attend session</Button>;
}
