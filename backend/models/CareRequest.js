import mongoose from 'mongoose';

const TimelineEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const AssignmentHistorySchema = new mongoose.Schema({
  counselorId: { type: String, default: '' },
  counselorName: { type: String, default: '' },
  assignedById: { type: String, default: '' },
  assignedByName: { type: String, default: '' },
  stage: { type: String, default: '' },
  reason: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const ReviewSchema = new mongoose.Schema({
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  actorRole: { type: String, enum: ['admin', 'counselor'], default: 'counselor' },
  decision: { type: String, enum: ['accepted', 'rejected'], required: true },
  reason: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false });

const DiscoveryPlanSchema = new mongoose.Schema({
  sessionType: { type: String, enum: ['single', 'package'], default: undefined },
  sessionCount: { type: Number, min: 1, default: undefined, required() { return Boolean(this.sessionType); }, validate: {
    validator(value) { return value === undefined || (Number.isSafeInteger(value) && (this.sessionType === 'single' ? value === 1 : this.sessionType !== 'package' || value >= 2)); },
    message: 'The session count must be a whole number; packages require at least 2 sessions.',
  } },
  preferredDate: { type: String, default: '' },
  preferredTime: { type: String, default: '' },
  concerns: { type: [new mongoose.Schema({
    clusterCode: { type: String, required: true },
    subConcerns: { type: [String], default: [] },
  }, { _id: false })], default: [] },
}, { _id: false });

const DiscoveryNoteSchema = new mongoose.Schema({
  notes: { type: String, default: '' },
  discoveryPlan: { type: DiscoveryPlanSchema, default: undefined },
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false });

const CareRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  patientMobile: { type: String, default: '' },
  preferredLanguage: { type: String, default: '' },
  status: {
    type: String,
    enum: [
      'submitted',
      'assigned',
      'accepted',
      'rejected',
      'discovery_scheduled',
      'discovery_completed',
      'assignment_pending',
      'matched',
      'active',
      'completed',
      'closed'
    ],
    default: 'submitted'
  },
  preferredDate: { type: String, default: '' },
  preferredTime: { type: String, default: '' },
  preferredFormat: { type: String, default: '' },
  intakeNotes: { type: String, default: '' },
  assignedCounselorId: { type: String, default: '' },
  assignedCounselorName: { type: String, default: '' },
  assignedById: { type: String, default: '' },
  assignedByName: { type: String, default: '' },
  rejectedReason: { type: String, default: '' },
  finalCounselorId: { type: String, default: '' },
  finalCounselorName: { type: String, default: '' },
  discoveryAppointmentId: { type: String, default: '' },
  discoveryNotes: { type: String, default: '' },
  discoveryPlan: { type: DiscoveryPlanSchema, default: undefined },
  discoveryNotesHistory: { type: [DiscoveryNoteSchema], default: [] },
  appointmentIds: { type: [String], default: [] },
  assignmentHistory: { type: [AssignmentHistorySchema], default: [] },
  reviews: { type: [ReviewSchema], default: [] },
  timeline: { type: [TimelineEntrySchema], default: [] }
}, { timestamps: true });

export const CareRequest = mongoose.model('CareRequest', CareRequestSchema);
export default CareRequest;
