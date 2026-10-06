import mongoose from 'mongoose';

const ExceptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  counselorId: { type: String, required: true },
  date: { type: String, required: true },
  reason: { type: String, default: 'Personal Leave' }
});

export const Exception = mongoose.model('Exception', ExceptionSchema);
export default Exception;
