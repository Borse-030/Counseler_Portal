import crypto from 'node:crypto';
import { CareRequest, User } from '../models/index.js';
import { sendNotification } from './notificationService.js';

const requestId = () => `care_${crypto.randomUUID()}`;

// Registration has no schedule preference yet; leave those fields empty for discovery.
export const createCareRequest = async (patient, {
  preferredDate = '', preferredTime = '', preferredFormat = '', intakeNotes = '',
} = {}) => {
    const id = requestId();
    const careRequest = new CareRequest({
      id,
      patientId: patient.id,
      patientName: patient.name,
      patientMobile: patient.mobile || '',
      preferredLanguage: patient.preferredLanguage || '',
      status: 'submitted',
      preferredDate,
      preferredTime,
      preferredFormat,
      intakeNotes: intakeNotes.trim(),
      timeline: [{ status: 'submitted', actorId: patient.id, actorName: patient.name, note: 'Patient submitted an intake request.' }],
    });

    const [admins, counselors] = await Promise.all([
      User.find({ role: 'admin', suspended: { $ne: true } }),
      User.find({ role: 'counselor', approved: true, suspended: { $ne: true } }),
    ]);
    await careRequest.save();
    const notifications = [
      ...admins.map(admin => sendNotification(admin.id, `New registration request from ${patient.name} is ready for counselor assignment or review.`)),
      ...counselors.map(counselor => sendNotification(counselor.id, `A new registration request from ${patient.name} is available in the unassigned intake queue.`)),
      sendNotification(patient.id, 'Your registration request has been received and is waiting for a counselor to review it.'),
    ];
    // Notification delivery must not turn a saved request into a failed registration.
    await Promise.allSettled(notifications);
    return careRequest;
};
