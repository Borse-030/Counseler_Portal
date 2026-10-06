import mongoose from 'mongoose';

const BookingLimitSchema = new mongoose.Schema({
  counselorId: { type: String, required: true, unique: true },
  maxAppointmentsPerDay: { type: Number, default: 5 },
  minNoticePeriodHours: { type: Number, default: 2 },
  maxAdvanceBookingDays: { type: Number, default: 30 }
});

export const BookingLimit = mongoose.model('BookingLimit', BookingLimitSchema);
export default BookingLimit;
