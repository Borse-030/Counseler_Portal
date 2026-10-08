import './backend/env.js';
import { connectDB, User } from './backend/db.js';
import { normalizeMobile } from './backend/utils/security.js';

await connectDB();

const findUserByMobile = async (mobile) => {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;

  const flexibleMobilePattern = normalized.split('').join('\\D*');
  return User.findOne({
    $or: [
      { mobile: normalized },
      { mobile: { $regex: `${flexibleMobilePattern}$` } }
    ]
  });
};

const test1 = await findUserByMobile('8765456789');
console.log('Test 8765456789:', test1 ? test1.name : 'NOT FOUND');

const test2 = await findUserByMobile('7720942411');
console.log('Test 7720942411:', test2 ? test2.name : 'NOT FOUND');

const test3 = await findUserByMobile('987654324');
console.log('Test 987654324:', test3 ? test3.name : 'NOT FOUND');

const test4 = await findUserByMobile('0987654324');
console.log('Test 0987654324:', test4 ? test4.name : 'NOT FOUND');

process.exit(0);
