const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/categories', AnalyticsController.getCategoryAnalytics);
router.get('/summary', AnalyticsController.getDashboardSummary);

module.exports = router;
