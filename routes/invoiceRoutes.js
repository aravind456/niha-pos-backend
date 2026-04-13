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

        // 1. இன்றைய தேதியின் ஆரம்பம் மற்றும் முடிவைக் கணக்கிடுதல் (Date Range)
        // இதுதான் MongoDB-யில் தேதிகளைத் தேடும் சரியான முறை
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // இன்றைய நாள் ஆரம்பம் 12:00 AM

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // இன்றைய நாள் முடிவு 11:59 PM

        console.log("Searching bills from:", startOfDay, "to", endOfDay);

        // 2. $regex-க்கு பதிலாக $gte (Greater than) மற்றும் $lte (Less than) பயன்படுத்துகிறோம்
        const invoices = await Invoice.find({
            userMobile: mobile,
            billDate: { 
                $gte: startOfDay, 
                $lte: endOfDay 
            }
        });

        let total = 0, cash = 0, upi = 0, credit = 0;

        invoices.forEach(inv => {
            const amount = Number(inv.totalAmount) || 0;
            total += amount;

            // 3. Payment Mode-ஐ பொறுத்து பிரித்துக் கணக்கிடுதல்
            if (inv.paymentMode === 'Cash') {
                cash += amount;
            } else if (inv.paymentMode === 'UPI') {
                upi += amount;
            } else if (inv.paymentMode === 'Credit') {
                credit += amount;
            } else if (inv.paymentMode === 'Multi') {
                // Multi ஆக இருந்தால் தனித்தனியாகச் சேர்க்க வேண்டும்
                cash += Number(inv.cashAmount) || 0;
                upi += Number(inv.onlineAmount) || 0;
                credit += Number(inv.creditAmount) || 0;
            }
        });

        // 4. Response-ஐ ஆப்பிற்கு அனுப்புதல்
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

// Sales Report API
router.get('/report/sales', async (req, res) => {
    try {
        const { userMobile, fromDate, toDate } = req.query;
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        const sales = await Invoice.find({
            userMobile: userMobile,
            billDate: { $gte: start, $lte: end }
        }).sort({ billDate: -1 });

        res.json(sales);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;