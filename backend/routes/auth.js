import express from 'express';
import { User, Availability, AppointmentType, BookingLimit, AuditLog } from '../db.js';

const router = express.Router();

const findUserByMobile = (mobile) => User.findOne({ mobile });

// Helper to log user actions in the audit trail
const logAction = async (userId, action, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const log = new AuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      action,
      timestamp: new Date(),
      ipAddress: ipAddress.replace('::ffff:', '') // format IPv4
    });
    await log.save();
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
    }

    await logAction(user.id, 'User login via Email + Password', req);

    const token = Buffer.from(user.id).toString('base64');
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        mobile: user.mobile,
        gender: user.gender,
        dob: user.dob,
        state: user.state,
        city: user.city,
        preferredLanguage: user.preferredLanguage,
        preferredCounselingMode: user.preferredCounselingMode,
        counselingRequirements: user.counselingRequirements,
        specialty: user.specialty,
        price: user.price,
        bio: user.bio,
        rating: user.rating,
        approved: user.approved,
        credentials: user.credentials,
        experience: user.experience,
        registrationNumber: user.registrationNumber,
        certificates: user.certificates,
        languages: user.languages
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { 
    otp, name, role, email,
    mobile, gender, dob, state, city, preferredLanguage, preferredCounselingMode, counselingRequirements,
    specialty, bio, credentials, experience, registrationNumber, certificates, languages
  } = req.body;
  
  if (!mobile || !otp) {
    return res.status(400).json({ message: 'Mobile number and OTP are required for registration.' });
  }

  if (otp !== '123456') {
    return res.status(400).json({ message: 'Invalid OTP code. Please use default "123456".' });
  }

  try {
    const existingUser = await findUserByMobile(mobile);
    if (existingUser) {
      return res.status(400).json({ message: 'Mobile number already registered. Please sign in instead.' });
    }

    // Auto-generate unique placeholder email based on mobile number
    const finalRole = role || 'user';
    const constructedEmail = (email && email.trim()) ? email.trim() : `${mobile.replace(/\D/g, '') || Date.now()}@mindease.com`;

    const userId = `${finalRole}_${Date.now()}`;
    const newUser = new User({
      id: userId,
      email: constructedEmail,
      password: '', // OTP login used instead
      name,
      role: finalRole,
      mobile: mobile,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      gender: gender || 'unspecified',
      dob: dob || '',
      state: state || '',
      city: city || '',
      preferredLanguage: preferredLanguage || 'English',
      preferredCounselingMode: preferredCounselingMode || 'Online',
      counselingRequirements: counselingRequirements || '',
      createdAt: new Date()
    });

    if (role === 'counselor') {
      newUser.specialty = specialty || 'General Therapy';
      newUser.price = 0; // In-house NGO service has no cost
      newUser.bio = bio || '';
      newUser.approved = false; // Admin must approve counselors
      newUser.credentials = credentials || '';
      newUser.rating = 5.0;
      newUser.reviewCount = 0;
      newUser.experience = Number(experience) || 1;
      newUser.registrationNumber = registrationNumber || '';
      newUser.certificates = certificates || '';
      newUser.languages = languages || ['English'];

      // Create default availability for new counselor
      const newAvail = new Availability({
        counselorId: userId,
        workingDays: [1, 2, 3, 4, 5],
        startHour: '09:00',
        endHour: '17:00',
        slotDuration: 60
      });
      await newAvail.save();

      // Create default custom appointment types
      await AppointmentType.insertMany([
        { id: `${userId}_Video`, counselorId: userId, name: 'Video Consultation', duration: 60, price: 0, bufferTime: 15, description: 'Direct face-to-face video therapy.' },
        { id: `${userId}_Audio`, counselorId: userId, name: 'Audio Consultation', duration: 45, price: 0, bufferTime: 15, description: 'Private phone-call consultation.' },
        { id: `${userId}_Chat`, counselorId: userId, name: 'Chat Consultation', duration: 30, price: 0, bufferTime: 10, description: 'Secure real-time texting session.' },
        { id: `${userId}_InPerson`, counselorId: userId, name: 'In-Person Consultation', duration: 60, price: 0, bufferTime: 30, description: 'In-office therapy session.' }
      ]);

      // Create default booking limits
      const newLimit = new BookingLimit({
        counselorId: userId,
        maxAppointmentsPerDay: 5,
        minNoticePeriodHours: 2,
        maxAdvanceBookingDays: 30
      });
      await newLimit.save();
    }

    await newUser.save();
    await logAction(userId, `User registered via OTP as ${role}`, req);

    const token = Buffer.from(userId).toString('base64');
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar,
        mobile: newUser.mobile,
        gender: newUser.gender,
        dob: newUser.dob,
        state: newUser.state,
        city: newUser.city,
        preferredLanguage: newUser.preferredLanguage,
        preferredCounselingMode: newUser.preferredCounselingMode,
        counselingRequirements: newUser.counselingRequirements,
        specialty: newUser.specialty,
        price: newUser.price,
        bio: newUser.bio,
        rating: newUser.rating,
        approved: newUser.approved,
        credentials: newUser.credentials,
        experience: newUser.experience,
        registrationNumber: newUser.registrationNumber,
        certificates: newUser.certificates,
        languages: newUser.languages
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/mobile-otp-send - Generate mock OTP for mobile login or registration
router.post('/mobile-otp-send', async (req, res) => {
  const { mobile, isSignUp } = req.body;
  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  try {
    const user = await findUserByMobile(mobile);
    if (isSignUp) {
      if (user) {
        return res.status(400).json({ message: 'Mobile number already registered. Please sign in instead.' });
      }
    } else {
      if (!user) {
        return res.status(404).json({ message: 'No registered user found with this mobile number. Please register first.' });
      }
      if (user.suspended) {
        return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
      }
    }

    // Generate mock 6 digit OTP (always 123456 for demo ease)
    const mockOtp = '123456';
    
    console.log(`[SMS Notification] Sent OTP ${mockOtp} to ${mobile}`);
    res.json({ message: 'Mock OTP code sent successfully', otp: mockOtp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/mobile-otp-verify - Complete mobile login using mock OTP
router.post('/mobile-otp-verify', async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ message: 'Mobile and OTP are required' });
  }

  try {
    const user = await findUserByMobile(mobile);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
    }

    if (otp !== '123456') {
      return res.status(400).json({ message: 'Invalid OTP code. Please use default "123456".' });
    }

    await logAction(user.id, 'User login via Mobile + OTP', req);

    const token = Buffer.from(user.id).toString('base64');
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        mobile: user.mobile,
        gender: user.gender,
        dob: user.dob,
        state: user.state,
        city: user.city,
        preferredLanguage: user.preferredLanguage,
        preferredCounselingMode: user.preferredCounselingMode,
        counselingRequirements: user.counselingRequirements,
        specialty: user.specialty,
        price: user.price,
        bio: user.bio,
        rating: user.rating,
        approved: user.approved,
        credentials: user.credentials,
        experience: user.experience,
        registrationNumber: user.registrationNumber,
        certificates: user.certificates,
        languages: user.languages
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password - Mock request for password resets
router.post('/forgot-password', async (req, res) => {
  const { email, mobile, otp, newPassword } = req.body;

  try {
    if (email) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'Email address not registered' });
      }
      const mockResetLink = `http://localhost:5173/#/reset-password?token=${Buffer.from(user.id).toString('base64')}`;
      console.log(`[Email Notification] Sent reset link: ${mockResetLink} to ${email}`);
      return res.json({ 
        message: 'Password reset link sent to email.',
        resetLink: mockResetLink
      });
    }

    if (mobile && otp && newPassword) {
      const user = await findUserByMobile(mobile);
      if (!user) {
        return res.status(404).json({ message: 'Mobile number not registered' });
      }
      if (otp !== '123456') {
        return res.status(400).json({ message: 'Invalid OTP code' });
      }
      
      user.password = newPassword;
      await user.save();
      
      await logAction(user.id, 'User updated password via Forgot Password reset', req);
      return res.json({ message: 'Password updated successfully. You can now login.' });
    }

    return res.status(400).json({ message: 'Invalid forgot password arguments.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
