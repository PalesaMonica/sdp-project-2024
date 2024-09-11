const express = require('express');
const router = express.Router();
const DinnerController = require('../MenuControllers/dinnerController');

router.get('/', DinnerController.fetchDinnerItems);



module.exports = router;

