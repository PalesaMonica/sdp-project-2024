const db = require('../config/db');

const TransactionModel = {
    getTransactionsByUserId: (userId, callback) => {
        const query = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 10';
        db.query(query, [userId], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results);
        });
    }
};

module.exports = TransactionModel;
