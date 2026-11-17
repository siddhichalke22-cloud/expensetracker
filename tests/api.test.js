process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite://:memory:';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
process.env.PORT = '3001';

const request = require('supertest');
const app = require('../src/app');
const { initDatabase, closeDatabase } = require('../src/config/database');

describe('Expense Tracker API Test Suite', () => {
  let authToken = '';
  let secondUserToken = '';
  let createdExpenseId = null;
  let createdIncomeId = null;

  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('1. Health & Root Documentation Endpoints', () => {
    it('GET /health should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET / should return API overview and documentation', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Expense Tracker API');
      expect(res.body.documentation).toBeDefined();
    });
  });

  describe('2. User Authentication (JWT_SECRET)', () => {
    it('POST /api/auth/register should register a new user and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Johnson',
          email: 'alice@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.password).toBeUndefined(); // Password must never be exposed
      expect(res.body.data.token).toBeDefined();

      authToken = res.body.data.token;
    });

    it('POST /api/auth/register should fail on duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Again',
          email: 'alice@example.com',
          password: 'anotherpassword'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/register should fail with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login should authenticate valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('POST /api/auth/login should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me should return current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('alice@example.com');
    });

    it('GET /api/auth/me should reject requests without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('Register a second user for multi-tenant isolation testing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob Smith',
          email: 'bob@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      secondUserToken = res.body.data.token;
    });
  });

  describe('3. Track Expenses & Income (Transactions)', () => {
    it('POST /api/transactions should record an expense', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          amount: 45.50,
          category: 'Food & Dining',
          description: 'Grocery shopping',
          date: '2026-03-05',
          paymentMethod: 'Credit Card'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.type).toBe('expense');
      expect(res.body.data.transaction.amount).toBe(45.50);
      expect(res.body.data.transaction.category).toBe('Food & Dining');

      createdExpenseId = res.body.data.transaction.id;
    });

    it('POST /api/transactions should record an income', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'income',
          amount: 3500.00,
          category: 'Salary',
          description: 'Monthly payroll',
          date: '2026-03-01',
          paymentMethod: 'Bank Transfer'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.type).toBe('income');
      expect(res.body.data.transaction.amount).toBe(3500.00);

      createdIncomeId = res.body.data.transaction.id;
    });

    it('POST /api/expenses should record an expense using convenience route', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 120.00,
          category: 'Utilities',
          description: 'Electricity bill',
          date: '2026-03-10',
          paymentMethod: 'Online'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.type).toBe('expense');
      expect(res.body.data.transaction.category).toBe('Utilities');
    });

    it('POST /api/income should record income using convenience route', async () => {
      const res = await request(app)
        .post('/api/income')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 400.00,
          category: 'Freelance',
          description: 'Web design project',
          date: '2026-03-12',
          paymentMethod: 'UPI'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.type).toBe('income');
    });

    it('Populate additional historical transactions for reports and analytics', async () => {
      // Additional transactions for March 2026
      await request(app).post('/api/transactions').set('Authorization', `Bearer ${authToken}`).send({
        type: 'expense', amount: 80.00, category: 'Food & Dining', date: '2026-03-15', description: 'Dinner with friends'
      });
      await request(app).post('/api/transactions').set('Authorization', `Bearer ${authToken}`).send({
        type: 'expense', amount: 60.00, category: 'Transportation', date: '2026-03-18', description: 'Gasoline refill'
      });
      await request(app).post('/api/transactions').set('Authorization', `Bearer ${authToken}`).send({
        type: 'expense', amount: 300.00, category: 'Shopping', date: '2026-03-22', description: 'New headphones'
      });

      // Previous month (February 2026) for comparison
      await request(app).post('/api/transactions').set('Authorization', `Bearer ${authToken}`).send({
        type: 'income', amount: 3500.00, category: 'Salary', date: '2026-02-01', description: 'Feb Salary'
      });
      await request(app).post('/api/transactions').set('Authorization', `Bearer ${authToken}`).send({
        type: 'expense', amount: 400.00, category: 'Food & Dining', date: '2026-02-14', description: 'Feb Dining'
      });
    });

    it('GET /api/transactions should list transactions with pagination', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(5);
    });

    it('GET /api/transactions should filter by type (expense)', async () => {
      const res = await request(app)
        .get('/api/transactions?type=expense')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.every(t => t.type === 'expense')).toBe(true);
    });

    it('GET /api/transactions should filter by category', async () => {
      const res = await request(app)
        .get('/api/transactions?category=Utilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.every(t => t.category === 'Utilities')).toBe(true);
    });

    it('GET /api/transactions/:id should return single transaction', async () => {
      const res = await request(app)
        .get(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transaction.id).toBe(createdExpenseId);
    });

    it('GET /api/transactions/:id should prevent unauthorized access from another user', async () => {
      const res = await request(app)
        .get(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(res.status).toBe(404); // Returns 404 for isolation
    });

    it('PUT /api/transactions/:id should update a transaction', async () => {
      const res = await request(app)
        .put(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 52.00,
          description: 'Updated grocery shopping receipt'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.transaction.amount).toBe(52.00);
      expect(res.body.data.transaction.description).toBe('Updated grocery shopping receipt');
    });

    it('DELETE /api/transactions/:id should delete a transaction', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${createdIncomeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/transactions/${createdIncomeId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe('4. Monthly Expense Reports', () => {
    it('GET /api/reports/monthly should generate monthly breakdown and report', async () => {
      const res = await request(app)
        .get('/api/reports/monthly?year=2026&month=3')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period.year).toBe(2026);
      expect(res.body.data.period.month).toBe(3);

      // Financial summary
      const summary = res.body.data.summary;
      expect(summary.totalIncome).toBeDefined();
      expect(summary.totalExpense).toBeDefined();
      expect(summary.netSavings).toBeDefined();
      expect(summary.savingsRate).toBeDefined();

      // Comparison with previous month
      expect(res.body.data.comparisonWithPreviousMonth).toBeDefined();
      expect(res.body.data.comparisonWithPreviousMonth.previousMonth).toBe('2026-02');

      // Daily breakdown
      expect(Array.isArray(res.body.data.dailyBreakdown)).toBe(true);
      expect(res.body.data.dailyBreakdown.length).toBeGreaterThan(0);

      // Category breakdown
      expect(Array.isArray(res.body.data.categoryBreakdown.expenses)).toBe(true);
    });

    it('GET /api/reports/annual should generate 12-month summary report', async () => {
      const res = await request(app)
        .get('/api/reports/annual?year=2026')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.year).toBe(2026);
      expect(res.body.data.monthlyBreakdown.length).toBe(12);
      expect(res.body.data.summary.yearlyExpense).toBeGreaterThan(0);
    });
  });

  describe('5. Category-wise Analytics', () => {
    it('GET /api/analytics/categories should return category spending distribution', async () => {
      const res = await request(app)
        .get('/api/analytics/categories?type=expense&year=2026&month=3')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grandTotal).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThan(0);

      const topCat = res.body.data.categories[0];
      expect(topCat.category).toBeDefined();
      expect(topCat.totalAmount).toBeGreaterThan(0);
      expect(topCat.percentage).toBeGreaterThan(0);
      expect(topCat.averageAmount).toBeDefined();
    });

    it('GET /api/analytics/summary should return dashboard overview', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.allTime).toBeDefined();
      expect(res.body.data.currentMonth).toBeDefined();
      expect(Array.isArray(res.body.data.recentTransactions)).toBe(true);
    });
  });
});
