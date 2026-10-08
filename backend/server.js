import './env.js';
import crypto from 'crypto';

if (!globalThis.crypto) { globalThis.crypto = crypto.webcrypto || crypto; }
import express from 'express';
import cors from 'cors';
import { connectDB, User } from './db.js';
import { getUserIdFromToken } from './utils/security.js';
import authRoutes from './routes/auth.js';
import counselorRoutes from './routes/counselors.js';
import appointmentRoutes from './routes/appointments.js';
import sessionRequestRoutes from './routes/sessionRequests.js';
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware
app.use(async (req, res, next) => {
  console.log([]  );
  next();
});

// Suspension checker middleware
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const userId = getUserIdFromToken(token);
      const user = await User.findOne({ id: userId });
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
app.use('/api/session-requests', sessionRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

try {
  await connectDB();
} catch (err) {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log('Counselling Program server is running on http://localhost:' + PORT);
  console.log('Using MongoDB database connection.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Error: Port ' + PORT + ' is already in use by another process.');
    console.error('Please terminate the process using port ' + PORT + ' or set a different PORT in .env.');
    process.exit(1);
  }
});
