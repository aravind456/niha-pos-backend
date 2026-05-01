const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// மாடல்களை இம்போர்ட் செய்யும் போது பெயர்கள் சரியாக இருக்கிறதா எனச் சரிபார்க்கவும்
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');

// 1. Get Settings
router.get('/:userMobile', async (req, res) => {
    try {
        let settings = await Settings.findOne({ userMobile: req.params.userMobile });
        if (!settings) {
            settings = new Settings({ 
                userMobile: req.params.userMobile,
                adminPin: "1234", 
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

// 2. Update Settings
router.put('/update', async (req, res) => {
    try {
        const { userMobile } = req.body;
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

// 3. Verify Admin PIN
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

// 4. Master Reset API (திருத்தப்பட்டது)
router.post('/master-reset', async (req, res) => {
    const { type, userMobile } = req.body;
    
    // Debugging-க்காக பிரிண்ட் செய்து பாருங்கள்
    console.log(`Reset Request: Type=${type}, Mobile=${userMobile}`);

    if (!userMobile) {
        return res.status(400).json({ success: false, message: "User mobile is required" });
    }

    try {
        switch (type) {
            case "BILLS":
                await Invoice.deleteMany({ userMobile: userMobile });
                break;
            case "PRODUCTS":
                await Product.deleteMany({ userMobile: userMobile });
                break;
            case "CUSTOMERS":
                await Customer.deleteMany({ userMobile: userMobile });
                break;
            case "SUPPLIERS":
                await Supplier.deleteMany({ userMobile: userMobile });
                break;
            case "STOCK":
                await Purchase.deleteMany({ userMobile: userMobile });
                // விருப்பப்பட்டால் ப்ராடக்ட் குவாண்டிட்டியையும் 0 ஆக்கலாம்
                await Product.updateMany({ userMobile: userMobile }, { $set: { quantity: 0 } });
                break;
            case "LEDGER":
                await Payment.deleteMany({ userMobile: userMobile });
                await Receipt.deleteMany({ userMobile: userMobile });
                break;
            case "BALANCES": // விடுபட்ட BALANCES ஆப்ஷன்
                await Customer.updateMany({ userMobile: userMobile }, { $set: { balance: 0 } });
                await Supplier.updateMany({ userMobile: userMobile }, { $set: { balance: 0 } });
                break;
            default:
                return res.status(400).json({ message: "Invalid reset type" });
        }

        res.status(200).json({ success: true, message: `${type} reset successful` });
    } catch (error) {
        console.error("Reset Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;