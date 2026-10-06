import fs from 'node:fs';
const path = '.bjs-workflow/backend/controllers/counselorController.js';
let s = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
s = "import { validateSchedule, toMinutes } from '../utils/scheduling.js';\n" + s;
s = s.replace("let query = { role: 'counselor', approved: true };", "let query = { role: 'counselor', approved: true, suspended: { $ne: true } };");
s = s.replace('let counselors = await User.find(query);', "let counselors = await User.find(query).select('id name specialty bio credentials experience languages avatar rating reviewCount');");
const start = s.indexOf('export const getSlots =');
s = s.slice(0, start) + `export const getSlots = async (req, res) => {
  const { date } = req.query;
  const duration = Number(req.query.duration || 60);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date || '') || !Number.isInteger(duration) || duration < 10 || duration > 180) {
    return res.status(400).json({ message: 'A valid date and duration are required.' });
  }
  try {
    const counselorId = req.params.id;
    const availability = await Availability.findOne({ counselorId }) || { workingDays: [1, 2, 3, 4, 5], startHour: '09:00', endHour: '17:00', slotDuration: 60 };
    const dayIndex = new Date(\`\${date}T00:00:00Z\`).getUTCDay();
    const config = availability.daysConfig?.find(day => day.dayIndex === dayIndex);
    if (!(config ? config.active : availability.workingDays.includes(dayIndex))) return res.json({ date, slots: [], message: 'Counselor does not work on this day.' });
    const intervals = config?.active && config.slots?.length ? config.slots : [availability];
    const step = Math.max(5, Number(availability.slotDuration) || 60);
    const times = new Set();
    for (const interval of intervals) {
      if (!interval.startHour || !interval.endHour) continue;
      for (let start = toMinutes(interval.startHour); start + duration <= toMinutes(interval.endHour); start += step) {
        times.add(\`\${String(Math.floor(start / 60)).padStart(2, '0')}:\${String(start % 60).padStart(2, '0')}\`);
      }
    }
    const slots = await Promise.all([...times].sort().map(async time => ({ time, available: !(await validateSchedule(counselorId, date, time, duration)) })));
    res.json({ date, slots, message: slots.some(slot => slot.available) ? '' : 'No availability for this date and duration.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
`;
fs.writeFileSync(path, s);
