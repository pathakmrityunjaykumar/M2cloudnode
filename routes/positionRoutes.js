const express = require('express');
const positionController = require('../controllers/positionController');

const router = express.Router();

// Route to get the latest position for a device by device ID
router.get('/positions/device/:deviceid', positionController.getLatestPositionByDeviceId);

module.exports = router;
