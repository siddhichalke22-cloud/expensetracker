const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/monthly', ReportController.getMonthlyReport);
router.get('/annual', ReportController.getAnnualReport);

module.exports = router;
