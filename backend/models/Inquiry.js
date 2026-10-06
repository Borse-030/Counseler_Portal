import mongoose from 'mongoose';

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
export default Inquiry;
