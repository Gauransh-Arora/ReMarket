const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.get('/my-transactions', transactionController.getMyTransactions);
router.post('/checkout', transactionController.checkout);

module.exports = router;
