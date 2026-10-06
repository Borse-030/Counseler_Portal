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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Appointments';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
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
