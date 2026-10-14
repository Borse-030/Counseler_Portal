import { User, Transaction, Appointment, Availability, AppointmentType } from '../models/index.js';
import { db } from '../db.js';
import { sendNotification } from '../utils/notificationService.js';
import { accountStatusNotification } from '../utils/notificationService.js';
import { CareRequest } from '../models/index.js';
import { reviewCounselorDeactivation, checkCounselorTransfers, transferAndDeactivateCounselor } from '../utils/counselorDeactivationService.js';

const transferResponse = (res, error) => res.status(error.status || 500).json({ message: error.message || 'Unable to transfer pending work.', ...error.details });
export const getCounselorDeactivationReview = async (req, res) => {
  try { res.json(await reviewCounselorDeactivation(req.params.id)); } catch (error) { transferResponse(res, error); }
};
export const checkCounselorDeactivationTransfers = async (req, res) => {
  try { res.json(await checkCounselorTransfers(req.params.id, req.body)); } catch (error) { transferResponse(res, error); }
};
export const deactivateCounselorWithTransfers = async (req, res) => {
  try {
    const actor = await User.findOne({ id: req.userId, role: 'admin', suspended: { $ne: true } });
    if (!actor) return res.status(403).json({ message: 'Active admin access required.' });
    res.json(await transferAndDeactivateCounselor(req.params.id, req.body, actor));
  } catch (error) { transferResponse(res, error); }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const formatted = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      mobile: u.mobile,
      gender: u.gender,
      dob: u.dob,
      state: u.state,
      city: u.city,
      preferredLanguage: u.preferredLanguage,
      counselingRequirements: u.counselingRequirements,
      role: u.role,
      createdAt: u.createdAt,
      specialty: u.specialty,
      price: u.price,
      approved: u.approved,
      credentials: u.credentials,
      suspended: u.suspended || false
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  const { approved, suspended } = req.body;
  if ((approved !== undefined && typeof approved !== 'boolean') || (suspended !== undefined && typeof suspended !== 'boolean')) return res.status(400).json({ message: 'Account status values must be true or false.' });
  try {
    const user = await User.findOne({ id: req.params.id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'counselor' && suspended === true) {
      const [pending, activeCases] = await Promise.all([
        Appointment.exists({ counselorId: user.id, status: { $in: ['upcoming', 'pending_admin'] } }),
        CareRequest.exists({ status: { $nin: ['closed', 'completed', 'rejected'] }, $or: [{ finalCounselorId: user.id }, { assignedCounselorId: user.id }] }),
      ]);
      if (pending || activeCases) return res.status(409).json({ message: 'Review and transfer pending sessions and active cases before deactivating this counselor.' });
    }

    if (approved !== undefined) {
      user.approved = approved;
    }

    let statusNotification = null;
    if (suspended !== undefined) {
      if (user.id === req.userId) {
        return res.status(400).json({ message: 'Cannot suspend your own admin account.' });
      }
      const changed = Boolean(user.suspended) !== Boolean(suspended);
      user.suspended = suspended;
      if (changed) {
        statusNotification = accountStatusNotification(suspended);
      }
    }

    await user.save();
    if (statusNotification) {
      await sendNotification(user.id, statusNotification.message, {
        user,
        subject: statusNotification.subject
      });
    }

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({});
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const counselorsCount = await User.countDocuments({ role: 'counselor' });
    const patientsCount = await User.countDocuments({ role: { $in: ['patient', 'user'] } });
    const activeBookingsCount = await Appointment.countDocuments({ status: 'upcoming' });
    const completedBookingsCount = await Appointment.countDocuments({ status: 'completed' });
    const totalBookingsCount = await Appointment.countDocuments({});

    res.json({
      counselorsCount,
      patientsCount,
      activeBookingsCount,
      completedBookingsCount,
      totalBookingsCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  let {
    email, name, role,
    mobile, gender, dob,
    specialty, bio, credentials, experience, registrationNumber, certificates, languages
  } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required for OTP-based logins.' });
  }

  if (!email) {
    email = `${mobile.replace(/\D/g, '') || Date.now()}@mindease.com`;
  }

  try {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.status(400).json({ message: 'Mobile number already registered.' });
    }

    const userId = `${role}_${Date.now()}`;
    const newUser = new User({
      id: userId,
      email,
      password: '',
      name,
      role,
      mobile: mobile || '',
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date()
    });

    if (role === 'patient' || role === 'user') {
      newUser.gender = gender || 'unspecified';
      newUser.dob = dob || '';
    }

    if (role === 'counselor') {
      newUser.specialty = specialty || 'General Therapy';
      newUser.price = 0;
      newUser.bio = bio || '';
      newUser.approved = true;
      newUser.credentials = credentials || '';
      newUser.rating = 5.0;
      newUser.reviewCount = 0;
      newUser.experience = Number(experience) || 1;
      newUser.registrationNumber = registrationNumber || '';
      newUser.certificates = certificates || '';
      newUser.languages = Array.isArray(languages) ? languages : (languages ? languages.split(',').map(l => l.trim()) : ['English']);

      const newAvail = new Availability({
        counselorId: userId,
        workingDays: [1, 2, 3, 4, 5],
        startHour: '09:00',
        endHour: '17:00'
      });
      await newAvail.save();

      await AppointmentType.insertMany([
        { id: `${userId}_Video`, counselorId: userId, name: 'Video Consultation', duration: 60, price: 0, bufferTime: 15, description: 'Direct face-to-face video therapy.' },
        { id: `${userId}_Audio`, counselorId: userId, name: 'Audio Consultation', duration: 45, price: 0, bufferTime: 15, description: 'Private phone-call consultation.' },
        { id: `${userId}_Chat`, counselorId: userId, name: 'Chat Consultation', duration: 30, price: 0, bufferTime: 10, description: 'Secure real-time texting session.' },
        { id: `${userId}_InPerson`, counselorId: userId, name: 'In-Person Consultation', duration: 60, price: 0, bufferTime: 30, description: 'In-office therapy session.' }
      ]);

    }

    await newUser.save();

    await sendNotification(userId, `Your account has been successfully created by the NGO administrator. Welcome to the platform!`);

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully.`,
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetDatabase = async (req, res) => {
  try {
    await db.reset();
    res.json({ message: 'Database cleared successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Database reset failed: ' + error.message });
  }
};
