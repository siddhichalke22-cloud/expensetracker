const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema, updateProfileSchema } = require('../schemas/authSchema');

// Public routes
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);

// Protected routes
router.get('/me', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);

module.exports = router;
