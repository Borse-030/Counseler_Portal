import { useEffect, useState } from 'react';

// Update time-dependent views without polling the API or writing session statuses.
export default function useSessionClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return now;
}
