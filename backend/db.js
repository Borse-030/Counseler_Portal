import mongoose from 'mongoose';

export {
  Appointment,
  AppointmentType,
  AuditLog,
  Availability,
  BookingLimit,
  CareRequest,
  Exception,
  Inquiry,
  Notification,
  OtpVerification,
  SavedCounselor,
  Transaction,
  User
} from './models/index.js';

// const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_URI = "mongodb+srv://survey_test_user:SurveyTest2026@cluster0.uq5nnqw.mongodb.net/CouncelorPortal?appName=Cluster0"

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB', MONGODB_URI);
  })
  .catch((err) => console.error('MongoDB connection error:', err));

export const db = {
  reset: async () => {
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
      await mongoose.connection.collections[collectionName].deleteMany({});
    }
    console.log('Database cleared successfully.');
    return { cleared: true };
  }
};
