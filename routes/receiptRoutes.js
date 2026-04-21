const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice'); // 1. இதை கண்டிப்பாக சேர்க்க வேண்டும்

// 1. எல்லா ரிசிப்ட்களையும் எடுக்க
router.get('/', async (req, res) => {
    try {
        const receipts = await Receipt.find().populate('customerId', 'name mobile');
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. புது ரிசிப்ட் போட
router.post('/add', async (req, res) => {
    try {
        const { customerId, amount, billNo, userMobile, paymentMode } = req.body;

        // A. புதிய ரிசிப்டை உருவாக்கி சேமிக்க வேண்டும்
        const newReceipt = new Receipt({
            customerId,
            amount,
            billNo,
            userMobile,
            paymentMode,
            date: new Date() // தேதியையும் சேர்த்துக்கொள்ளுங்கள்
        });
        
        await newReceipt.save(); // 2. இதை நீங்கள் கோடில் விடவில்லை, இதுதான் டேட்டாவை சேவ் செய்யும்

        // B. கஸ்டமரோட மொத்த அவுட்ஸ்டாண்டிங் பேலன்ஸை குறைக்கிறோம்
        await Customer.findByIdAndUpdate(customerId, { 
            $inc: { currentBalance: -amount }
        });

        // C. குறிப்பிட்ட இன்வாய்ஸில் இருக்கும் கடன் தொகையை (creditAmount) குறைக்கிறோம்
        // billNo 'Bulk' ஆக இருந்தால் இது ரன் ஆகாது
        if (billNo && billNo !== 'Bulk') {
            await Invoice.findOneAndUpdate(
                { billNo: billNo, userMobile: userMobile }, // customerId-க்கு பதிலாக userMobile பயன்படுத்துவது பாதுகாப்பானது
                { $inc: { creditAmount: -amount } }
            );
        }

        res.status(201).json({ 
            message: "Receipt Saved & Balance Updated!", 
            data: newReceipt 
        });
    } catch (err) {
        console.error("Receipt Error:", err); // எரர் என்னவென்று டெர்மினலில் பார்க்க
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;