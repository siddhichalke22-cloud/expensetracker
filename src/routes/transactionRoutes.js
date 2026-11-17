const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema
} = require('../schemas/transactionSchema');

// All transaction routes require authentication
router.use(authenticate);

// Generic transactions
router.post('/', validateBody(createTransactionSchema), TransactionController.create);
router.get('/', validateQuery(transactionFilterSchema), TransactionController.list);
router.get('/:id', TransactionController.getById);
router.put('/:id', validateBody(updateTransactionSchema), TransactionController.update);
router.delete('/:id', TransactionController.delete);

module.exports = router;
