import './env.js';
import mongoose from 'mongoose';
 
export {
  Appointment,
  AppointmentType,
  AuditLog,
  Availability,
  CareRequest,
  Exception,
  Inquiry,
  Notification,
  OtpVerification,
  SavedCounselor,
  Transaction,
  User
} from './models/index.js';
import dotenv from 'dotenv';
 
export async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required. Set it in backend/.env or the process environment.');
  }
 
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
 
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
 
 