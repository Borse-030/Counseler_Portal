import mongoose from 'mongoose';

const AppointmentTypeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  counselorId: { type: String, required: true },
  name: { type: String, required: true },
  duration: { type: Number, default: 60 },
  price: { type: Number, default: 0 },
  bufferTime: { type: Number, default: 15 },
  description: { type: String, default: '' }
});

export const AppointmentType = mongoose.model('AppointmentType', AppointmentTypeSchema);
export default AppointmentType;
