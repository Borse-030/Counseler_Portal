import mongoose from 'mongoose';

const OtpVerificationSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  purpose: { type: String, required: true },
  hashedOtp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 }
});

OtpVerificationSchema.index({ mobile: 1, purpose: 1 }, { unique: true });

export const OtpVerification = mongoose.model('OtpVerification', OtpVerificationSchema);
export default OtpVerification;
