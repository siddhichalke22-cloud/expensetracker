require('dotenv').config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'sqlite://./data/expense_tracker.db';
const JWT_SECRET = process.env.JWT_SECRET || 'default_super_secret_jwt_key_for_expense_tracker_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  NODE_ENV
};
