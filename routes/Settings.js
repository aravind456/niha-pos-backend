const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// எல்லா மாடல்களையும் இம்போர்ட் செய்யவும் (அப்போதுதான் டெலீட் செய்ய முடியும்)
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');

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

// Master Reset API
router.post('/master-reset', async (req, res) => {
    const { type, userMobile } = req.body;

    try {
        let result;
        switch (type) {
            case "BILLS":
                result = await Invoice.deleteMany({ userMobile });
                break;
            case "PRODUCTS":
                result = await Product.deleteMany({ userMobile });
                break;
            case "CUSTOMERS":
                result = await Customer.deleteMany({ userMobile });
                break;
            case "SUPPLIERS":
                result = await Supplier.deleteMany({ userMobile });
                break;
            case "STOCK":
                await Purchase.deleteMany({ userMobile });
                // ஸ்டாக் ரீசெட் செய்ய Product-ல் உள்ள qty-ஐ 0 ஆக்கலாம் அல்லது அப்படியே விடலாம்
                break;
            case "LEDGER":
                await Payment.deleteMany({ userMobile });
                await Receipt.deleteMany({ userMobile });
                break;
            default:
                return res.status(400).json({ message: "Invalid reset type" });
        }

        res.status(200).json({ success: true, message: `${type} deleted successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during deletion" });
    }
});

module.exports = router;

module.exports = router;