# 💰 Expense Tracker API

A production-grade RESTful Expense Tracker API built with Node.js, Express, JWT Authentication, and universal SQL database support (PostgreSQL & SQLite).

---

## 🚀 Features

- **🔐 User Authentication**
  - Secure registration and login with bcrypt password hashing
  - JWT (JSON Web Token) authentication signed with `JWT_SECRET`
  - Multi-tenant data isolation: users can only view and manage their own financial data
  - User profile retrieval and password update endpoints

- **💸 Track Expenses & Income**
  - Record, retrieve, update, and delete expenses and income
  - Filter by transaction type (`expense` | `income`), category, date range (`startDate`, `endDate`), and amount limits
  - Full-text search across descriptions and categories
  - Cursor/offset pagination (`page`, `limit`) and flexible sorting (`date`, `amount`, `category`, `type`)
  - Dedicated convenience endpoints (`/api/expenses`, `/api/income`)

- **📊 Monthly Financial Reports**
  - Monthly financial summary: Total Income, Total Expenses, Net Savings, and Savings Rate (%)
  - Month-over-month (MoM) comparison with percentage changes
  - Daily spending/income breakdown across the month
  - Category-by-category breakdown for expenses and income within the selected period
  - Annual report (`/api/reports/annual`) providing a complete 12-month financial breakdown with highest/lowest spending months

- **📈 Category-Wise Analytics**
  - Grouped financial analytics by category (`/api/analytics/categories`)
  - Total expenditure/income per category, transaction count, percentage distribution, and average transaction amount
  - Dashboard overview (`/api/analytics/summary`) showing all-time totals, current month status, and recent activity

- **🗄️ Universal Database Engine**
  - Seamlessly supports both **PostgreSQL** and **SQLite** via `DATABASE_URL`
  - Zero-configuration local development: defaults to SQLite (`./data/expense_tracker.db`)
  - Production-ready for PostgreSQL (`postgresql://...`) with connection pooling

---

## ⚙️ Environment Variables

The application is configured using standard environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server listening port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string or SQLite file path | `sqlite://./data/expense_tracker.db` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | *Required in production* |
| `JWT_EXPIRES_IN` | JWT token expiration lifespan | `7d` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |

### Configuration Examples

#### Using SQLite (Zero setup, default)
```env
PORT=3000
DATABASE_URL=sqlite://./data/expense_tracker.db
JWT_SECRET=super_secure_jwt_secret_key_2026
```

#### Using PostgreSQL
```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker
JWT_SECRET=super_secure_jwt_secret_key_2026
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Run the Server
```bash
# Start in development mode (with auto-reload)
npm run dev

# Start in production mode
npm start
```

### 4. Run Automated Tests
```bash
npm test
```

---

## 📚 API Reference

Base URL: `http://localhost:3000`

### 1. Authentication (`/api/auth`)

#### Register a new user
`POST /api/auth/register`
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-03-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
`POST /api/auth/login`
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

#### Get Current Profile
`GET /api/auth/me`  
*Header: `Authorization: Bearer <token>`*

---

### 2. Transactions (`/api/transactions`)
*All transaction endpoints require `Authorization: Bearer <token>`.*

#### Record a Transaction
`POST /api/transactions`
```json
{
  "type": "expense",
  "amount": 84.50,
  "category": "Groceries",
  "description": "Weekly supermarket shopping",
  "date": "2026-03-15",
  "paymentMethod": "Credit Card"
}
```

#### List Transactions (with Filtering & Pagination)
`GET /api/transactions?type=expense&category=Groceries&startDate=2026-03-01&endDate=2026-03-31&page=1&limit=20&sortBy=date&sortOrder=desc`

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "user_id": 1,
        "type": "expense",
        "amount": 84.5,
        "category": "Groceries",
        "description": "Weekly supermarket shopping",
        "date": "2026-03-15",
        "payment_method": "Credit Card",
        "created_at": "2026-03-15 10:20:00",
        "updated_at": "2026-03-15 10:20:00"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

#### Convenience Endpoints
- `POST /api/expenses` - Create an expense directly
- `GET /api/expenses` - Filter expenses directly
- `POST /api/income` - Create an income entry directly
- `GET /api/income` - Filter income directly

---

### 3. Monthly & Annual Reports (`/api/reports`)

#### Get Monthly Report
`GET /api/reports/monthly?year=2026&month=3`  
*Header: `Authorization: Bearer <token>`*

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "year": 2026,
      "month": 3,
      "startDate": "2026-03-01",
      "endDate": "2026-03-31"
    },
    "summary": {
      "totalIncome": 4500.00,
      "totalExpense": 1250.75,
      "netSavings": 3249.25,
      "savingsRate": 72.21,
      "totalTransactions": 18
    },
    "comparisonWithPreviousMonth": {
      "previousMonth": "2026-02",
      "previousIncome": 4200.00,
      "previousExpense": 1400.00,
      "incomeChangePercent": 7.14,
      "expenseChangePercent": -10.66
    },
    "categoryBreakdown": {
      "expenses": [
        { "category": "Rent & Housing", "amount": 800.00, "count": 1, "percentage": 63.96 },
        { "category": "Groceries", "amount": 250.75, "count": 4, "percentage": 20.05 },
        { "category": "Utilities", "amount": 200.00, "count": 2, "percentage": 15.99 }
      ],
      "income": [
        { "category": "Salary", "amount": 4500.00, "count": 1, "percentage": 100.00 }
      ]
    },
    "dailyBreakdown": [
      { "date": "2026-03-01", "income": 4500.00, "expense": 800.00, "net": 3700.00, "transactionCount": 2 },
      { "date": "2026-03-05", "income": 0.00, "expense": 65.20, "net": -65.20, "transactionCount": 1 }
    ]
  }
}
```

#### Get Annual Report
`GET /api/reports/annual?year=2026`  
*Header: `Authorization: Bearer <token>`*

---

### 4. Category-Wise Analytics (`/api/analytics`)

#### Category Breakdown
`GET /api/analytics/categories?type=expense&year=2026&month=3`  
*Header: `Authorization: Bearer <token>`*

**Response:**
```json
{
  "success": true,
  "data": {
    "filter": {
      "type": "expense",
      "startDate": null,
      "endDate": null,
      "year": 2026,
      "month": 3
    },
    "grandTotal": 1250.75,
    "categoryCount": 3,
    "categories": [
      {
        "category": "Rent & Housing",
        "type": "expense",
        "totalAmount": 800.00,
        "transactionCount": 1,
        "percentage": 63.96,
        "averageAmount": 800.00,
        "minAmount": 800.00,
        "maxAmount": 800.00
      },
      {
        "category": "Groceries",
        "type": "expense",
        "totalAmount": 250.75,
        "transactionCount": 4,
        "percentage": 20.05,
        "averageAmount": 62.69,
        "minAmount": 34.20,
        "maxAmount": 95.50
      }
    ]
  }
}
```

#### Real-time Dashboard Summary
`GET /api/analytics/summary`  
*Header: `Authorization: Bearer <token>`*

---

## 🔒 Security & Best Practices

- Passwords hashed with `bcryptjs` using 10 salt rounds.
- SQL queries are strictly parameterized to prevent SQL Injection.
- Input validation on all incoming request bodies and query strings using `Zod`.
- Strict user data isolation on every transaction query.
- Proper HTTP response codes (`200`, `201`, `400`, `401`, `404`, `409`, `500`).
