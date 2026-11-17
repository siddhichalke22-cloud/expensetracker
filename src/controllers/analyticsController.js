const TransactionModel = require('../models/transactionModel');

class AnalyticsController {
  static async getCategoryAnalytics(req, res, next) {
    try {
      const userId = req.user.id;
      const { type = 'expense', startDate, endDate, month, year } = req.query;

      if (type && !['expense', 'income', 'all'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Type must be 'expense', 'income', or 'all'"
        });
      }

      const analytics = await TransactionModel.getCategoryAnalytics(userId, {
        type,
        startDate,
        endDate,
        month,
        year
      });

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardSummary(req, res, next) {
    try {
      const userId = req.user.id;
      const summary = await TransactionModel.getDashboardSummary(userId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController;
