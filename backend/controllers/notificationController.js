import { Notification } from '../models/index.js';

export const getNotifications = async (req, res) => {
  try {
    const userNotifs = await Notification.find({ userId: req.userId }).sort({ date: -1 });
    res.json(userNotifs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (notif) {
      return res.json({ success: true, message: 'Notification marked as read.' });
    }
    res.status(404).json({ message: 'Notification not found.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
