import mongoose from 'mongoose';

const SessionNoteHistorySchema = new mongoose.Schema({
  notes: { type: String, default: '' },
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false });

const RescheduleRequestSchema = new mongoose.Schema({
  id: String, status: { type: String, enum: ['pending', 'scheduling', 'scheduled', 'declined'] },
  requesterId: String, requesterName: String, requesterRole: String, reason: String,
  preferredDate: String, preferredTime: String, requestedAt: Date,
  reviewerId: String, reviewerName: String, reviewedAt: Date, response: String,
  replacementId: String, replacementDate: String, replacementTime: String,
  lockToken: String, leaseUntil: Date, plannedDate: String, plannedTime: String, plannedMeetingLink: String,
}, { _id: false });

const AppointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  careRequestId: { type: String, default: '' },
  appointmentKind: { type: String, enum: ['session', 'follow_up', 'discovery', ''], default: '' },
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
  status: { type: String, default: 'upcoming', enum: ['pending_admin', 'upcoming', 'completed', 'user_absent', 'counselor_absent', 'both_absent', 'cancelled', 'rejected'] },
  purpose: { type: String, default: '' },
  reviewReason: { type: String, default: '' },
  reviewedById: { type: String, default: '' },
  reviewedByName: { type: String, default: '' },
  reviewedAt: { type: Date },
  meetingLink: { type: String, default: '' },
  clinicAddress: { type: String, default: '' },
  intakeNotes: { type: String, default: '' },
  sessionNotes: { type: String, default: '' },
  sessionNoteHistory: { type: [SessionNoteHistorySchema], default: [] },
  outcomeRecordedAt: { type: Date },
  outcomeRecordedById: { type: String, default: '' },
  outcomeRecordedByName: { type: String, default: '' },
  outcomeHistory: { type: [new mongoose.Schema({
    previousStatus: String, outcome: String, actorId: String, actorName: String,
    actorRole: String, reason: String, at: Date,
  }, { _id: false })], default: [] },
  rescheduledFromId: { type: String, default: '' },
  rescheduleRequest: { type: RescheduleRequestSchema, default: undefined },
  rescheduleHistory: { type: [RescheduleRequestSchema], default: [] },
  feedbackRequestedAt: { type: Date },
  review: {
    reviewText: { type: String },
    date: { type: Date }
  }
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
