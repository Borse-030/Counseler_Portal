import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Appointments';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log(`Connected to MongoDB `);
    try {
      const userCount = await User.countDocuments({});
      if (userCount === 0) {
        console.log('Database is empty. Auto-seeding initial defaults...');
        await db.reset();
      }
    } catch (err) {
      console.error('Error checking or auto-seeding database:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// 1. User Schema
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: '' },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['user', 'patient', 'counselor', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  mobile: { type: String, default: '' },
  gender: { type: String, default: 'unspecified' },
  dob: { type: String, default: '' },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  preferredLanguage: { type: String, default: 'English' },
  preferredCounselingMode: { type: String, default: 'Online' },
  counselingRequirements: { type: String, default: '' },
  specialty: { type: String, default: '' },
  price: { type: Number, default: 0 },
  bio: { type: String, default: '' },
  rating: { type: Number, default: 5.0 },
  reviewCount: { type: Number, default: 0 },
  approved: { type: Boolean, default: false },
  credentials: { type: String, default: '' },
  experience: { type: Number, default: 1 },
  registrationNumber: { type: String, default: '' },
  certificates: { type: String, default: '' },
  languages: { type: [String], default: ['English'] },
  suspended: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
export const User = mongoose.model('User', UserSchema);

// 2. Availability Schema
const AvailabilitySchema = new mongoose.Schema({
  counselorId: { type: String, required: true, unique: true },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  startHour: { type: String, default: '09:00' },
  endHour: { type: String, default: '17:00' },
  slotDuration: { type: Number, default: 60 },
  daysConfig: {
    type: [
      {
        dayIndex: { type: Number, required: true },
        active: { type: Boolean, default: false },
        slots: [
          {
            startHour: { type: String, default: '09:00' },
            endHour: { type: String, default: '17:00' }
          }
        ]
      }
    ],
    default: []
  }
});
export const Availability = mongoose.model('Availability', AvailabilitySchema);

// 3. Appointment Schema
const AppointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  counselorId: { type: String, required: true },
  counselorName: { type: String, required: true },
  counselorSpecialty: { type: String, default: '' },
  appointmentType: { type: String, default: 'Video Consultation' },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, required: true }, // HH:MM
  duration: { type: Number, default: 60 },
  amount: { type: Number, default: 0 },
  status: { type: String, default: 'upcoming', enum: ['upcoming', 'completed', 'cancelled'] },
  meetingLink: { type: String, default: '' },
  clinicAddress: { type: String, default: '' },
  intakeNotes: { type: String, default: '' },
  sessionNotes: { type: String, default: '' },
  review: {
    rating: { type: Number },
    reviewText: { type: String },
    date: { type: Date }
  }
});
export const Appointment = mongoose.model('Appointment', AppointmentSchema);

// 4. Transaction Schema
const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  appointmentId: { type: String, required: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  counselorName: { type: String, required: true },
  amount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'successful' },
  paymentMethod: { type: String, default: 'Verification Code' }
});
export const Transaction = mongoose.model('Transaction', TransactionSchema);

// 5. Notification Schema
const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});
export const Notification = mongoose.model('Notification', NotificationSchema);

// 6. Exception (Leave) Schema
const ExceptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  counselorId: { type: String, required: true },
  date: { type: String, required: true },
  reason: { type: String, default: 'Personal Leave' }
});
export const Exception = mongoose.model('Exception', ExceptionSchema);

// 7. BookingLimit Schema
const BookingLimitSchema = new mongoose.Schema({
  counselorId: { type: String, required: true, unique: true },
  maxAppointmentsPerDay: { type: Number, default: 5 },
  minNoticePeriodHours: { type: Number, default: 2 },
  maxAdvanceBookingDays: { type: Number, default: 30 }
});
export const BookingLimit = mongoose.model('BookingLimit', BookingLimitSchema);

// 8. SavedCounselor Schema
const SavedCounselorSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  counselorId: { type: String, required: true }
});
SavedCounselorSchema.index({ patientId: 1, counselorId: 1 }, { unique: true });
export const SavedCounselor = mongoose.model('SavedCounselor', SavedCounselorSchema);

// 9. AppointmentType Schema
const AppointmentTypeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  counselorId: { type: String, required: true },
  name: { type: String, required: true },
  duration: { type: Number, default: 60 },
  price: { type: Number, default: 0 },
  bufferTime: { type: Number, default: 15 },
  description: { type: String, default: '' }
});
export const AppointmentType = mongoose.model('AppointmentType', AppointmentTypeSchema);

// 10. Inquiry Schema
const InquirySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' }
});
export const Inquiry = mongoose.model('Inquiry', InquirySchema);

