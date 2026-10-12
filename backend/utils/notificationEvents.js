// Local push is immediate; periodic reconciliation also covers other server instances.
const clients = new Map();

export const publishNotificationEvent = (userId, event) => {
  for (const send of clients.get(userId) || []) send(event);
};

export const subscribeNotifications = (userId, send) => {
  const listeners = clients.get(userId) || new Set();
  listeners.add(send);
  clients.set(userId, listeners);
  return () => {
    listeners.delete(send);
    if (!listeners.size) clients.delete(userId);
  };
};
