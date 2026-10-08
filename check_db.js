import './backend/env.js';
import { connectDB, User } from './backend/db.js';

await connectDB();
const users = await User.find({}, { name: 1, mobile: 1, email: 1, role: 1, approved: 1 });
console.log("Found users in DB:", JSON.stringify(users, null, 2));
process.exit(0);
