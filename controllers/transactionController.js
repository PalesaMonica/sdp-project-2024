const TransactionModel = require('../models/transactionModel');

const TransactionController = {
    getTransactions: (req, res) => {
        const userId = req.params.user_id;

        TransactionModel.getTransactionsByUserId(userId, (err, data) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(data);
        });
    }
};

module.exports = TransactionController;
