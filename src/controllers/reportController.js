const TransactionModel = require('../models/transactionModel');

class ReportController {
  static async getMonthlyReport(req, res, next) {
    try {
      const userId = req.user.id;
      const now = new Date();

      const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month, 10) : (now.getMonth() + 1);

      if (isNaN(year) || year < 1970 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year specified. Must be between 1970 and 2100.'
        });
      }

      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month specified. Must be an integer between 1 and 12.'
        });
      }

      const report = await TransactionModel.getMonthlyReport(userId, year, month);

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAnnualReport(req, res, next) {
    try {
      const userId = req.user.id;
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();

      if (isNaN(year) || year < 1970 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year specified. Must be between 1970 and 2100.'
        });
      }

      const report = await TransactionModel.getAnnualReport(userId, year);

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
