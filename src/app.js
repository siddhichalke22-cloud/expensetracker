const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { NODE_ENV } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Controllers for convenience routes
const authenticate = require('./middleware/auth');
const TransactionController = require('./controllers/transactionController');
const { validateBody, validateQuery } = require('./middleware/validate');
const { createTransactionSchema, transactionFilterSchema } = require('./schemas/transactionSchema');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint: API documentation & overview
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Expense Tracker API',
    version: '1.0.0',
    description: 'RESTful API for tracking expenses, income, monthly financial reports, and category-wise analytics',
    documentation: {
      auth: {
        'POST /api/auth/register': 'Register a new user account',
        'POST /api/auth/login': 'Authenticate user and obtain JWT token',
        'GET /api/auth/me': 'Get current user profile (requires Bearer token)',
        'PUT /api/auth/profile': 'Update profile / password (requires Bearer token)'
      },
      transactions: {
        'POST /api/transactions': 'Record a new transaction (expense or income)',
        'GET /api/transactions': 'List transactions with filters (type, category, date, minAmount, maxAmount, pagination)',
        'GET /api/transactions/:id': 'Get details of a specific transaction',
        'PUT /api/transactions/:id': 'Update an existing transaction',
        'DELETE /api/transactions/:id': 'Delete a transaction',
        'POST /api/expenses': 'Convenience endpoint to record an expense',
        'GET /api/expenses': 'Convenience endpoint to list expenses',
        'POST /api/income': 'Convenience endpoint to record income',
        'GET /api/income': 'Convenience endpoint to list income'
      },
      reports: {
        'GET /api/reports/monthly?year=YYYY&month=MM': 'Comprehensive monthly report with income, expense, net savings, savings rate, daily breakdown, and MoM comparison',
        'GET /api/reports/annual?year=YYYY': 'Annual report with 12-month summary breakdown and spending analysis'
      },
      analytics: {
        'GET /api/analytics/categories?type=expense|income|all&year=YYYY&month=MM': 'Category-wise distribution, percentages, totals, and averages',
        'GET /api/analytics/summary': 'Dashboard summary with all-time and current month metrics'
      }
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Convenience routes for direct /api/expenses and /api/income
const expenseIncomeRouter = express.Router();
expenseIncomeRouter.use(authenticate);

expenseIncomeRouter.post('/expenses', (req, res, next) => {
  req.body.type = 'expense';
  next();
}, validateBody(createTransactionSchema), TransactionController.create);

expenseIncomeRouter.get('/expenses', (req, res, next) => {
  req.query.type = 'expense';
  next();
}, validateQuery(transactionFilterSchema), TransactionController.list);

expenseIncomeRouter.post('/income', (req, res, next) => {
  req.body.type = 'income';
  next();
}, validateBody(createTransactionSchema), TransactionController.create);

expenseIncomeRouter.get('/income', (req, res, next) => {
  req.query.type = 'income';
  next();
}, validateQuery(transactionFilterSchema), TransactionController.list);

app.use('/api', expenseIncomeRouter);

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
