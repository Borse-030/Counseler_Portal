import mongoose from 'mongoose';

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
  district: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  preferredLanguage: { type: String, default: 'English' },
  preferredCounselingMode: { type: String, default: 'Online' },
  counselingRequirements: { type: String, default: '' },
  caseId: { type: String, default: '' },
  consents: { type: mongoose.Schema.Types.Mixed, default: {} },
  consentAgreedAt: { type: Date },
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
export default User;
