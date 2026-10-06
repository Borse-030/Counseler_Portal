import { User, Availability, Appointment, AppointmentType, Exception, BookingLimit, AuditLog } from '../models/index.js';

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

export const getBookingLimits = async (req, res) => {
  try {
    const counselorLimit = await BookingLimit.findOne({ counselorId: req.params.id }) || {
      counselorId: req.params.id,
      maxAppointmentsPerDay: 5,
      minNoticePeriodHours: 2,
      maxAdvanceBookingDays: 30
    };
    res.json(counselorLimit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBookingLimits = async (req, res) => {
  const { maxAppointmentsPerDay, minNoticePeriodHours, maxAdvanceBookingDays } = req.body;

  try {
    const updatedLimit = await BookingLimit.findOneAndUpdate(
      { counselorId: req.userId },
      {
        maxAppointmentsPerDay: Number(maxAppointmentsPerDay) || 5,
        minNoticePeriodHours: Number(minNoticePeriodHours) || 2,
        maxAdvanceBookingDays: Number(maxAdvanceBookingDays) || 30
      },
      { new: true, upsert: true }
    );

    await logAction(req.userId, 'Updated booking buffers and limits config', req);
    res.json({ message: 'Booking limits updated successfully', limits: updatedLimit });
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
      slotDuration: 60,
      daysConfig: []
    };
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAvailability = async (req, res) => {
  const { workingDays, startHour, endHour, slotDuration, daysConfig } = req.body;

  try {
    const updatedAvailability = await Availability.findOneAndUpdate(
      { counselorId: req.userId },
      {
        workingDays: workingDays || [1, 2, 3, 4, 5],
        startHour: startHour || '09:00',
        endHour: endHour || '17:00',
        slotDuration: Number(slotDuration) || 60,
        daysConfig: daysConfig || []
      },
      { new: true, upsert: true }
    );

    await logAction(req.userId, 'Updated weekly working schedule config', req);
    res.json({ message: 'Availability updated successfully', availability: updatedAvailability });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSlots = async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'Date query parameter is required (YYYY-MM-DD)' });
  }

  const counselorId = req.params.id;

  try {
    const limits = await BookingLimit.findOne({ counselorId }) || {
      counselorId,
      maxAppointmentsPerDay: 5,
      minNoticePeriodHours: 2,
      maxAdvanceBookingDays: 30
    };

    const exceptions = await Exception.find({ counselorId });
    const availability = await Availability.findOne({ counselorId }) || {
      counselorId,
      workingDays: [1, 2, 3, 4, 5],
      startHour: '09:00',
      endHour: '17:00',
      slotDuration: 60
    };

    const isException = exceptions.some(ex => ex.date === date);
    if (isException) {
      return res.json({ date, slots: [], message: 'Counselor is on leave or vacation today.' });
    }

    const queryDate = new Date(date);
    const dayOfWeek = queryDate.getDay();

    const dayConfig = availability.daysConfig && availability.daysConfig.find(d => d.dayIndex === dayOfWeek);

    let isWorkingDay = false;
    let timeIntervals = [];

    if (dayConfig) {
      isWorkingDay = dayConfig.active;
      if (isWorkingDay && dayConfig.slots) {
        timeIntervals = dayConfig.slots;
      }
    } else {
      isWorkingDay = availability.workingDays.includes(dayOfWeek);
      if (isWorkingDay) {
        timeIntervals = [{ startHour: availability.startHour, endHour: availability.endHour }];
      }
    }

    if (!isWorkingDay) {
      return res.json({ date, slots: [], message: 'Counselor does not work on this day.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (queryDate < today) {
      return res.json({ date, slots: [], message: 'Cannot book in the past.' });
    }

    const maxAdvance = new Date();
    maxAdvance.setDate(maxAdvance.getDate() + limits.maxAdvanceBookingDays);
    if (queryDate > maxAdvance) {
      return res.json({ date, slots: [], message: `Cannot book more than ${limits.maxAdvanceBookingDays} days in advance.` });
    }

    const appointments = await Appointment.find({
      counselorId,
      date: date,
      status: { $in: ['upcoming', 'completed'] }
    });

    if (appointments.length >= limits.maxAppointmentsPerDay) {
      return res.json({ date, slots: [], message: 'Counselor daily appointment limit reached.' });
    }

    const slots = [];
    const duration = availability.slotDuration || 60;
    const now = new Date();

    for (const interval of timeIntervals) {
      if (!interval.startHour || !interval.endHour) continue;
      const [startH, startM] = interval.startHour.split(':').map(Number);
      const [endH, endM] = interval.endHour.split(':').map(Number);

      let current = new Date();
      current.setHours(startH, startM, 0, 0);

      const end = new Date();
      end.setHours(endH, endM, 0, 0);

      while (current < end) {
        const hh = String(current.getHours()).padStart(2, '0');
        const mm = String(current.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;

        let isPastSlot = false;

        if (queryDate.toDateString() === now.toDateString()) {
          const slotTime = new Date();
          slotTime.setHours(current.getHours(), current.getMinutes(), 0, 0);

          const noticeDeadline = new Date();
          noticeDeadline.setHours(now.getHours() + limits.minNoticePeriodHours, now.getMinutes(), 0, 0);

          if (slotTime <= noticeDeadline) {
            isPastSlot = true;
          }
        }

        const isBooked = appointments.some(apt => apt.time === timeStr);

        if (!slots.some(s => s.time === timeStr)) {
          slots.push({
            time: timeStr,
            available: !isBooked && !isPastSlot
          });
        }

        current.setMinutes(current.getMinutes() + duration);
      }
    }

    slots.sort((a, b) => a.time.localeCompare(b.time));

    res.json({ date, slots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
