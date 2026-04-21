const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Customer = require('../models/Customer'); // கஸ்டமர் மாடலை இம்போர்ட் செய்யவும்

// 1. எல்லா ரிசிப்ட்களையும் எடுக்க (List View)
router.get('/', async (req, res) => {
    try {
        const receipts = await Receipt.find().populate('customerId', 'name mobile'); // மொபைல் எண்ணையும் சேர்த்து எடுக்கலாம்
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. புது ரிசிப்ட் போட (Entry)
router.post('/add', async (req, res) => {
    try {
        const { customerId, amount, billNo, userMobile, paymentMode } = req.body;

        const newReceipt = new Receipt({
         customerId,
         amount,
         billNo, // இப்போ பில் நம்பரும் சேவ் ஆகும்
         userMobile,
         paymentMode
        });

        // B. கஸ்டமரோட வர வேண்டிய தொகையை (Balance) குறைக்கிறோம்
        // $inc: { balance: -amount } என்றால் இருக்கும் தொகையில் இருந்து இது மைனஸ் ஆகும்
        await Customer.findByIdAndUpdate(customerId, { 
           $inc: { currentBalance: -amount }
        });

        res.status(201).json({ 
            message: "Receipt Saved & Customer Balance Updated!", 
            data: newReceipt 
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;