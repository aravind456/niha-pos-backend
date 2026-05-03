const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Supplier = require('../models/Supplier'); // Supplier model-ஐயும் இம்போர்ட் பண்ணிக்கோங்க

// 1. எல்லா பேமெண்ட்களையும் பார்க்க
router.get('/', async (req, res) => {
    try {
        const payments = await Payment.find().populate('supplierId', 'name');
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. புது பேமெண்ட் போட (With Auto Balance Reduction)
router.post('/add', async (req, res) => {
    try {
        const { supplierId, amount, userMobile } = req.body; // userMobile-um include pannunga

        const newPayment = new Payment({
            ...req.body,
            date: req.body.date || new Date()
        });
        await newPayment.save();

        // Schema-la currentBalance-nu irundha adhaye ingayum use pannunga
        await Supplier.findByIdAndUpdate(supplierId, { 
            $inc: { currentBalance: -Math.abs(amount) } 
        });

        res.status(201).json({ 
            success: true,
            message: "Payment Recorded & Supplier Balance Updated!", 
            data: newPayment 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;