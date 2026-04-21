const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt'); // Model-ஐ இம்போர்ட் செய்யவும்

// 1. எல்லா ரிசிப்ட்களையும் எடுக்க (List View)
router.get('/', async (req, res) => {
    try {
        const receipts = await Receipt.find().populate('customerId', 'name');
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. புது ரிசிப்ட் போட (Entry)
router.post('/add', async (req, res) => {
    try {
        const newReceipt = new Receipt(req.body);
        await newReceipt.save();
        res.status(201).json({ message: "Receipt Saved!", data: newReceipt });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;