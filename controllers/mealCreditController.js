const MealCreditModel = require('../models/mealCreditModel');

const MealCreditController = {
    getMealCredits: (req, res) => {
        const userId = req.params.user_id;

        MealCreditModel.getMealCreditsByUserId(userId, (err, data) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(data);
        });
    }
};

module.exports = MealCreditController;
