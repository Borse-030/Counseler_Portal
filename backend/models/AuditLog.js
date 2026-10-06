import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '127.0.0.1' }
});

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
