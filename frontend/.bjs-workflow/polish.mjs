import fs from 'node:fs';
const edit = (path, fn) => fs.writeFileSync(path, fn(fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n')));
edit('src/components/CareWorkflow.jsx', s => s.replace('export const todayIST', 'const todayIST'));
edit('src/pages/AdminDashboard.jsx', s => s.replace("import RestartAltIcon from '@mui/icons-material/RestartAlt';\n", ''));
edit('src/pages/CounselorDashboard.jsx', s => {
  s = s.replace('FormGroup, ', '').replace(', Checkbox', '');
  s = s.replace(/const getTomorrowDate = \(\) => \{[\s\S]*?\n\};\n/, '');
  s = s.replace('const [workingDays, setWorkingDays]', 'const [, setWorkingDays]').replace('const [startHour, setStartHour]', 'const [, setStartHour]').replace('const [endHour, setEndHour]', 'const [, setEndHour]');
  s = s.replace('const [h, m] =', 'const [h] =');
  const a = s.indexOf('  const totalEarnings ='), b = s.indexOf('  if (loading)', a);
  if (a >= 0 && b >= 0) s = s.slice(0, a) + s.slice(b);
  return s;
});
edit('src/pages/PatientDashboard.jsx', s => s.replace('  }, [currentUser.id]);', '  }, []);'));
edit('src/App.jsx', s => {
  s = s.replace('CircularProgress, Tooltip,', 'CircularProgress,');
  s = s.replace(/import (DarkModeIcon|LightModeIcon)[^\n]+\n/g, '');
  s = s.replace('function AppContent({ themeMode, toggleTheme })', 'function AppContent()');
  s = s.replace(/  const \[(specialty|price|bio|credentials),[^\n]+\n/g, '');
  s = s.replace('      fetchNotifications();', '      Promise.resolve().then(fetchNotifications);');
  s = s.replace('      setNotifications([]);', '      Promise.resolve().then(() => setNotifications([]));');
  s = s.replace('  const [themeMode, setThemeMode]', '  const [themeMode]');
  s = s.replace(/  const toggleTheme = \(\) => \{[\s\S]*?\n  \};\n/, '');
  s = s.replace('<AppContent themeMode={themeMode} toggleTheme={toggleTheme} />', '<AppContent />');
  s = s.replace('              BJS\n', '              BJS Counseling\n');
  return s;
});
edit('index.html', s => s.replace('BJS - Professional Counselor Appointment Platform', 'BJS | Internal Counseling'));
const root = '.bjs-workflow/backend/';
edit(root + 'controllers/adminController.js', s => {
  s = "import { createAssignedCareRequest } from '../utils/careRequestService.js';\n" + s;
  s = s.replace('    await newUser.save();', `    await newUser.save();
    if (['patient', 'user'].includes(role)) {
      try { await createAssignedCareRequest(newUser); }
      catch (error) { await User.deleteOne({ id: userId }); throw error; }
    }`);
  return s.replace('NGO administrator', 'BJS administrator');
});
edit(root + 'controllers/sessionRequestController.js', s => {
  s = s.replace('    res.json(requests);', `    res.json(requests.map(request => {
      const data = request.toObject();
      if (patientRoles.includes(req.user.role)) delete data.discoveryNotes;
      return data;
    }));`);
  s = s.replace('    res.json(careRequest);', `    const data = careRequest.toObject();
    if (patientRoles.includes(req.user.role)) delete data.discoveryNotes;
    res.json(data);`);
  s = s.replace("    careRequest.discoveryNotes = notes.trim();", `    careRequest.discoveryNotes = notes.trim();
    if (careRequest.discoveryAppointmentId) await Appointment.updateOne({ id: careRequest.discoveryAppointmentId }, { $set: { sessionNotes: notes.trim() } });`);
  return s;
});
edit(root + 'controllers/appointmentController.js', s => {
  s = s.replace("      filtered = await Appointment.find({ counselorId: req.userId });", `      const cases = await CareRequest.find({ $or: [{ assignedCounselorId: req.userId }, { finalCounselorId: req.userId }] });
      filtered = await Appointment.find({ $or: [{ counselorId: req.userId }, { careRequestId: { $in: cases.map(item => item.id) } }] });`);
  s = s.replace("      if (!u || u.role !== 'admin') {\n        return res.status(403).json({ message: 'Forbidden access to session details' });", `      const relatedCase = u?.role === 'counselor' && apt.careRequestId
        ? await CareRequest.findOne({ id: apt.careRequestId, $or: [{ assignedCounselorId: u.id }, { finalCounselorId: u.id }] }) : null;
      if (!u || (u.role !== 'admin' && !relatedCase)) {
        return res.status(403).json({ message: 'Forbidden access to session details' });`);
  s = s.replace("    const data = apt.toObject();", `    const data = apt.toObject();
    if (apt.appointmentKind === 'discovery' && apt.careRequestId) {
      const care = await CareRequest.findOne({ id: apt.careRequestId });
      if (care) data.sessionNotes = care.discoveryNotes || data.sessionNotes;
    }`);
  return s;
});
