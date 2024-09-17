const express = require('express');
const MealCreditController = require('../controllers/mealCreditController');
const router = express.Router();

router.get('/:user_id', MealCreditController.getMealCredits);

module.exports = router;
