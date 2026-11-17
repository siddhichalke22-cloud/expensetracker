const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await UserModel.create({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword
      });

      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.created_at
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const token = generateToken(user);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.created_at
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      let newHashedPassword = null;
      if (newPassword) {
        // Fetch full user record including password
        const fullUser = await UserModel.findByEmail(req.user.email);
        const isMatch = await bcrypt.compare(currentPassword, fullUser.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Current password does not match.'
          });
        }
        const salt = await bcrypt.genSalt(10);
        newHashedPassword = await bcrypt.hash(newPassword, salt);
      }

      const updated = await UserModel.update(userId, {
        name,
        password: newHashedPassword
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updated
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
