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
// receipts.js route-la ithai update pannunga
router.post('/add', async (req, res) => {
    try {
        const { customerId, amount, billNo, userMobile, paymentMode } = req.body;

        // 1. Receipt Number Generation fix
        //const lastReceipt = await Receipt.findOne({ userMobile }).sort({ createdAt: -1 });
        //let nextReceiptNo = 1;
        //if (lastReceipt && lastReceipt.receiptNo) {
        //    // REC-123 nu iruntha athula irunthu number mattum edukka logic
        //    const lastNo = lastReceipt.receiptNo.toString().replace('REC-', '');
        //    nextReceiptNo = parseInt(lastNo) + 1;
        //}
        //const generatedReceiptNo = `REC-${nextReceiptNo}`;
        const generatedReceiptNo = "REC-" + Date.now();

        // 2. New Receipt Object
        const newReceipt = new Receipt({
            receiptNo: generatedReceiptNo,
            customerId,
            amount: Number(amount),
            billNo,
            userMobile,
            paymentMode,
            date: new Date()
        });
        
        await newReceipt.save(); // DB-la save aagum

        // 3. Customer Balance update
        // Opening balance-aiyum serthu kuraikka currentBalance-la minus panrom
        await Customer.findByIdAndUpdate(customerId, { 
            $inc: { currentBalance: -amount }
        });

        // 4. Specific Invoice Update
        if (billNo && billNo !== 'Bulk' && billNo !== 'Opening Balance') {
            await Invoice.findOneAndUpdate(
                { billNo: billNo, userMobile: userMobile },
                { $inc: { currentBalance: -amount } }
            );
        }

        res.status(201).json({ message: "Success", data: newReceipt });
    } catch (err) {
        console.error("Error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;