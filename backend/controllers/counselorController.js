import { validateSchedule } from '../utils/scheduling.js';
import { appointmentMode, dayIntervals, modesAtTime, toMinutes, validDate, validateDayConfigs } from '../utils/availabilityModes.js';
import { User, Availability, Appointment, AppointmentType, Exception, AuditLog } from '../models/index.js';

const logAction = async (userId, action, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const log = new AuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      action,
      timestamp: new Date(),
      ipAddress: ipAddress.replace('::ffff:', '')
    });
    await log.save();
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

export const getCounselors = async (req, res) => {
  const { specialty, maxPrice, minRating, search, language, gender, experience, onlineOffline } = req.query;

  try {
    let query = { role: 'counselor', approved: true };

    if (specialty && specialty !== 'All Specialties') {
      query.specialty = { $regex: specialty, $options: 'i' };
    }

    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    if (language) {
      query.languages = { $regex: language, $options: 'i' };
    }

    if (gender) {
      query.gender = gender;
    }

    if (experience) {
      query.experience = { $gte: Number(experience) };
    }

    if (search) {
      const regexSearch = { $regex: search, $options: 'i' };
      query.$or = [
        { name: regexSearch },
        { bio: regexSearch },
        { specialty: regexSearch }
      ];
    }

    let counselors = await User.find(query);

    if (onlineOffline) {
      const appTypes = await AppointmentType.find({});
      counselors = counselors.filter(c => {
        const counselorTypes = appTypes.filter(t => t.counselorId === c.id);
        if (onlineOffline === 'online') {
          return counselorTypes.some(t => ['Video Consultation', 'Audio Consultation', 'Chat Consultation'].includes(t.name));
        } else if (onlineOffline === 'offline') {
          return counselorTypes.some(t => t.name === 'In-Person Consultation');
        }
        return true;
      });
    }

    res.json(counselors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCounselorById = async (req, res) => {
  try {
    const counselor = await User.findOne({ id: req.params.id, role: 'counselor' });

    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }

    const appointments = await Appointment.find({ counselorId: req.params.id, review: { $ne: null } });
    const reviews = appointments.map(apt => ({
      patientName: apt.patientName,
      rating: apt.review.rating,
      reviewText: apt.review.reviewText,
      date: apt.review.date
    }));

    res.json({
      ...counselor.toObject(),
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAppointmentTypes = async (req, res) => {
  try {
    const counselorTypes = await AppointmentType.find({ counselorId: req.params.id });
    res.json(counselorTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointmentTypes = async (req, res) => {
  const { types } = req.body;
  if (!types || !Array.isArray(types)) {
    return res.status(400).json({ message: 'Types array is required' });
  }

  try {
    await AppointmentType.deleteMany({ counselorId: req.userId });

    const newTypes = types.map((t, idx) => ({
      id: `${req.userId}_type_${idx}_${Date.now()}`,
      counselorId: req.userId,
      name: t.name,
      duration: Number(t.duration) || 60,
      price: Number(t.price) || 0,
      bufferTime: Number(t.bufferTime) || 15,
      description: t.description || ''
    }));

    await AppointmentType.insertMany(newTypes);
    await logAction(req.userId, 'Updated custom appointment types config', req);
    res.json({ message: 'Appointment types updated successfully', types: newTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExceptions = async (req, res) => {
  try {
    const counselorExceptions = await Exception.find({ counselorId: req.params.id });
    res.json(counselorExceptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addException = async (req, res) => {
  const { date, reason } = req.body;
  if (!date) {
    return res.status(400).json({ message: 'Exception date is required' });
  }

  try {
    const newEx = new Exception({
      id: `ex_${Date.now()}`,
      counselorId: req.userId,
      date,
      reason: reason || 'Personal Leave'
    });

    await newEx.save();
    await logAction(req.userId, `Created vacation leave exception for date ${date}`, req);
    res.status(201).json({ message: 'Exception added successfully', exception: newEx });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteException = async (req, res) => {
  try {
    const exists = await Exception.findOneAndDelete({ id: req.params.id, counselorId: req.userId });
    if (!exists) {
      return res.status(404).json({ message: 'Leave exception not found' });
    }

    await logAction(req.userId, `Removed vacation leave exception`, req);
    res.json({ message: 'Leave exception removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAvailability = async (req, res) => {
  try {
    const availability = await Availability.findOne({ counselorId: req.params.id }) || {
      counselorId: req.params.id,
      workingDays: [1, 2, 3, 4, 5],
      startHour: '09:00',
      endHour: '17:00',
      daysConfig: []
    };
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAvailability = async (req, res) => {
  const { workingDays, startHour, endHour, daysConfig } = req.body;

  const configError = daysConfig === undefined ? '' : validateDayConfigs(daysConfig);
  if (configError) return res.status(400).json({ message: configError });
  const normalizedDays = daysConfig?.map(day => ({ dayIndex: day.dayIndex, active: day.active, slots: day.slots.map(slot => ({ startHour: slot.startHour, endHour: slot.endHour, mode: slot.mode })) }));

  try {
    const updatedAvailability = await Availability.findOneAndUpdate(
      { counselorId: req.userId },
      {
        workingDays: normalizedDays ? normalizedDays.filter(day => day.active).map(day => day.dayIndex) : workingDays || [1, 2, 3, 4, 5],
        startHour: startHour || '09:00',
        endHour: endHour || '17:00',
        daysConfig: normalizedDays || []
      },
      { new: true, upsert: true, runValidators: true }
    );

    await logAction(req.userId, 'Updated weekly working schedule config', req);
    res.json({ message: 'Availability updated successfully', availability: updatedAvailability });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSlots = async (req, res) => {
  const { date, appointmentType = '' } = req.query;
  const duration = Number(req.query.duration || 60);
  if (!validDate(date) || !Number.isInteger(duration) || duration < 10 || duration > 180) return res.status(400).json({ message: 'Choose a valid date and a duration from 10 to 180 minutes.' });
  try {
    const counselorId = req.params.id;
    const availability = await Availability.findOne({ counselorId }) || { workingDays: [1, 2, 3, 4, 5], startHour: '09:00', endHour: '17:00' };
    const intervals = dayIntervals(availability, date);
    const step = duration;
    const times = new Set();
    for (const interval of intervals) {
      for (let start = toMinutes(interval.startHour); start + duration <= toMinutes(interval.endHour); start += step) {
        const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
        const modes = modesAtTime(intervals, time, duration, step);
        if (modes.length && (!appointmentType || modes.includes(appointmentMode(appointmentType)))) times.add(time);
      }
    }
    const slots = await Promise.all([...times].sort().map(async time => {
      const reason = await validateSchedule(counselorId, date, time, duration, '', '', appointmentType);
      return { time, modes: modesAtTime(intervals, time, duration, step), available: !reason, reason };
    }));
    let message = '';
    if (!slots.some(slot => slot.available)) {
      if (slots.length) message = [...new Set(slots.map(slot => slot.reason).filter(Boolean))].join(' ');
      else if (!intervals.length) message = 'The counselor does not work on this day.';
      else if (!intervals.some(interval => ['online', 'offline'].includes(interval.mode))) message = 'The counselor needs to choose online or offline for this day in their availability settings.';
      else if (appointmentType && !intervals.some(interval => interval.mode === appointmentMode(appointmentType))) message = 'The counselor has no ' + appointmentMode(appointmentType) + ' availability on this date.';
      else message = 'A ' + duration + '-minute session must fit completely within an availability block. Choose a shorter duration or another date.';
    }
    res.json({ date, slots, message });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
