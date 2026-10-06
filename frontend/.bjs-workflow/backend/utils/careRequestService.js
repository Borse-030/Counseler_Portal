import crypto from 'node:crypto';
import { CareRequest, User } from '../models/index.js';
import { sendNotification } from './notificationService.js';

const requestId = () => `care_${crypto.randomUUID()}`;

// Registration has no schedule preference yet; leave those fields empty for discovery.
export const createAssignedCareRequest = async (patient, {
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

    // Auto-assign to the best available counselor
    const approvedCounselors = await User.find({ role: 'counselor', approved: true, suspended: { $ne: true } });

    if (approvedCounselors.length > 0) {
      // Find the counselor with the fewest active assignments (load balancing)
      const assignmentCounts = await Promise.all(
        approvedCounselors.map(async (counselor) => {
          const activeCount = await CareRequest.countDocuments({
            assignedCounselorId: counselor.id,
            status: { $in: ['assigned', 'accepted', 'discovery_scheduled', 'discovery_completed', 'active'] }
          });
          return { counselor, activeCount };
        })
      );

      // Sort by fewest active assignments, then by rating (descending)
      assignmentCounts.sort((a, b) => {
        if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
        return (b.counselor.rating || 0) - (a.counselor.rating || 0);
      });

      const bestMatch = assignmentCounts[0].counselor;

      careRequest.assignedCounselorId = bestMatch.id;
      careRequest.assignedCounselorName = bestMatch.name;
      careRequest.assignedById = 'system';
      careRequest.assignedByName = 'Auto-assignment';
      careRequest.status = 'assigned';
      careRequest.assignmentHistory.push({
        counselorId: bestMatch.id,
        counselorName: bestMatch.name,
        assignedById: 'system',
        assignedByName: 'Auto-assignment',
        stage: 'review',
        reason: 'Automatically assigned to the counselor with the lightest workload.',
        at: new Date()
      });
      careRequest.timeline.push({
        status: 'assigned',
        actorId: 'system',
        actorName: 'Auto-assignment',
        note: `Automatically assigned to ${bestMatch.name}.`,
        at: new Date()
      });

    }
    // Complete database reads before saving so callers can safely retry a failed creation.
    const admins = await User.find({ role: 'admin', suspended: { $ne: true } });
    await careRequest.save();
    const notifications = admins.map((admin) => sendNotification(admin.id, `New session request from ${patient.name} is ready for review.`));
    if (careRequest.assignedCounselorId) {
      notifications.push(sendNotification(careRequest.assignedCounselorId, `A new intake request from ${patient.name} has been assigned to you for review.`));
      notifications.push(sendNotification(patient.id, `Your session request has been received and assigned to ${careRequest.assignedCounselorName}. They will review it shortly.`));
    } else {
      notifications.push(sendNotification(patient.id, 'Your session request has been received and is waiting for admin review.'));
    }
    // Notification delivery must not turn a saved request into a failed registration.
    await Promise.allSettled(notifications);
    return careRequest;
};
