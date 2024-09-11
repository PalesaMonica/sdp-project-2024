const express = require('express');
const router = express.Router();
const BreakfastController = require('../MenuControllers/breakfastController');

router.get('/',BreakfastController.fetchbreakfastItems);



module.exports = router;

