const { query, dbType } = require('../config/database');

class TransactionModel {
  static async create({ userId, type, amount, category, description, date, paymentMethod }) {
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const method = paymentMethod || 'Cash';
    const desc = description || '';

    if (dbType === 'postgres') {
      const sql = `
        INSERT INTO transactions (user_id, type, amount, category, description, date, payment_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, user_id, type, amount::float, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date, payment_method, created_at, updated_at
      `;
      const res = await query(sql, [userId, type, amount, category, desc, formattedDate, method]);
      return res.rows[0];
    } else {
      const sql = `
        INSERT INTO transactions (user_id, type, amount, category, description, date, payment_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const res = await query(sql, [userId, type, amount, category, desc, formattedDate, method]);
      return this.findById(res.insertId, userId);
    }
  }

  static async findById(id, userId) {
    const dateFormat = dbType === 'postgres' ? "TO_CHAR(date, 'YYYY-MM-DD') as date" : "date";
    const amountFormat = dbType === 'postgres' ? "amount::float as amount" : "amount";
    const sql = `
      SELECT id, user_id, type, ${amountFormat}, category, description, ${dateFormat}, payment_method, created_at, updated_at
      FROM transactions
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;
    const res = await query(sql, [id, userId]);
    return res.rows[0] || null;
  }

  static async findAll(userId, filters = {}) {
    const {
      type,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = filters;

    const conditions = ['user_id = $1'];
    const values = [userId];
    let idx = 2;

    if (type) {
      conditions.push(`type = $${idx++}`);
      values.push(type.toLowerCase());
    }

    if (category) {
      conditions.push(`LOWER(category) = LOWER($${idx++})`);
      values.push(category);
    }

    if (startDate) {
      conditions.push(`date >= $${idx++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`date <= $${idx++}`);
      values.push(endDate);
    }

    if (minAmount !== undefined && minAmount !== null && !isNaN(minAmount)) {
      conditions.push(`amount >= $${idx++}`);
      values.push(Number(minAmount));
    }

    if (maxAmount !== undefined && maxAmount !== null && !isNaN(maxAmount)) {
      conditions.push(`amount <= $${idx++}`);
      values.push(Number(maxAmount));
    }

    if (search) {
      conditions.push(`(LOWER(description) LIKE $${idx} OR LOWER(category) LIKE $${idx})`);
      values.push(`%${search.toLowerCase()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM transactions ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0].total, 10);

    // Sorting safe fields
    const validSortFields = {
      date: 'date',
      amount: 'amount',
      category: 'category',
      type: 'type',
      created_at: 'created_at'
    };
    const orderColumn = validSortFields[sortBy] || 'date';
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const dateFormat = dbType === 'postgres' ? "TO_CHAR(date, 'YYYY-MM-DD') as date" : "date";
    const amountFormat = dbType === 'postgres' ? "amount::float as amount" : "amount";

    const dataSql = `
      SELECT id, user_id, type, ${amountFormat}, category, description, ${dateFormat}, payment_method, created_at, updated_at
      FROM transactions
      ${whereClause}
      ORDER BY ${orderColumn} ${orderDirection}, id ${orderDirection}
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataRes = await query(dataSql, [...values, limitNum, offset]);

    return {
      transactions: dataRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  static async update(id, userId, fields = {}) {
    const allowed = ['type', 'amount', 'category', 'description', 'date', 'payment_method'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) {
      return this.findById(id, userId);
    }

    const updatedAtField = dbType === 'postgres' 
      ? `updated_at = CURRENT_TIMESTAMP` 
      : `updated_at = datetime('now')`;
    updates.push(updatedAtField);

    values.push(id, userId);
    const sql = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++}`;
    const res = await query(sql, values);

    if (res.rowCount === 0) {
      return null;
    }

    return this.findById(id, userId);
  }

  static async delete(id, userId) {
    const sql = `DELETE FROM transactions WHERE id = $1 AND user_id = $2`;
    const res = await query(sql, [id, userId]);
    return res.rowCount > 0;
  }

  /**
   * Analytics & Reports queries
   */
  static async getMonthlyReport(userId, year, month) {
    // Generate date boundaries for the given month
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const startDate = `${y}-${m}-01`;
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    // Previous month dates for comparison
    const prevDateObj = new Date(year, month - 2, 1);
    const prevYear = prevDateObj.getFullYear();
    const prevMonth = prevDateObj.getMonth() + 1;
    const prevM = String(prevMonth).padStart(2, '0');
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevStartDate = `${prevYear}-${prevM}-01`;
    const prevEndDate = `${prevYear}-${prevM}-${String(prevLastDay).padStart(2, '0')}`;

    const amountExpr = dbType === 'postgres' ? 'amount::float' : 'amount';

    // Summary query for this month
    const summarySql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN ${amountExpr} ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ${amountExpr} ELSE 0 END), 0) as total_expense,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE user_id = $1 AND date >= $2 AND date <= $3
    `;
    const summaryRes = await query(summarySql, [userId, startDate, endDate]);
    const summary = summaryRes.rows[0];
    const totalIncome = parseFloat(summary.total_income) || 0;
    const totalExpense = parseFloat(summary.total_expense) || 0;
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(2) : 0;

    // Previous month summary
    const prevSummaryRes = await query(summarySql, [userId, prevStartDate, prevEndDate]);
    const prevSummary = prevSummaryRes.rows[0];
    const prevIncome = parseFloat(prevSummary.total_income) || 0;
    const prevExpense = parseFloat(prevSummary.total_expense) || 0;

    const incomeChangePercent = prevIncome > 0 
      ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(2) 
      : null;
    const expenseChangePercent = prevExpense > 0 
      ? (((totalExpense - prevExpense) / prevExpense) * 100).toFixed(2) 
      : null;

    // Daily breakdown for this month
    const dateFormat = dbType === 'postgres' ? "TO_CHAR(date, 'YYYY-MM-DD')" : "date";
    const dailySql = `
      SELECT 
        ${dateFormat} as date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN ${amountExpr} ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ${amountExpr} ELSE 0 END), 0) as expense,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      GROUP BY ${dateFormat}
      ORDER BY ${dateFormat} ASC
    `;
    const dailyRes = await query(dailySql, [userId, startDate, endDate]);

    // Category breakdown for this month
    const categorySql = `
      SELECT 
        category,
        type,
        COALESCE(SUM(${amountExpr}), 0) as total_amount,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      GROUP BY category, type
      ORDER BY total_amount DESC
    `;
    const categoryRes = await query(categorySql, [userId, startDate, endDate]);

    const expenseCategories = [];
    const incomeCategories = [];

    for (const row of categoryRes.rows) {
      const amount = parseFloat(row.total_amount);
      const item = {
        category: row.category,
        amount,
        count: parseInt(row.count, 10),
        percentage: row.type === 'expense' && totalExpense > 0
          ? ((amount / totalExpense) * 100).toFixed(2)
          : row.type === 'income' && totalIncome > 0
          ? ((amount / totalIncome) * 100).toFixed(2)
          : 0
      };
      if (row.type === 'expense') {
        expenseCategories.push(item);
      } else {
        incomeCategories.push(item);
      }
    }

    return {
      period: {
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        startDate,
        endDate
      },
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netSavings: Number(netSavings.toFixed(2)),
        savingsRate: Number(savingsRate),
        totalTransactions: parseInt(summary.total_transactions, 10)
      },
      comparisonWithPreviousMonth: {
        previousMonth: `${prevYear}-${prevM}`,
        previousIncome: Number(prevIncome.toFixed(2)),
        previousExpense: Number(prevExpense.toFixed(2)),
        incomeChangePercent: incomeChangePercent !== null ? Number(incomeChangePercent) : null,
        expenseChangePercent: expenseChangePercent !== null ? Number(expenseChangePercent) : null
      },
      categoryBreakdown: {
        expenses: expenseCategories,
        income: incomeCategories
      },
      dailyBreakdown: dailyRes.rows.map(r => ({
        date: r.date,
        income: Number(parseFloat(r.income).toFixed(2)),
        expense: Number(parseFloat(r.expense).toFixed(2)),
        net: Number((parseFloat(r.income) - parseFloat(r.expense)).toFixed(2)),
        transactionCount: parseInt(r.count, 10)
      }))
    };
  }

  static async getAnnualReport(userId, year) {
    const y = String(year);
    const startDate = `${y}-01-01`;
    const endDate = `${y}-12-31`;

    const amountExpr = dbType === 'postgres' ? 'amount::float' : 'amount';
    const monthExpr = dbType === 'postgres' 
      ? "EXTRACT(MONTH FROM date)::int" 
      : "CAST(strftime('%m', date) AS INTEGER)";

    const sql = `
      SELECT 
        ${monthExpr} as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN ${amountExpr} ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ${amountExpr} ELSE 0 END), 0) as expense,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      GROUP BY ${monthExpr}
      ORDER BY month ASC
    `;
    const res = await query(sql, [userId, startDate, endDate]);

    const monthMap = {};
    for (let i = 1; i <= 12; i++) {
      monthMap[i] = { month: i, income: 0, expense: 0, netSavings: 0, transactionCount: 0 };
    }

    let yearlyIncome = 0;
    let yearlyExpense = 0;
    let totalTransactions = 0;

    for (const row of res.rows) {
      const m = parseInt(row.month, 10);
      const inc = parseFloat(row.income) || 0;
      const exp = parseFloat(row.expense) || 0;
      yearlyIncome += inc;
      yearlyExpense += exp;
      totalTransactions += parseInt(row.count, 10);

      monthMap[m] = {
        month: m,
        income: Number(inc.toFixed(2)),
        expense: Number(exp.toFixed(2)),
        netSavings: Number((inc - exp).toFixed(2)),
        transactionCount: parseInt(row.count, 10)
      };
    }

    const monthlyBreakdown = Object.values(monthMap);
    const netSavings = yearlyIncome - yearlyExpense;
    const savingsRate = yearlyIncome > 0 ? ((netSavings / yearlyIncome) * 100).toFixed(2) : 0;

    // Highest and lowest spending months
    let highestSpendingMonth = null;
    let lowestSpendingMonth = null;
    let activeExpenseMonths = monthlyBreakdown.filter(m => m.expense > 0);

    if (activeExpenseMonths.length > 0) {
      highestSpendingMonth = activeExpenseMonths.reduce((prev, curr) => (curr.expense > prev.expense ? curr : prev));
      lowestSpendingMonth = activeExpenseMonths.reduce((prev, curr) => (curr.expense < prev.expense ? curr : prev));
    }

    return {
      year: parseInt(year, 10),
      summary: {
        yearlyIncome: Number(yearlyIncome.toFixed(2)),
        yearlyExpense: Number(yearlyExpense.toFixed(2)),
        netSavings: Number(netSavings.toFixed(2)),
        savingsRate: Number(savingsRate),
        monthlyAverageExpense: Number((yearlyExpense / 12).toFixed(2)),
        monthlyAverageIncome: Number((yearlyIncome / 12).toFixed(2)),
        totalTransactions,
        highestSpendingMonth: highestSpendingMonth ? { month: highestSpendingMonth.month, amount: highestSpendingMonth.expense } : null,
        lowestSpendingMonth: lowestSpendingMonth ? { month: lowestSpendingMonth.month, amount: lowestSpendingMonth.expense } : null
      },
      monthlyBreakdown
    };
  }

  static async getCategoryAnalytics(userId, options = {}) {
    const { type = 'expense', startDate, endDate, month, year } = options;

    const conditions = ['user_id = $1'];
    const values = [userId];
    let idx = 2;

    if (type && type !== 'all') {
      conditions.push(`type = $${idx++}`);
      values.push(type.toLowerCase());
    }

    if (startDate) {
      conditions.push(`date >= $${idx++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`date <= $${idx++}`);
      values.push(endDate);
    }

    if (year && month) {
      const m = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      conditions.push(`date >= $${idx++} AND date <= $${idx++}`);
      values.push(`${year}-${m}-01`, `${year}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (year) {
      conditions.push(`date >= $${idx++} AND date <= $${idx++}`);
      values.push(`${year}-01-01`, `${year}-12-31`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const amountExpr = dbType === 'postgres' ? 'amount::float' : 'amount';

    // Total query for calculating percentages
    const totalSql = `SELECT COALESCE(SUM(${amountExpr}), 0) as grand_total FROM transactions ${whereClause}`;
    const totalRes = await query(totalSql, values);
    const grandTotal = parseFloat(totalRes.rows[0].grand_total) || 0;

    // Category aggregation
    const sql = `
      SELECT 
        category,
        type,
        COALESCE(SUM(${amountExpr}), 0) as total_amount,
        COUNT(*) as transaction_count,
        AVG(${amountExpr}) as average_amount,
        MIN(${amountExpr}) as min_amount,
        MAX(${amountExpr}) as max_amount
      FROM transactions
      ${whereClause}
      GROUP BY category, type
      ORDER BY total_amount DESC
    `;
    const res = await query(sql, values);

    const categories = res.rows.map(row => {
      const totalAmount = parseFloat(row.total_amount) || 0;
      return {
        category: row.category,
        type: row.type,
        totalAmount: Number(totalAmount.toFixed(2)),
        transactionCount: parseInt(row.transaction_count, 10),
        percentage: grandTotal > 0 ? Number(((totalAmount / grandTotal) * 100).toFixed(2)) : 0,
        averageAmount: Number((parseFloat(row.average_amount) || 0).toFixed(2)),
        minAmount: Number((parseFloat(row.min_amount) || 0).toFixed(2)),
        maxAmount: Number((parseFloat(row.max_amount) || 0).toFixed(2))
      };
    });

    return {
      filter: {
        type: type || 'all',
        startDate: startDate || null,
        endDate: endDate || null,
        year: year ? parseInt(year, 10) : null,
        month: month ? parseInt(month, 10) : null
      },
      grandTotal: Number(grandTotal.toFixed(2)),
      categoryCount: categories.length,
      categories
    };
  }

  static async getDashboardSummary(userId) {
    const amountExpr = dbType === 'postgres' ? 'amount::float' : 'amount';

    // All time totals
    const allTimeSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN ${amountExpr} ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ${amountExpr} ELSE 0 END), 0) as total_expense,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE user_id = $1
    `;
    const allTimeRes = await query(allTimeSql, [userId]);
    const allTime = allTimeRes.rows[0];
    const totalIncome = parseFloat(allTime.total_income) || 0;
    const totalExpense = parseFloat(allTime.total_expense) || 0;

    // Current month totals
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curStartDate = `${curYear}-${curMonth}-01`;
    const curLastDay = new Date(curYear, now.getMonth() + 1, 0).getDate();
    const curEndDate = `${curYear}-${curMonth}-${String(curLastDay).padStart(2, '0')}`;

    const curMonthSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN ${amountExpr} ELSE 0 END), 0) as month_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ${amountExpr} ELSE 0 END), 0) as month_expense
      FROM transactions
      WHERE user_id = $1 AND date >= $2 AND date <= $3
    `;
    const curMonthRes = await query(curMonthSql, [userId, curStartDate, curEndDate]);
    const curMonthData = curMonthRes.rows[0];
    const monthIncome = parseFloat(curMonthData.month_income) || 0;
    const monthExpense = parseFloat(curMonthData.month_expense) || 0;

    // Top spending category this month
    const topCatSql = `
      SELECT category, COALESCE(SUM(${amountExpr}), 0) as total
      FROM transactions
      WHERE user_id = $1 AND type = 'expense' AND date >= $2 AND date <= $3
      GROUP BY category
      ORDER BY total DESC
      LIMIT 1
    `;
    const topCatRes = await query(topCatSql, [userId, curStartDate, curEndDate]);
    const topCategory = topCatRes.rows[0] ? {
      category: topCatRes.rows[0].category,
      amount: Number(parseFloat(topCatRes.rows[0].total).toFixed(2))
    } : null;

    // Recent 5 transactions
    const dateFormat = dbType === 'postgres' ? "TO_CHAR(date, 'YYYY-MM-DD') as date" : "date";
    const recentSql = `
      SELECT id, type, ${amountExpr} as amount, category, description, ${dateFormat}, payment_method, created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY date DESC, id DESC
      LIMIT 5
    `;
    const recentRes = await query(recentSql, [userId]);

    return {
      allTime: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netBalance: Number((totalIncome - totalExpense).toFixed(2)),
        totalTransactions: parseInt(allTime.total_transactions, 10)
      },
      currentMonth: {
        period: `${curYear}-${curMonth}`,
        income: Number(monthIncome.toFixed(2)),
        expense: Number(monthExpense.toFixed(2)),
        netSavings: Number((monthIncome - monthExpense).toFixed(2)),
        topExpenseCategory: topCategory
      },
      recentTransactions: recentRes.rows
    };
  }
}

module.exports = TransactionModel;
