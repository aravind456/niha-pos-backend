const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer'); // Model import mukkiam

router.post('/save-bill', async (req, res) => {
    if (!req.body.userMobile) {
        return res.status(400).json({ success: false, message: "userMobile is required!" });
    }

    try {
        // 1. Bill Number Logic
        const lastInvoice = await Invoice.findOne({ userMobile: req.body.userMobile }).sort({ billNo: -1 });
        let nextBillNo = 1;
        if (lastInvoice && lastInvoice.billNo) {
            nextBillNo = parseInt(lastInvoice.billNo) + 1;
        }

        // 2. Bill Saving
        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo.toString(),
            cartItems: req.body.items // Flutter-la irundhu vara 'items'-ah 'cartItems'-ku mathurom
        });

        const savedInvoice = await newInvoice.save();

        // 3. Customer Ledger Update (If Credit)
        if (req.body.creditAmount > 0 && req.body.customerId) {
            try {
                await Customer.findByIdAndUpdate(
                    req.body.customerId, 
                    { $inc: { totalDue: req.body.creditAmount } }
                );
            } catch (custErr) {
                console.log("Customer update failed, but bill saved.");
            }
        }

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved Successfully!",
            billNo: savedInvoice.billNo
        });

    } catch (err) {
        console.error("Save Bill Error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;