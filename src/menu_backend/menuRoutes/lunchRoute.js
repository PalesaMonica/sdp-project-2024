const express = require('express');
const router = express.Router();
const LunchController = require('../MenuControllers/lunchController');

router.get('/', LunchController.fetchLunchItems);



module.exports = router;

