const TransactionModel = require('../models/transactionModel');

class TransactionController {
  static async create(req, res, next) {
    try {
      const userId = req.user.id;
      const { type, amount, category, description, date, paymentMethod } = req.body;

      const transaction = await TransactionModel.create({
        userId,
        type,
        amount,
        category,
        description,
        date,
        paymentMethod
      });

      res.status(201).json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} recorded successfully`,
        data: { transaction }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createExpense(req, res, next) {
    req.body.type = 'expense';
    return TransactionController.create(req, res, next);
  }

  static async createIncome(req, res, next) {
    req.body.type = 'income';
    return TransactionController.create(req, res, next);
  }

  static async list(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await TransactionModel.findAll(userId, req.query);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const transaction = await TransactionModel.findById(id, userId);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.status(200).json({
        success: true,
        data: { transaction }
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Verify existence and ownership
      const existing = await TransactionModel.findById(id, userId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      const updated = await TransactionModel.update(id, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        data: { transaction: updated }
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const deleted = await TransactionModel.delete(id, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TransactionController;
