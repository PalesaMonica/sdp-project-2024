const db = require('../config/db');

const MealCreditModel = {
    getMealCreditsByUserId: (userId, callback) => {
        const query = 'SELECT remaining_credits FROM meal_credits WHERE user_id = ?';
        db.query(query, [userId], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results[0]);
        });
    }
};

module.exports = MealCreditModel;
