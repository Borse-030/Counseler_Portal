import fs from 'node:fs';
const edit = (path, fn) => fs.writeFileSync(path, fn(fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n')));
const cut = (s, start, end, replacement = '') => { const a = s.indexOf(start), b = s.indexOf(end, a); if (a < 0 || b < 0) throw new Error(`Missing ${start}`); return s.slice(0, a) + replacement + s.slice(b); };
edit('src/pages/CounselorDashboard.jsx', s => {
  s = "import CareWorkflow from '../components/CareWorkflow';\n" + s;
  s = cut(s, '  const [decisionRequest,', '  const fetchCounselorData');
  s = cut(s, '  useEffect(() => {\n    if (!scheduleRequest', '  useEffect(() => {\n    if (currentUser)');
  s = cut(s, '  const handleAcceptCareRequest', '  // Calculations');
  s = cut(s, '  const visibleCareRequests', '  const totalEarnings');
  s = cut(s, '              <Box id="care-requests"', '              {/* Upcoming Appointments */}', `              <Box id="care-requests" sx={{ scrollMarginTop: 96 }}>
                <CareWorkflow currentUser={currentUser} filter={requestTab} onAppointmentsChange={setAppointments} onRequestsChange={setCareRequests} />
              </Box>

`);
  s = cut(s, '      {/* TAB 2: EARNINGS', '      {/* CLINICAL SESSION NOTES MODAL */}');
  s = s.replace("const [counselors, setCounselors] = useState([]);", '');
  s = s.replace('const [apts, requests, availableCounselors]', 'const [apts, requests]');
  s = s.replace('        api.getCounselors(),\n', '').replace('      setCounselors(availableCounselors);\n', '');
  s = s.replace("request.assignedCounselorId === currentUser.id && request.status === 'assigned'", "['submitted', 'assigned'].includes(request.status)");
  s = s.replace('Approved patients', 'Approved users').replaceAll('Patient Workspace', 'User workspace').replaceAll('Patient management', 'User management');
  s = s.replace('102 Medical Wellness Center, Suite 300, California', 'Location to be confirmed by the BJS care team');
  return s;
});
edit('src/pages/AdminDashboard.jsx', s => {
  s = "import CareWorkflow from '../components/CareWorkflow';\n" + s;
  s = s.replace('useState(0)', 'useState(3)');
  s = cut(s, '  const [assignmentOpen,', '  const handleCreateUser');
  s = cut(s, '  const handleOpenAssignment', '  useEffect(() => {\n    if (currentUser)');
  s = cut(s, '  // Reset database', '  // Filtering calculations');
  s = s.replace(/  const approvedCounselors = .*\n/, '').replace(/  const activeCareRequests = .*\n/, '');
  s = cut(s, '      {activeTab === 3 && (', '      {/* Create User/Counselor Dialog Modal */}', `      {activeTab === 3 && <CareWorkflow currentUser={currentUser} onAppointmentsChange={setAppointments} onRequestsChange={setCareRequests} />}

`);
  s = s.replace(/          <Button \n            variant="outlined"\n            color="warning"[\s\S]*?<\/Button>\n/, '');
  s = s.replace('System Governance Platform', 'BJS administration').replace('Approve credentials, monitor transactions ledger, and suspension logs.', 'Review registrations and session proposals, manage counselors, and follow care progress.');
  s = s.replace('Booking Ledger', 'Session register').replace('Pending Approvals (', 'Counselor verification (');
  const a = s.indexOf('      {/* TAB 2:');
  const b = s.indexOf('      {activeTab === 3', a);
  if (a >= 0 && b >= 0) s = s.slice(0, a) + `      {activeTab === 2 && <TableContainer component={Paper}><Table><TableHead><TableRow>
        {['User', 'Counselor', 'Session', 'Date (IST)', 'Status', 'Feedback'].map(title => <TableCell key={title}>{title}</TableCell>)}
        </TableRow></TableHead><TableBody>{appointments.map(appointment => <TableRow key={appointment.id}>
          <TableCell>{appointment.patientName}</TableCell><TableCell>{appointment.counselorName}</TableCell>
          <TableCell>{appointment.appointmentKind?.replaceAll('_', ' ') || 'Session'}</TableCell>
          <TableCell>{appointment.date} {appointment.time}</TableCell><TableCell>{appointment.status.replaceAll('_', ' ')}</TableCell>
          <TableCell>{appointment.review?.rating ? \`\${appointment.review.rating}/5 — \${appointment.review.reviewText || ''}\` : 'Not received'}</TableCell>
        </TableRow>)}</TableBody></Table></TableContainer>}

` + s.slice(b);
  s = s.replace("  const [transactions, setTransactions] = useState([]);\n", '').replace("      const txs = await api.getAdminTransactions();\n      setTransactions(txs);\n", '');
  return s;
});
edit('src/pages/PatientDashboard.jsx', s => {
  s = cut(s, 'const createDemoAppointments', 'export default function PatientDashboard');
  s = cut(s, '      const useDemoData', '    } catch (err)', `      setAppointments(apts);
      setSessionRequests(requests);
      setTransactions(apts.filter(apt => ['upcoming', 'completed'].includes(apt.status)).map(apt => ({
        id: apt.id, appointmentId: apt.id, counselorName: apt.counselorName, date: apt.date,
        status: apt.status, paymentMethod: 'BJS internal care', amount: 0,
      })));
`);
  s = s.replace('Returned for reassignment', 'Registration rejected').replace('The care team is finding another counselor', 'Registration was rejected — contact the BJS care team');
  s = s.replaceAll('Write review', 'Share feedback').replaceAll('Write Review', 'Share feedback');
  s = s.replace("a.status === 'completed' || a.status === 'cancelled'", "['completed', 'cancelled', 'rejected'].includes(a.status)");
  // Surface proposed sessions without presenting them as confirmed appointments.
  s = s.replace('      {activeTab === 0 && (', `      {appointments.some(apt => apt.status === 'pending_admin') && <Alert severity="info" sx={{ mb: 2 }}>
        {appointments.filter(apt => apt.status === 'pending_admin').length} proposed session(s) are awaiting BJS admin review. They are not confirmed yet.
      </Alert>}
      {activeTab === 0 && (`);
  s = s.replace('Your completed and cancelled sessions', 'Your completed, cancelled and rejected sessions');
  return s;
});
// BJS identity in user-facing source; never invent a real delivery domain.
const walk = path => fs.readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
for (const path of [...walk('src'), 'index.html', ...walk('.bjs-workflow/backend')]) {
  if (!/\.(jsx?|json|html|mjs)$/.test(path)) continue;
  edit(path, s => s.replaceAll('MindEase Wellness Center', 'BJS counseling center').replaceAll('MindEase', 'BJS').replaceAll('@mindease.com', '@users.bjs.invalid').replaceAll('mindease-backend', 'bjs-backend').replaceAll('mindease-dev-jwt-secret-change-me', 'bjs-dev-jwt-secret-change-me'));
}
