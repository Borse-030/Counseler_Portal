import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import counselorRoutes from './routes/counselors.js';
import appointmentRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import notificationsRoutes from './routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend dev server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Suspension checker middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const userId = Buffer.from(token, 'base64').toString('ascii');
      const users = db.get('users');
      const user = users.find(u => u.id === userId);
      if (user && user.suspended) {
        return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
      }
    } catch (e) {
      // Ignore here, let downstream auth capture token format errors
    }
  }
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

app.listen(PORT, () => {
  console.log(`MindEase server is running on http://localhost:${PORT}`);
  console.log(`Using MongoDB database connection.`);
});
