const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// 1. Schema Definition
const invoiceSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    billNo: { type: String, required: true },
    customerName: String,
    customerMobile: String,
    salesmanName: String,
    cartItems: Array,
    totalAmount: Number,
    paymentMode: String,
    billDate: { type: Date, default: Date.now },
    // Multi payment-க்காக இவை தேவை
    cashAmount: Number,
    onlineAmount: Number,
    creditAmount: Number
});

// 2. Model Creation
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// Customer Model Import (இது Ledger அப்டேட் செய்ய தேவை)
// ஒருவேளை உங்கள் models folder-ல் Customer.js இருந்தால் இதை பயன்படுத்தவும்
let Customer;
try {
    Customer = mongoose.model('Customer');
} catch (e) {
    // ஒருவேளை இன்னும் model கிரியேட் ஆகவில்லை என்றால் import செய்யவும்
    Customer = require('../models/Customer');
}

// ==========================================
// 1. SAVE BILL API
// ==========================================
router.post('/save-bill', async (req, res) => {
    try {
        if (!req.body.userMobile) {
            return res.status(400).json({ success: false, message: "userMobile is required!" });
        }

        const lastInvoice = await Invoice.findOne({ userMobile: req.body.userMobile }).sort({ _id: -1 });
        let nextBillNo = "1"; 
        
        if (lastInvoice && lastInvoice.billNo) {
            nextBillNo = (parseInt(lastInvoice.billNo) + 1).toString();
        }

        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo,
            customerName: req.body.customerName || "Cash",
            customerMobile: req.body.customerMobile || "",
            salesmanName: req.body.salesmanName || "Self",
            cartItems: req.body.items, 
            billDate: req.body.createdAt || Date.now()
        });

        const savedInvoice = await newInvoice.save();

        // Customer Ledger Update (If Credit)
        if (req.body.creditAmount > 0 && req.body.customerId) {
            try {
                await Customer.findByIdAndUpdate(
    req.body.customerId, 
    { $inc: { openingBalance: req.body.creditAmount } } // totalDue-க்கு பதில் openingBalance
);
            } catch (err) { console.log("Ledger update failed"); }
        }

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved!", 
            billNo: savedInvoice.billNo 
        });

    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ==========================================
// 2. TODAY SALES API
// ==========================================
router.get('/today-sales/:mobile', async (req, res) => {
    try {
        const mobile = req.params.mobile;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); 
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); 

        const invoices = await Invoice.find({
            userMobile: mobile,
            billDate: { $gte: startOfDay, $lte: endOfDay }
        });

        let total = 0, cash = 0, upi = 0, credit = 0;
        invoices.forEach(inv => {
            const amount = Number(inv.totalAmount) || 0;
            total += amount;
            if (inv.paymentMode === 'Cash') cash += amount;
            else if (inv.paymentMode === 'UPI') upi += amount;
            else if (inv.paymentMode === 'Credit') credit += amount;
            else if (inv.paymentMode === 'Multi') {
                cash += Number(inv.cashAmount) || 0;
                upi += Number(inv.onlineAmount) || 0;
                credit += Number(inv.creditAmount) || 0;
            }
        });

        res.json({ totalSales: total, cashSales: cash, upiSales: upi, creditSales: credit });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 3. SALES REPORT API
// ==========================================
router.get('/report/sales', async (req, res) => {
    try {
        const { userMobile, fromDate, toDate } = req.query;
        const start = new Date(fromDate || new Date());
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate || new Date());
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

// இது கண்டிப்பாக இருக்க வேண்டும்
router.delete('/:id', async (req, res) => {
    try {
        const billId = req.params.id;
        // பில்லை முழுமையாக டெலீட் செய்ய:
        await Invoice.findByIdAndDelete(billId); 
        
        res.json({ success: true, message: "Bill Deleted Successfully" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;