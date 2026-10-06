import mongoose from 'mongoose';

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
export default Transaction;
