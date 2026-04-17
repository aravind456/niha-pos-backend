const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase'); // Model import
const Product = require('../models/Product');   // Stock update panna mukkiam

// SAVE PURCHASE ENTRY
router.post('/bulk-add', async (req, res) => {
    try {
        const { userMobile, items } = req.body;

        // 1. Database-la Purchase save panrom
        const newPurchase = new Purchase(req.body);
        await newPurchase.save();

        // 2. Stock Update Logic
        for (let item of items) {
            await Product.findOneAndUpdate(
                { _id: item.id, userMobile: userMobile },
                { $inc: { stock: item.qty } } // Stock increase aagum
            );
        }

        res.status(200).json({ success: true, message: "Purchase saved & Stock updated!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;