// 11. AuditLog Schema
const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '127.0.0.1' }
});
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Seeding Helpers
const getRelativeDate = (daysOffset, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const defaultSeedData = () => {
  const counselor1Id = 'counselor_sarah';
  const counselor2Id = 'counselor_michael';
  const counselor3Id = 'counselor_priya';
  const counselor4Id = 'counselor_alex';
  const counselor5Id = 'counselor_elena';

  const patientId = 'patient_jane';
  const adminId = 'admin_chief';

  const users = [
    {
      id: patientId,
      email: 'patient@demo.com',
      password: 'password',
      name: 'Jane Doe',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      mobile: '+1 (555) 019-2834',
      gender: 'female',
      dob: '1992-04-12',
      createdAt: getRelativeDate(-30)
    },
    {
      id: counselor1Id,
      email: 'counselor@demo.com',
      password: 'password',
      name: 'Dr. Sarah Jenkins',
      role: 'counselor',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
      specialty: 'Anxiety & OCD',
      price: 0,
      bio: "10+ years experience helping individuals navigate stress and anxiety. Let's work together to build long-term resilience and emotional strength.",
      rating: 4.8,
      reviewCount: 15,
      approved: true,
      credentials: 'Licensed Clinical Psychologist (PsyD), Stanford Graduate.',
      mobile: '+1 (555) 018-9321',
      experience: 12,
      registrationNumber: 'LCP-94302',
      certificates: 'Certified Cognitive Behavioral Therapist (CBT), Clinical Anxiety Specialist',
      languages: ['English', 'Spanish'],
      createdAt: getRelativeDate(-45)
    },
    {
      id: counselor2Id,
      email: 'michael@demo.com',
      password: 'password',
      name: 'Michael Chang, LMFT',
      role: 'counselor',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
      specialty: 'Relationship Counseling & Marriage',
      price: 0,
      bio: 'Helping couples build stronger communication, trust, and intimacy. Focus on modern attachment theory and conflict resolution.',
      rating: 4.9,
      reviewCount: 22,
      approved: true,
      credentials: 'Licensed Marriage & Family Therapist, 8 years practicing.',
      mobile: '+1 (555) 017-4839',
      experience: 8,
      registrationNumber: 'LMFT-29401',
      certificates: 'Gottman Method Couple Therapy (Level 2), Attachment Trauma Certificate',
      languages: ['English', 'Mandarin'],
      createdAt: getRelativeDate(-40)
    },
    {
      id: counselor3Id,
      email: 'priya@demo.com',
      password: 'password',
      name: 'Priya Patel, LCSW',
      role: 'counselor',
      avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=150',
      specialty: 'Career Transition & Burnout',
      price: 0,
      bio: 'Navigate career transitions, deal with professional burnout, and discover your true calling in a balanced, mindful way.',
      rating: 4.7,
      reviewCount: 9,
      approved: true,
      credentials: 'Licensed Clinical Social Worker, Specialist in Work-Life Balance.',
      mobile: '+1 (555) 016-1934',
      experience: 10,
      registrationNumber: 'LCSW-10492',
      certificates: 'Mindfulness-Based Stress Reduction (MBSR) Trainer, Occupational Psychology Cert',
      languages: ['English', 'Hindi', 'Gujarati'],
      createdAt: getRelativeDate(-35)
    },
    {
      id: counselor4Id,
      email: 'alex@demo.com',
      password: 'password',
      name: 'Dr. Alex Mercer',
      role: 'counselor',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      specialty: 'LGBTQ+ Affirmative Therapy & Trauma',
      price: 0,
      bio: 'Dedicated to providing a safe, affirmative space for LGBTQ+ individuals and processing developmental and complex trauma.',
      rating: 5.0,
      reviewCount: 18,
      approved: true,
      credentials: 'PhD in Counseling Psychology, LGBTQ+ community advocate.',
      mobile: '+1 (555) 012-3921',
      experience: 9,
      registrationNumber: 'PCP-39201',
      certificates: 'LGBTQ+ Affirmative Therapy Specialist, Somatic Experiencing Trauma Practitioner',
      languages: ['English', 'French'],
      createdAt: getRelativeDate(-50)
    },
    {
      id: counselor5Id,
      email: 'elena@demo.com',
      password: 'password',
      name: 'Elena Rostova, LPC',
      role: 'counselor',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      specialty: 'Child & Adolescent Counseling',
      price: 0,
      bio: 'Empowering children and teenagers to overcome emotional challenges, anxiety, and navigate school and family environments successfully.',
      rating: 4.5,
      reviewCount: 6,
      approved: true,
      credentials: 'Licensed Professional Counselor, MA in Child Development.',
      mobile: '+1 (555) 015-8834',
      experience: 6,
      registrationNumber: 'LPC-58392',
      certificates: 'Child & Adolescent Mental Health Professional, Play Therapy Certification',
      languages: ['English', 'Russian'],
      createdAt: getRelativeDate(-5)
    },
    {
      id: adminId,
      email: 'admin@demo.com',
      password: 'password',
      name: 'Chief Admin',
      role: 'admin',
      mobile: '9876543210',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      createdAt: getRelativeDate(-100)
    }
  ];

  const availabilities = [
    {
      counselorId: counselor1Id,
      workingDays: [1, 2, 3, 4, 5],
      startHour: '09:00',
      endHour: '17:00',
      slotDuration: 60
    },
    {
      counselorId: counselor2Id,
      workingDays: [1, 2, 3, 4],
      startHour: '10:00',
      endHour: '18:00',
      slotDuration: 60
    },
    {
      counselorId: counselor3Id,
      workingDays: [2, 3, 4, 5],
      startHour: '09:00',
      endHour: '16:00',
      slotDuration: 45
    },
    {
      counselorId: counselor4Id,
      workingDays: [1, 3, 5],
      startHour: '08:00',
      endHour: '15:00',
      slotDuration: 60
    },
    {
      counselorId: counselor5Id,
      workingDays: [1, 2, 3, 4, 5],
      startHour: '13:00',
      endHour: '18:00',
      slotDuration: 30
    }
  ];

  const appointments = [
    {
      id: 'apt_1',
      patientId: patientId,
      patientName: 'Jane Doe',
      counselorId: counselor1Id,
      counselorName: 'Dr. Sarah Jenkins',
      counselorSpecialty: 'Anxiety & OCD',
      appointmentType: 'Video Consultation',
      date: getRelativeDate(2).split('T')[0],
      time: '10:00',
      duration: 60,
      amount: 0,
      status: 'upcoming',
      meetingLink: 'https://zoom.us/j/93482103982',
      intakeNotes: 'Feeling increasingly stressed due to work changes. Looking for tools to manage daily anxiety attacks.',
      sessionNotes: '',
      review: null
    },
    {
      id: 'apt_2',
      patientId: patientId,
      patientName: 'Jane Doe',
      counselorId: counselor1Id,
      counselorName: 'Dr. Sarah Jenkins',
      counselorSpecialty: 'Anxiety & OCD',
      appointmentType: 'Video Consultation',
      date: getRelativeDate(-3).split('T')[0],
      time: '14:00',
      duration: 60,
      amount: 0,
      status: 'completed',
      meetingLink: 'https://zoom.us/j/93482103982',
      intakeNotes: 'Follow-up on anxiety tools.',
      sessionNotes: 'Client is showing great progress. Practiced box breathing. Advised to continue homework on diary logs.',
      review: {
        rating: 5,
        reviewText: 'Dr. Sarah was extremely empathetic and helped me build an actionable breathing pattern that works during stress.',
        date: new Date(getRelativeDate(-3))
      }
    },
    {
      id: 'apt_3',
      patientId: patientId,
      patientName: 'Jane Doe',
      counselorId: counselor2Id,
      counselorName: 'Michael Chang, LMFT',
      counselorSpecialty: 'Relationship Counseling & Marriage',
      appointmentType: 'Video Consultation',
      date: getRelativeDate(-7).split('T')[0],
      time: '11:00',
      duration: 60,
      amount: 0,
      status: 'completed',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      intakeNotes: 'Consultation about setting healthy boundaries in personal relationships.',
      sessionNotes: 'Discussed boundary setting with family members. Explored attachment patterns.',
      review: {
        rating: 4,
        reviewText: 'Great listener, provided good insights on setting healthy boundaries.',
        date: new Date(getRelativeDate(-7))
      }
    }
  ];

  const transactions = [
    {
      id: 'tx_1',
      appointmentId: 'apt_1',
      patientId: patientId,
      patientName: 'Jane Doe',
      counselorName: 'Dr. Sarah Jenkins',
      amount: 0,
      date: new Date(getRelativeDate(-1)),
      status: 'successful',
      paymentMethod: 'Verification Code'
    },
    {
      id: 'tx_2',
      appointmentId: 'apt_2',
      patientId: patientId,
      patientName: 'Jane Doe',
      counselorName: 'Dr. Sarah Jenkins',
      amount: 0,
      date: new Date(getRelativeDate(-4)),
      status: 'successful',
      paymentMethod: 'Verification Code'
    },
    {
      id: 'tx_3',
      appointmentId: 'apt_3',
      patientId: patientId,
      patientName: 'Jane Doe',
      counselorName: 'Michael Chang, LMFT',
      amount: 0,
      date: new Date(getRelativeDate(-8)),
      status: 'successful',
      paymentMethod: 'Verification Code'
    }
  ];

  const savedCounselors = [
    { patientId: patientId, counselorId: counselor1Id }
  ];

  const appointmentTypes = [
    { id: 'Sarah_Video', counselorId: counselor1Id, name: 'Video Consultation', duration: 60, price: 0, bufferTime: 15, description: 'Direct face-to-face video therapy.' },
    { id: 'Sarah_Audio', counselorId: counselor1Id, name: 'Audio Consultation', duration: 45, price: 0, bufferTime: 15, description: 'Private phone-call consultation.' },
    { id: 'Sarah_Chat', counselorId: counselor1Id, name: 'Chat Consultation', duration: 30, price: 0, bufferTime: 10, description: 'Secure real-time texting session.' },
    { id: 'Sarah_InPerson', counselorId: counselor1Id, name: 'In-Person Consultation', duration: 60, price: 0, bufferTime: 30, description: 'In-office therapy at MindEase clinic (Room 302).' },

    { id: 'Michael_Video', counselorId: counselor2Id, name: 'Video Consultation', duration: 60, price: 0, bufferTime: 15, description: 'Direct face-to-face video therapy.' },
    { id: 'Michael_Audio', counselorId: counselor2Id, name: 'Audio Consultation', duration: 45, price: 0, bufferTime: 15, description: 'Private phone-call consultation.' },
    { id: 'Michael_InPerson', counselorId: counselor2Id, name: 'In-Person Consultation', duration: 60, price: 0, bufferTime: 30, description: 'In-office therapy at MindEase clinic (Room 105).' }
  ];

  const exceptions = [
    { id: 'ex_1', counselorId: counselor1Id, date: getRelativeDate(5).split('T')[0], reason: 'National Psychology Symposium' }
  ];

  const bookingLimits = [
    { counselorId: counselor1Id, maxAppointmentsPerDay: 5, minNoticePeriodHours: 2, maxAdvanceBookingDays: 30 },
    { counselorId: counselor2Id, maxAppointmentsPerDay: 4, minNoticePeriodHours: 4, maxAdvanceBookingDays: 30 },
    { counselorId: counselor3Id, maxAppointmentsPerDay: 6, minNoticePeriodHours: 2, maxAdvanceBookingDays: 45 },
    { counselorId: counselor4Id, maxAppointmentsPerDay: 5, minNoticePeriodHours: 1, maxAdvanceBookingDays: 30 },
    { counselorId: counselor5Id, maxAppointmentsPerDay: 8, minNoticePeriodHours: 12, maxAdvanceBookingDays: 15 }
  ];

  const inquiries = [
    {
      id: 'inq_1',
      name: 'Robert Stark',
      email: 'robert@stark.com',
      phone: '+1 (555) 014-9382',
      message: 'Hello, do you accept Blue Cross insurance for standard video consultations?',
      timestamp: new Date(getRelativeDate(-2)),
      status: 'pending'
    }
  ];

  const auditLogs = [
    {
      id: 'audit_1',
      userId: adminId,
      action: 'System Seed Database Initialized',
      timestamp: new Date(getRelativeDate(-10)),
      ipAddress: '192.168.1.1'
    },
    {
      id: 'audit_2',
      userId: adminId,
      action: 'Counselor Dr. Sarah Jenkins approved credentials',
      timestamp: new Date(getRelativeDate(-9)),
      ipAddress: '192.168.1.1'
    }
  ];

  return {
    users,
    availabilities,
    appointments,
    transactions,
    savedCounselors,
    appointmentTypes,
    exceptions,
    bookingLimits,
    inquiries,
    auditLogs
  };
};

export const db = {
  reset: async () => {
    // Drop database / collections
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
      await mongoose.connection.collections[collectionName].deleteMany({});
    }

    const data = defaultSeedData();

    // Insert seeded records
    await User.insertMany(data.users);
    await Availability.insertMany(data.availabilities);
    await Appointment.insertMany(data.appointments);
    await Transaction.insertMany(data.transactions);
    await SavedCounselor.insertMany(data.savedCounselors);
    await AppointmentType.insertMany(data.appointmentTypes);
    await Exception.insertMany(data.exceptions);
    await BookingLimit.insertMany(data.bookingLimits);
    await Inquiry.insertMany(data.inquiries);
    await AuditLog.insertMany(data.auditLogs);

    console.log('Seeded MongoDB database successfully.');
    return data;
  }
};
