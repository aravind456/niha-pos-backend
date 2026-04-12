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

        // Bill Saving section-la customerName-ku default kudunga
const newInvoice = new Invoice({
    ...req.body,
    customerName: req.body.customerName || "Cash", // Null-ah vandha 'Cash' nu save aagum
    customerMobile: req.body.customerMobile || "",
    billNo: nextBillNo.toString(),
    cartItems: req.body.items 
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

// --- Intha portion-ah unga invoiceRoutes.js-la save-bill-ku keela add pannunga ---

// routes/invoiceRoutes.js

router.get('/today-sales/:mobile', async (req, res) => {
    try {
        const mobile = req.params.mobile;

        // 1. Innaiku date-ah "YYYY-MM-DD" format-ku mathurom (Example: "2026-04-12")
        // IST (India Time) kaga current date yedukkarom
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        console.log("Searching for date prefix:", todayStr);

        // 2. Database Query: billDate string-la innaiku date start aagutha nu Regex use panrom
        // Inga Invoice model dhaan use pannanum (neenga anupuna customer route vera file)
        const Invoice = require('../models/Invoice'); 
        
        const invoices = await Invoice.find({
            userMobile: mobile,
            billDate: { $regex: `^${todayStr}` } 
        });

        let total = 0, cash = 0, upi = 0, credit = 0;

        invoices.forEach(inv => {
            // totalAmount field name check pannikonga
            const amount = Number(inv.totalAmount) || 0;
            total += amount;

            // Spelling and Case sensitive check (C capital)
            if (inv.paymentMode === 'Cash') {
                cash += amount;
            } else if (inv.paymentMode === 'UPI') {
                upi += amount;
            } else if (inv.paymentMode === 'Credit') {
                credit += amount;
            }
        });

        res.json({
            totalSales: total,
            cashSales: cash,
            upiSales: upi,
            creditSales: credit
        });

    } catch (e) {
        console.error("Dashboard Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;