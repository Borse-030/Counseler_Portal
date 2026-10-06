import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  careRequestId: { type: String, default: '' },
  appointmentKind: { type: String, enum: ['session', 'follow_up', 'discovery', ''], default: '' },
  proposalBatchId: { type: String, default: '' },
  proposedById: { type: String, default: '' },
  proposedByName: { type: String, default: '' },
  reviewedById: { type: String, default: '' },
  reviewedByName: { type: String, default: '' },
  reviewedAt: Date,
  reviewReason: { type: String, default: '' },
  purpose: { type: String, default: '' },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  counselorId: { type: String, required: true },
  counselorName: { type: String, required: true },
  counselorSpecialty: { type: String, default: '' },
  appointmentType: { type: String, default: 'Video Consultation' },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, required: true }, // HH:MM
  duration: { type: Number, default: 60 },
  amount: { type: Number, default: 0 },
  status: { type: String, default: 'pending_admin', enum: ['pending_admin', 'upcoming', 'completed', 'cancelled', 'rejected'] },
  meetingLink: { type: String, default: '' },
  clinicAddress: { type: String, default: '' },
  intakeNotes: { type: String, default: '' },
  sessionNotes: { type: String, default: '' },
  review: {
    rating: { type: Number },
    reviewText: { type: String },
    date: { type: Date }
  }
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
