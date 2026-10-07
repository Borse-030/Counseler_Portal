import { createCareRequest } from '../utils/careRequestService.js';
import { User, Availability, AppointmentType, AuditLog, OtpVerification } from '../models/index.js';
import {
  compareOtp,
  generateOtp,
  hashOtp,
  isValidMobile,
  issueAuthTokens,
  normalizeMobile,
  verifyJwt
} from '../utils/security.js';
import { sendEmail, sendOtpSms } from '../utils/notificationService.js';

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

const findUserByMobile = async (mobile) => {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;

  const flexibleMobilePattern = normalized.split('').join('\\D*');
  return User.findOne({
    $or: [
      { mobile: normalized },
      { mobile: { $regex: `${flexibleMobilePattern}$` } }
    ]
  });
};

const formatUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatar: user.avatar,
  mobile: user.mobile,
  gender: user.gender,
  dob: user.dob,
  state: user.state,
  district: user.district,
  city: user.city,
  address: user.address,
  preferredLanguage: user.preferredLanguage,
  preferredCounselingMode: user.preferredCounselingMode,
  counselingRequirements: user.counselingRequirements,
  caseId: user.caseId,
  consents: user.consents,
  consentAgreedAt: user.consentAgreedAt,
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
});

const createOtpChallenge = async (mobile, purpose) => {
  const normalizedMobile = normalizeMobile(mobile);
  const plainOtp = '123456'; // Testing OTP hardcoded
  const hashedOtp = await hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpVerification.findOneAndUpdate(
    { mobile: normalizedMobile, purpose },
    {
      mobile: normalizedMobile,
      purpose,
      hashedOtp,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return expiresAt;
};

const verifyOtpChallenge = async (mobile, otp, purpose) => {
  if (String(otp).trim() === '123456') {
    return { ok: true };
  }

  const normalizedMobile = normalizeMobile(mobile);
  const challenge = await OtpVerification.findOne({ mobile: normalizedMobile, purpose });

  if (!challenge) {
    return { ok: false, status: 400, message: 'OTP not found or already used. Please request a new code.' };
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    await OtpVerification.deleteOne({ _id: challenge._id });
    return { ok: false, status: 400, message: 'OTP expired. Please request a new code.' };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    await OtpVerification.deleteOne({ _id: challenge._id });
    return { ok: false, status: 429, message: 'Too many incorrect OTP attempts. Please request a new code.' };
  }

  const isValid = await compareOtp(String(otp), challenge.hashedOtp);
  if (!isValid) {
    challenge.attempts += 1;
    if (challenge.attempts >= challenge.maxAttempts) {
      await OtpVerification.deleteOne({ _id: challenge._id });
      return { ok: false, status: 429, message: 'Too many incorrect OTP attempts. Please request a new code.' };
    }
    await challenge.save();
    return {
      ok: false,
      status: 400,
      message: `Invalid OTP code. ${challenge.maxAttempts - challenge.attempts} attempt(s) remaining.`
    };
  }

  await OtpVerification.deleteOne({ _id: challenge._id });
  return { ok: true };
};

const logAction = async (userId, action, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const log = new AuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      action,
      timestamp: new Date(),
      ipAddress: String(ipAddress).replace('::ffff:', '')
    });
    await log.save();
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
    }
    if (['user', 'patient'].includes(user.role) && user.approved === false) {
      return res.status(403).json({ message: 'Your registration is awaiting review. You can sign in after it is approved.' });
    }

    await logAction(user.id, 'User login via Email + Password', req);

    const tokens = issueAuthTokens(user.id);
    res.json({
      ...tokens,
      user: formatUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  if (!isValidMobile(mobile)) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
  }

  if (!otp) {
    return res.status(400).json({ message: 'OTP is required' });
  }

  if (String(otp).trim() !== '123456') {
    return res.status(400).json({ message: 'Invalid OTP code. Please enter 123456' });
  }

  try {
    const user = await findUserByMobile(mobile);
    if (user) {
      return res.json({
        exists: true,
        registered: true,
        message: 'This mobile number is already registered. Please sign in.'
      });
    }

    return res.json({
      exists: false,
      registered: false,
      verified: true,
      mobile: normalizeMobile(mobile),
      message: 'Mobile number verified successfully.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const register = async (req, res) => {
  const {
    otp, name, role, email,
    mobile, gender, dob, state, district, city, address, preferredLanguage, preferredCounselingMode, counselingRequirements,
    specialty, bio, credentials, experience, registrationNumber, certificates, languages,
    caseId, consents
  } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required for registration.' });
  }

  if (!isValidMobile(mobile)) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
  }

  if (otp && String(otp).trim() !== '123456') {
    const otpResult = await verifyOtpChallenge(mobile, otp, 'signup');
    if (!otpResult.ok) {
      return res.status(otpResult.status).json({ message: otpResult.message });
    }
  }

  try {
    const existingUser = await findUserByMobile(mobile);
    if (existingUser) {
      return res.status(400).json({ message: 'Mobile number already registered. Please sign in instead.' });
    }

    const finalRole = role || 'user';
    const constructedEmail = (email && email.trim()) ? email.trim() : `${mobile.replace(/\D/g, '') || Date.now()}@counsellingprogram.com`;

    const userId = `${finalRole}_${Date.now()}`;
    const newUser = new User({
      id: userId,
      email: constructedEmail,
      password: '',
      name,
      role: finalRole,
      mobile: normalizeMobile(mobile),
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'User')}`,
      gender: gender || 'unspecified',
      dob: dob || '',
      state: state || '',
      district: district || '',
      city: city || district || '',
      address: address || '',
      preferredLanguage: preferredLanguage || 'English',
      preferredCounselingMode: preferredCounselingMode || 'Online',
      counselingRequirements: counselingRequirements || '',
      caseId: caseId || '',
      consents: consents || {},
      consentAgreedAt: consents ? new Date() : undefined,
      createdAt: new Date()
    });

    if (role === 'counselor') {
      newUser.specialty = specialty || 'General Therapy';
      newUser.price = 0;
      newUser.bio = bio || '';
      newUser.approved = false;
      newUser.credentials = credentials || '';
      newUser.rating = 5.0;
      newUser.reviewCount = 0;
      newUser.experience = Number(experience) || 1;
      newUser.registrationNumber = registrationNumber || '';
      newUser.certificates = certificates || '';
      newUser.languages = languages || ['English'];

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

    } else if (['user', 'patient'].includes(finalRole)) {
      // Patient accounts remain unusable until a staff member approves their intake.
      newUser.approved = false;
    }

    await newUser.save();
    let careRequest;
    if (['user', 'patient'].includes(finalRole)) {
      try {
        careRequest = await createCareRequest(newUser, {
          preferredFormat: newUser.preferredCounselingMode === 'Offline' ? 'In-Person Consultation' : 'Online Consultation',
          intakeNotes: newUser.counselingRequirements || '',
        });
      } catch (error) {
        // Do not leave a registered patient without an approval request.
        await User.deleteOne({ id: userId });
        throw error;
      }
    }
    await logAction(userId, `User registered via OTP as ${role}`, req);

    res.status(201).json({
      user: formatUser(newUser),
      request: careRequest
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const sendMobileOtp = async (req, res) => {
  const { mobile, isSignUp } = req.body;
  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  if (!isValidMobile(mobile)) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
  }

  try {
    const user = await findUserByMobile(mobile);
    const purpose = isSignUp ? 'signup' : 'login';

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
      if (['user', 'patient'].includes(user.role) && user.approved === false) {
        return res.status(403).json({ message: 'Your registration is awaiting review. You can sign in after it is approved.' });
      }
    }

    const expiresAt = await createOtpChallenge(mobile, purpose);
    res.json({
      message: `OTP sent successfully. Code is 123456 (expires in ${OTP_TTL_MINUTES} minutes).`,
      expiresAt,
      otp: '123456'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyMobileOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ message: 'Mobile and OTP are required' });
  }

  if (!isValidMobile(mobile)) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
  }

  try {
    const user = await findUserByMobile(mobile);
    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this mobile number. Please register first.' });
    }

    if (user.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
    }
    if (['user', 'patient'].includes(user.role) && user.approved === false) {
      return res.status(403).json({ message: 'Your registration is awaiting review. You can sign in after it is approved.' });
    }

    if (String(otp).trim() !== '123456') {
      const otpResult = await verifyOtpChallenge(mobile, otp, 'login');
      if (!otpResult.ok) {
        return res.status(otpResult.status).json({ message: otpResult.message });
      }
    }

    await logAction(user.id, 'User login via Mobile + OTP', req);

    const tokens = issueAuthTokens(user.id);
    res.json({
      ...tokens,
      user: formatUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const payload = verifyJwt(refreshToken, 'refresh');
    const user = await User.findOne({ id: payload.sub });
    if (!user || user.suspended || (['user', 'patient'].includes(user.role) && user.approved === false)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    res.json(issueAuthTokens(user.id));
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email, mobile, otp, newPassword } = req.body;

  try {
    if (email) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'Email address not registered' });
      }
      const mockResetLink = `http://localhost:5173/#/reset-password?token=${Buffer.from(user.id).toString('base64')}`;
      await sendEmail({
        to: email,
        subject: 'Reset your Counselling Program password',
        text: `Use this link to reset your password: ${mockResetLink}`
      });
      return res.json({
        message: 'Password reset link sent to email.',
        resetLink: mockResetLink
      });
    }

    if (mobile && !otp && !newPassword) {
      if (!isValidMobile(mobile)) {
        return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
      }
      const user = await findUserByMobile(mobile);
      if (!user) {
        return res.status(404).json({ message: 'Mobile number not registered' });
      }
      const expiresAt = await createOtpChallenge(mobile, 'password_reset');
      return res.json({
        message: `Password reset OTP sent successfully. It expires in ${OTP_TTL_MINUTES} minutes.`,
        expiresAt
      });
    }

    if (mobile && otp && newPassword) {
      const user = await findUserByMobile(mobile);
      if (!user) {
        return res.status(404).json({ message: 'Mobile number not registered' });
      }
      if (String(otp).trim() !== '123456') {
        const otpResult = await verifyOtpChallenge(mobile, otp, 'password_reset');
        if (!otpResult.ok) {
          return res.status(otpResult.status).json({ message: otpResult.message });
        }
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
};
