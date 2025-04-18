const deviceModel = require('../models/deviceModel');

// Controller to fetch devices associated with a user
const getDeviceDetails = async (req, res) => {
    const userId = req.params.userid;

    try {
        // Get devices with header 'AD' from the model
        const devices = await deviceModel.getDeviceDetailsByUserId(userId);

        // Send the devices array in response
        res.json(devices); // Only devices data without additional fields
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getDeviceDetails
};