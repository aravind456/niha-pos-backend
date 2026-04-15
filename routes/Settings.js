const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// 1. Specific User-oda settings-ai edukkum (GET)
// Path: /api/settings/:userMobile
router.get('/:userMobile', async (req, res) => {
    try {
        // Inga specific mobile number-ai vachi search panroam
        let settings = await Settings.findOne({ userMobile: req.params.userMobile });
        
        if (!settings) {
            // Settings illai na, andha mobile-ku pudhu default create panroam
            settings = new Settings({ 
                userMobile: req.params.userMobile,
                adminPin: "1234", // Default PIN
                shopName: "My Shop",
                lockCustomer: false,
                lockProduct: false,
                lockBilling: false,
                lockSales: false
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Specific User-oda settings-ai update panna (PUT)
router.put('/update', async (req, res) => {
    try {
        const { userMobile } = req.body;
        
        // userMobile vachu search panni update pannu, illana pudhusa create pannu (upsert)
        const updatedSettings = await Settings.findOneAndUpdate(
            { userMobile: userMobile }, 
            { $set: req.body }, 
            { new: true, upsert: true }
        );
        res.json(updatedSettings);
    } catch (err) {
        console.log("Update Error:", err.message);
        res.status(400).json({ message: err.message });
    }
});

// 3. Admin PIN check panna (POST)
router.post('/verify-pin', async (req, res) => {
    const { userMobile, pin } = req.body;
    try {
        const settings = await Settings.findOne({ userMobile: userMobile });
        if (settings && settings.adminPin === pin) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: "Invalid PIN" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;