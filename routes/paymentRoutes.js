const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');

// 1. எல்லா பேமெண்ட்களையும் பார்க்க
router.get('/', async (req, res) => {
    try {
        const payments = await Payment.find().populate('supplierId', 'name');
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. புது பேமெண்ட் போட
router.post('/add', async (req, res) => {
    try {
        const newPayment = new Payment(req.body);
        await newPayment.save();
        res.status(201).json({ message: "Payment Recorded!", data: newPayment });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;