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
        const { supplierId, amount } = req.body;

        // 1. பேமெண்ட்டை சேவ் பண்றோம்
        const newPayment = new Payment(req.body);
        await newPayment.save();

        // 2. சப்ளையர் பேலன்ஸை குறைக்கிறோம் ($inc உபயோகித்து மைனஸ் பண்றோம்)
        await Supplier.findByIdAndUpdate(supplierId, { 
            $inc: { balance: -amount } 
        });

        res.status(201).json({ 
            message: "Payment Recorded & Supplier Balance Updated!", 
            data: newPayment 
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;