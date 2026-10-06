import express from 'express';
import {
  login,
  register,
  sendMobileOtp,
  verifyMobileOtp,
  refreshToken,
  forgotPassword
} from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/mobile-otp-send', sendMobileOtp);
router.post('/mobile-otp-verify', verifyMobileOtp);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);

export default router;
