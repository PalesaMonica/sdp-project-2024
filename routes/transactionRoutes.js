const express = require('express');
const TransactionController = require('../controllers/transactionController');
const router = express.Router();

router.get('/:user_id', TransactionController.getTransactions);

module.exports = router;
