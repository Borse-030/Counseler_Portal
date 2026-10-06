import mongoose from 'mongoose';

const SavedCounselorSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  counselorId: { type: String, required: true }
});

SavedCounselorSchema.index({ patientId: 1, counselorId: 1 }, { unique: true });

export const SavedCounselor = mongoose.model('SavedCounselor', SavedCounselorSchema);
export default SavedCounselor;
