const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income'], {
    errorMap: () => ({ message: "Type must be either 'expense' or 'income'" })
  }),
  amount: z.number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required').max(100),
  description: z.string().max(500).optional().default(''),
  date: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD').optional(),
  paymentMethod: z.string().max(50).optional().default('Cash')
});

const updateTransactionSchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  date: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD').optional(),
  paymentMethod: z.string().max(50).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided to update'
});

const transactionFilterSchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
  category: z.string().optional(),
  startDate: z.string().regex(dateRegex, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(dateRegex, 'endDate must be YYYY-MM-DD').optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['date', 'amount', 'category', 'type', 'created_at']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema
};
