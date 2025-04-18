const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Route to get devices for a user by userId
router.get('/devices/:userid', deviceController.getDeviceDetails);

module.exports = router;
