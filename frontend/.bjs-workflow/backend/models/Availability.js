import mongoose from 'mongoose';

const AvailabilitySchema = new mongoose.Schema({
  counselorId: { type: String, required: true, unique: true },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  startHour: { type: String, default: '09:00' },
  endHour: { type: String, default: '17:00' },
  slotDuration: { type: Number, default: 60 },
  daysConfig: {
    type: [
      {
        dayIndex: { type: Number, required: true },
        active: { type: Boolean, default: false },
        slots: [
          {
            startHour: { type: String, default: '09:00' },
            endHour: { type: String, default: '17:00' }
          }
        ]
      }
    ],
    default: []
  }
});

export const Availability = mongoose.model('Availability', AvailabilitySchema);
export default Availability;
